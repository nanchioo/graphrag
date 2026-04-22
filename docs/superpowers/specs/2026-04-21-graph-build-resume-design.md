# Graph Build Resume And File Progress Design

Date: 2026-04-21
Status: Approved in conversation, pending written-spec review
Note: This spec is intentionally not committed because the user requested no git commits.

## Goal

Upgrade graph-project builds from a project-level fire-and-forget task into a
file-aware build flow that can:

- continue after a failed build without reprocessing already completed files
- recover after process interruption or service restart
- show which source file is currently building
- show which files have succeeded, failed, are pending, or were skipped

The recovery granularity for this iteration is file-level, not workflow-step-level.
If interruption happens in the middle of a single file, that file restarts from the
beginning on the next resume.

## Chosen Approach

Introduce a per-project persisted `build_manifest.json` and switch the wrapper
service from one project-level indexing run to a project-level scheduler with
file-level execution.

Why this approach:

- it matches the user's requested resume semantics while staying within the
  capabilities of the current codebase
- it keeps already completed files reusable after failure or interruption
- it avoids step-level checkpointing inside GraphRAG workflows, which would be
  much more invasive and fragile
- it gives the UI a durable source of truth for file-level status and progress

The file-aware build flow will work like this:

1. load and normalize source files in the project input directory
2. create or refresh a per-project build manifest
3. select files to run based on build action (`start` or `resume`)
4. process files one at a time, updating manifest state before and after each file
5. use standard indexing for the first file in a fresh run
6. use incremental/update indexing for subsequent files in the same build session
7. on failure, mark the current file and project as failed, but preserve successful
   prior files
8. on resume, continue only pending/failed files while preserving reusable successful
   files

## Scope Clarification

This design intentionally defines "resume build" as file-level recovery:

- supported:
  - continue after a failed build using previous successful file results
  - continue after process interruption or service restart
  - skip files whose content is unchanged and already completed
- not supported:
  - resuming in the middle of a single file's internal GraphRAG workflow
  - reconstructing partial state for a file that failed halfway through one of its
    sub-steps

This means the system can reuse completed files, but a partially processed file is
re-run from the beginning.

## Build State Model

Each project gets a persisted manifest file:

- `logs/build_manifest.json`

The manifest stores two layers of state.

### Project-Level State

- `build_id: str`
- `graph_id: str`
- `status: pending | building | failed | completed`
- `action: start | resume`
- `current_file: str | None`
- `started_at: str | None`
- `updated_at: str | None`
- `completed_file_count: int`
- `failed_file_count: int`
- `pending_file_count: int`
- `last_error: str | None`
- `resumable: bool`

### File-Level State

For each source file:

- `relative_path: str`
- `name: str`
- `extension: str`
- `size_bytes: int`
- `modified_at: str`
- `content_hash: str`
- `status: pending | building | succeeded | failed | skipped`
- `attempt_count: int`
- `last_error: str | None`
- `started_at: str | None`
- `finished_at: str | None`
- `document_count: int`
- `text_unit_count: int`

### File Status Semantics

- `pending`: waiting to be built in the current or next resumable run
- `building`: currently being processed
- `succeeded`: built successfully and its output is part of the current artifact set
- `failed`: last attempt for this file failed
- `skipped`: intentionally not re-run in the current build action because the file is
  unchanged and its previous successful output is still valid

### File Identity Rules

Each file entry is matched by `relative_path`.

Files are considered changed when any of these differ from the last successful
build manifest:

- file size
- file modified time
- file content hash

If a file changes, it is reset to `pending` even if it previously succeeded.

## API Design

### Build Request

Extend the existing route:

- `POST /api/graph/{graph_id}/build`

Updated request payload:

```json
{
  "action": "resume",
  "method": "standard",
  "force_rebuild": false
}
```

Updated request schema:

- `action: Literal["start", "resume"] = "start"`
- `method: GraphBuildMethod = "standard"`
- `force_rebuild: bool = false`

Validation rules:

- `resume + force_rebuild=true` is invalid and returns `422`
- `resume` is valid only when there is a resumable manifest or prior failed state;
  otherwise return `409`

### Build Start Response

Keep the same route response shape but add resumability metadata:

- `graph_id`
- `status`
- `last_build_at`
- `last_error`
- `resumable: bool`

### Status Response

Extend `GET /api/graph/{graph_id}/status` with file-aware project status:

- `resumable: bool`
- `current_file: str | None`
- `completed_file_count: int`
- `failed_file_count: int`
- `pending_file_count: int`

Existing fields such as `progress_percent`, `progress_stage`, `progress_message`,
`document_count`, and `text_unit_count` remain.

### Source File List Response

Extend `GET /api/graph/{graph_id}/files` so each `SourceFileItem` can include:

- `build_status: pending | building | succeeded | failed | skipped | None`
- `is_current: bool`
- `attempt_count: int`
- `last_build_error: str | None`
- `last_built_at: str | None`
- `document_count: int`
- `text_unit_count: int`

This keeps file-level build display on the existing "source files" panel instead of
adding a second status endpoint.

## Backend Design

### Wrapper Service Responsibilities

`GraphRagWrapperService` becomes the owner of:

- manifest creation and refresh
- file selection for `start` vs `resume`
- per-file lifecycle transitions
- interruption recovery
- callback-driven progress updates

New responsibilities:

- build the manifest from current input files
- restore manifest from disk when resuming
- identify unchanged files that can remain reusable without re-running
- identify changed/new files that must go back to `pending`
- select the next file to run
- run files sequentially and persist manifest updates after each transition

### Standard vs Incremental Execution

The execution strategy should be:

- fresh project build, first file:
  - standard indexing run
- same build session, later files:
  - incremental/update indexing run
- resumed build after failure/interruption:
  - continue with incremental/update indexing for remaining files

This design assumes GraphRAG's update-mode support is leveraged instead of building
a separate merge layer from scratch.

### Manifest Persistence

Persist manifest updates:

- before a file starts
- after callback progress updates that materially change visible state
- after a file succeeds
- after a file fails
- when the overall task transitions to completed or failed

This persistence frequency is what enables restart-safe recovery.

### Interruption Recovery

The current stale-build reconciliation only converts orphaned `building` state into
failed state with a generic interrupted message.

Replace that behavior with:

- if project status is `building` and no in-memory task exists:
  - load `build_manifest.json`
  - if manifest indicates unfinished work:
    - mark project as `failed`
    - set `last_error` to an interruption-specific message
    - set `resumable = true`
    - convert any file stuck in `building` to `failed` or `pending` based on safety
  - if no valid manifest exists:
    - fall back to normal failed state

### File Output Attribution

To show which file produced what, successful file completion should capture:

- how many documents were added for that file
- how many text units were added for that file

For this iteration, storing counts is sufficient. We do not need a full per-file
artifact tree in the UI.

## Progress Reporting Design

GraphRAG already exposes workflow callbacks and progress callbacks.

Use these callbacks to populate project-level progress fields:

- `progress_stage`
- `progress_message`
- `current_file`
- file `status=building`

Project-level progress percent should blend:

- file completion progress
- current workflow stage inside the active file

A simple version is acceptable:

- 0-10%: manifest preparation
- 10-90%: file execution progress
- 90-100%: finalize and persist summary

Accuracy matters less than clarity. The UI should always clearly show which file is
active and how many remain.

## Frontend Design

### Build Status Card

Extend `BuildStatusCard` to show:

- current build status
- current workflow stage
- current source file
- completed/failed/pending file counts
- resumable state
- project-level error summary

Action buttons:

- `Start Build`
- `Resume Build`
- `Full Rebuild`
- `Refresh`

Button rules:

- only show `Resume Build` when `resumable=true`
- `Full Rebuild` requires confirmation
- while building, disable other build-trigger buttons

### Source File List

Extend the existing source-file list to display per-file build metadata:

- file name
- file status tag
- current-file highlight
- retry count
- last processed time
- file-level error summary
- per-file output counts

The list should make it obvious:

- which files are already done
- which file is currently building
- which files failed
- which files will be retried on resume

### Failure Recovery UX

For a recoverable failure, the UI should present:

- project state: failed but resumable
- a visible `Resume Build` button
- preserved success states for previously completed files
- highlighted failed file entry with file-specific error message

### Non-Goals For UI

This iteration does not add:

- a separate build-history page
- per-file raw log viewers
- file-by-file manual retry buttons
- timeline/gantt visualizations

## Error Handling

Handle these cases explicitly:

- no source files: same behavior as today, no build starts
- resume requested with no resumable manifest: `409`
- force rebuild requested:
  - delete manifest
  - clear old artifacts
  - run as fresh build
- changed files after prior success:
  - reset changed files to `pending`
- deleted source files:
  - remove their manifest entries during refresh
- corrupt manifest:
  - surface a recoverable error and offer full rebuild

## Testing Strategy

### Backend Unit Tests

Add coverage for:

- build manifest initialization from source files
- changed files reset to `pending`
- resume selects only pending/failed files
- interrupted build becomes resumable after stale-state reconciliation
- file-level status is reflected in `/status` and `/files`
- invalid `resume + force_rebuild=true` returns `422`
- `resume` without resumable state returns `409`

### Route Tests

Add coverage for:

- `POST /build` with `action=start`
- `POST /build` with `action=resume`
- `/status` includes resumable and file counts
- `/files` includes file-level build status fields

### Frontend Tests

Add coverage for:

- build-status card shows resume action when resumable
- source-file list renders file status tags and current-file state
- build requests include the new `action` field
- failure state copy distinguishes resumable vs non-resumable failure

## Risks

- incremental indexing behavior may not align perfectly with one-file-at-a-time
  orchestration and may require targeted adaptation
- per-file document/text-unit attribution may need careful counting to avoid double
  counting on retries
- manifest corruption or manual file tampering must fail safely and never silently
  mark incomplete work as done
- if the underlying provider fails consistently, retries improve usability but do
  not eliminate provider-side instability

## Non-Goals

This design does not add:

- workflow-step-level checkpointing inside a single file
- distributed or parallel multi-file builds
- resumable builds across multiple simultaneous operators
- per-file log streaming in the first iteration

## Acceptance Criteria

After implementation:

- failed builds can be resumed without reprocessing already successful files
- interrupted builds can be resumed after process restart
- the UI shows which file is currently building
- the UI shows which files succeeded, failed, or are still pending
- users can choose between continue/resume and full rebuild
- single-file partial progress is not resumed mid-file, but the file restarts safely
