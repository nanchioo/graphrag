# Graph Project Delete Design

Date: 2026-04-19
Status: Approved in conversation, pending written-spec review

## Goal

Add a graph-project delete capability to the admin console so a user can:

- delete a graph project from the UI
- remove the graph registry entry
- delete the entire project workspace on disk
- delete even when a build is currently running

The delete behavior is intentionally destructive and should remove all project data,
including source files, generated artifacts, cache, logs, settings, and environment
files under the project root.

## Chosen Approach

Use a synchronous delete flow exposed as `DELETE /api/graph/{graph_id}`.

Why this approach:

- it matches the requested "彻底删除" behavior most directly
- it avoids introducing a new long-lived `deleting` state
- it keeps UI behavior simple and deterministic
- it reuses the existing build/task ownership already centralized in
  `GraphRagWrapperService`

The delete request will:

1. resolve the graph project record
2. cancel any active in-process build task for that graph
3. acquire the existing GraphRAG cwd lock
4. validate the project path is safe to delete
5. recursively delete the project directory
6. remove the graph record from the registry
7. return a delete payload to the UI

## API Design

Add a new route:

- `DELETE /api/graph/{graph_id}`

Response payload:

```json
{
  "graph_id": "demo-acfe47cd",
  "status": "deleted",
  "deleted_root_dir": "D:/.../data/projects/demo-acfe47cd",
  "cancelled_build": true
}
```

New schema:

- `DeleteGraphPayload`
  - `graph_id: str`
  - `status: str`
  - `deleted_root_dir: str`
  - `cancelled_build: bool`

HTTP behavior:

- `200` on success
- `404` if the graph does not exist
- `500`/raised error if the directory cannot be deleted

Important consistency rule:

- if filesystem deletion fails, do not remove the registry entry

## Backend Design

### Graph Registry

Add `delete_graph(graph_id)` to `GraphRegistryService`.

Responsibilities:

- remove the stored graph record from `graph_registry.json`
- return the deleted graph record for response composition
- raise `404` if the graph does not exist

This method should only mutate registry data. Filesystem deletion stays outside
the registry service.

### Wrapper Service

Add `delete_graph(...)` to `GraphRagWrapperService`.

Responsibilities:

- fetch the graph and resolve `root_dir`
- inspect `_tasks` for an active build task
- if a task exists, cancel it and await its completion
- acquire `_cwd_lock` before deleting the directory
- validate the delete target stays within the configured projects root
- recursively delete the graph root directory
- remove the graph registry record only after filesystem deletion succeeds
- return `DeleteGraphPayload`

Expected behavior by state:

- `initialized`: delete immediately
- `awaiting_build`/`artifacts_deleted`: delete immediately
- `ready`: delete immediately
- `failed`: delete immediately
- `building`: cancel active task first, then delete

### Task Cancellation

The current build flow stores in-process tasks in `GraphRagWrapperService._tasks`.
Deletion should reuse that source of truth.

Rules:

- if there is no active task, `cancelled_build = false`
- if there is an active task, call `task.cancel()`
- await the task and swallow `CancelledError`
- after cancellation, continue with deletion

This keeps the behavior aligned with the user's requirement that building projects
can still be deleted.

## Filesystem Safety

Deletion must be guarded so the service cannot recursively remove unintended paths.

Safety checks:

- resolve the graph root to an absolute path
- resolve the configured `projects_root` to an absolute path
- require `root_dir` to be inside `projects_root`
- reject deletion if `root_dir == projects_root`
- reject deletion if the target escapes the project workspace

Edge cases:

- if the project directory is already missing, still remove the registry entry
- if part of the directory is locked or deletion fails, surface the error and keep
  the registry entry

## Frontend Design

### API Client

Add `deleteGraph(graphId: string)` to `web/src/api/client.ts`.

Add `DeleteGraphPayload` to `web/src/types/index.ts`.

### Graph Management Page

Add a dangerous "删除项目" action to the graph detail area on `GraphManagePage`.

Behavior:

- place it alongside existing build/cleanup controls
- use a confirm modal before calling the API
- modal copy should warn that all project files and artifacts will be removed
- if the current graph status is `building`, modal copy should also state that the
  in-progress build will be terminated

UI flow after success:

- show a success message
- reload the graph list
- select another graph if one remains
- if none remain, clear the right-side detail pane to empty state

UI flow after failure:

- keep the current selection
- show an error message
- do not optimistically remove the graph from local state

### Loading Behavior

Reuse the existing page-level `actionLoading` state so the delete action is disabled
while the request is running and does not race with build/clear actions.

## Testing Strategy

### Backend Unit Tests

Add coverage for:

- `GraphRegistryService.delete_graph()` removes a stored graph
- deleting a missing graph returns `404`
- `GraphRagWrapperService.delete_graph()` deletes the graph directory and registry entry
- deleting while a build task is active cancels the task first
- deleting a graph with an already-missing directory still removes the registry entry
- unsafe delete targets outside `projects_root` are rejected

### API Route Tests

Add coverage for:

- `DELETE /api/graph/{graph_id}` returns the expected payload
- after deletion, `GET /api/graph/{graph_id}` returns `404`

### Frontend Tests

Follow the existing lightweight source-assertion style in `tests/unit/web/test_frontend_scaffold.py`.

Add assertions that:

- `client.ts` contains a delete-graph request helper
- `GraphManagePage.tsx` includes delete action wiring
- `GraphManagePage.tsx` includes a confirmation modal path
- the page contains a dangerous "删除项目" entry point

## Non-Goals

This design does not add:

- a soft-delete or trash state
- a recover/undo flow
- a background delete job
- a new persistent `deleting` status

## Implementation Notes

Keep the implementation minimal and aligned with current patterns:

- route delegates to service
- service owns task cancellation and filesystem mutation
- registry service owns JSON record mutation
- UI waits for confirmed success before removing anything from view

## Risks

- deleting a large project directory may take noticeable time
- filesystem locks on Windows may cause deletion failures that should be surfaced
- cancellation only applies to in-process tracked tasks, which matches the current
  architecture but should remain explicit in code comments and tests

## Acceptance Criteria

A graph project can be deleted from the console, and after success:

- the graph no longer appears in the graph list
- `graph_registry.json` no longer contains the project
- the project root directory is removed from disk
- deleting a currently building project succeeds by cancelling the active build first
