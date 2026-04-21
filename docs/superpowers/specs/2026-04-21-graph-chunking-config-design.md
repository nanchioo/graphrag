# Graph Project Creation Chunking Config Design

Date: 2026-04-21
Status: Approved in conversation, pending written-spec review

## Goal

Allow users to configure document chunking when creating a new graph project from
the admin console, so each new project can start with the chunking settings that
fit its source material.

The feature should:

- expose chunking inputs in the "new graph" flow
- persist the chosen values into that graph project's `settings.yaml`
- preserve current behavior when the user does not change any chunking values
- avoid introducing a second persistent source of truth outside `settings.yaml`

## Chosen Approach

Extend the existing `POST /api/graph` create request with a `chunking` object and
apply that configuration immediately after initializing the GraphRAG workspace.

Why this approach:

- it keeps chunking configuration attached to the project workspace where GraphRAG
  already expects it
- it avoids duplicating chunking state in `graph_registry.json`
- it keeps build-time behavior simple because `load_config(root_dir=...)` continues
  to read a single authoritative `settings.yaml`
- it limits the scope to the user-requested "configure on create" experience

The create flow will become:

1. receive `name`, `description`, `model_profile_id`, and optional `chunking`
2. initialize a standard GraphRAG workspace
3. rewrite the workspace `settings.yaml` chunking section
4. register the graph project in the graph registry
5. return the normal graph detail payload

If chunking sync fails, graph creation should fail before the registry entry is
written.

## API Design

Continue using the existing route:

- `POST /api/graph`

Request payload:

```json
{
  "name": "Customer Service Graph",
  "description": "客服知识图谱",
  "model_profile_id": "profile-123",
  "chunking": {
    "type": "tokens",
    "size": 1200,
    "overlap": 100,
    "encoding_model": "o200k_base"
  }
}
```

New request schema:

- `GraphChunkingCreateRequest`
  - `type: Literal["tokens"] = "tokens"`
  - `size: int = 1200`
  - `overlap: int = 100`
  - `encoding_model: str = "o200k_base"`
- `GraphCreateRequest`
  - existing fields remain unchanged
  - add `chunking: GraphChunkingCreateRequest | None = None`

Validation rules:

- `size` must be greater than `0`
- `overlap` must be greater than or equal to `0`
- `overlap` must be strictly less than `size`
- `encoding_model` must be a non-empty string after trimming
- `type` is limited to `tokens` in this iteration

Default behavior:

- if `chunking` is omitted, the backend will apply the current defaults
- if `chunking` is provided, unspecified fields still fall back to the defaults above

Response payload remains unchanged.

HTTP behavior:

- `201` on success
- `422` for invalid chunking input
- `500`/raised error if workspace initialization or settings rewrite fails

## Backend Design

### Schema Layer

Update `api/schemas/graph.py` to model the new chunking request object and validate
the invariants centrally with Pydantic.

This keeps route logic minimal and ensures both API tests and runtime behavior rely
on the same validation rules.

### Workspace Initialization

Extend `ProjectWorkspaceService.initialize_workspace(...)` to accept an optional
chunking config argument.

Responsibilities:

- call `initialize_project_at(...)` exactly as today
- localize prompts exactly as today
- open `<root_dir>/settings.yaml`
- update only the `chunking` block
- preserve all unrelated configuration sections
- write the YAML back using existing formatting conventions

Expected `chunking` block written to the workspace:

```yaml
chunking:
  type: tokens
  size: 1200
  overlap: 100
  encoding_model: o200k_base
```

Important consistency rule:

- `ProjectWorkspaceService` owns writing create-time chunking settings because it
  already owns workspace bootstrapping

This avoids scattering create-time settings mutations across the router and wrapper
services.

### Router Flow

Update `api/routers/graph.py` create flow so it:

- reads `payload.chunking`
- passes it into `project_workspace_service.initialize_workspace(...)`
- continues creating the registry record only after workspace initialization succeeds

No graph-registry schema changes are required.

### Runtime Behavior

No build-path changes are needed.

The current build flow already calls `load_config(root_dir=root_dir)` before
`build_index(...)`, so once `settings.yaml` contains the desired `chunking` block,
the build uses it automatically.

## Frontend Design

### Types and API Client

Update `web/src/types/index.ts`:

- add `GraphChunkingCreateRequest`
- extend `GraphCreateRequest` with `chunking?: GraphChunkingCreateRequest`

`web/src/api/client.ts` continues sending the full create payload with no new route
helper required.

### Graph Creation Modal

Extend the existing create-graph modal on
`web/src/pages/GraphManagePage.tsx`.

Add a new "切片配置" section with these fields:

- `type`
  - select input
  - only option in this iteration: `tokens`
- `size`
  - numeric input
  - default `1200`
- `overlap`
  - numeric input
  - default `100`
- `encoding_model`
  - text input
  - default `o200k_base`

Interaction rules:

- the form should initialize chunking defaults when the modal opens
- users can create a graph without touching these values
- validation should prevent submitting `overlap >= size`
- validation messaging should explain that overlap must be smaller than chunk size

UX guidance:

- keep the chunking controls in the existing modal rather than introducing a second
  step or advanced drawer
- present the defaults directly so the feature is discoverable
- keep labels concise and consistent with the rest of the page

## Testing Strategy

### Backend Unit Tests

Update `tests/unit/api/test_project_workspace_service.py` to cover:

- default workspace initialization still succeeds
- custom chunking values are written into `settings.yaml`
- omitted chunking falls back to the current defaults

Update `tests/unit/api/test_graph_routes.py` to cover:

- `POST /api/graph` accepts a custom `chunking` payload
- created workspace `settings.yaml` contains the submitted chunking values
- invalid `overlap >= size` returns `422`

### Frontend Tests

Follow the existing lightweight source-assertion style in
`tests/unit/web/test_frontend_scaffold.py`.

Add assertions that:

- graph create request typing includes `chunking`
- the create modal contains chunking fields
- the page includes default chunking values
- the page includes validation logic for the chunking inputs

## Non-Goals

This design does not add:

- editing chunking settings after graph creation
- storing chunking metadata in `graph_registry.json`
- per-build chunking overrides
- support for additional chunking types beyond `tokens`
- automatic migration of already-created graph projects

## Risks

- invalid chunking values could produce confusing GraphRAG behavior if not validated
  strictly at both UI and API boundaries
- future support for `sentence` chunking will require expanding both schema and UI,
  so the current `tokens`-only constraint should stay explicit
- a failed write after workspace initialization could leave an unregistered workspace
  directory on disk, which is acceptable for this minimal iteration but should be
  noted in tests and error handling

## Acceptance Criteria

When creating a graph project from the admin console:

- the user can see and edit chunking settings before submitting
- if the user leaves them unchanged, the project uses the current defaults
- if the user changes them, the created workspace `settings.yaml` reflects those values
- invalid chunking combinations are rejected before graph creation succeeds
- the subsequent build uses the configured chunking values without any build-path change
