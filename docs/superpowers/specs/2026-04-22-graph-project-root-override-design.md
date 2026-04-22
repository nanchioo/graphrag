# Graph Project Root Override Design

Date: 2026-04-22
Status: Approved in conversation, pending written-spec review

## Goal

Allow users to choose a different save location for each new graph project while
keeping the current system-level graph root directory as the default.

The feature should:

- preserve the existing system configuration field as the default graph save
  location
- expose a per-graph save-location field in the "new graph" modal
- continue generating the final workspace directory automatically as
  `<parent_dir>/<graph_id>`
- avoid changing how existing graph records are stored and resolved
- keep deletion scoped to the created graph workspace only, never the parent
  directory chosen by the user

## Alternatives Considered

### Option 1: Recommended

Keep the system-config `projects_root` as the default value and add a per-create
override field in the create-graph modal.

Why this is recommended:

- current behavior remains the default when the user does nothing
- the system-config page still has a clear responsibility: default values
- the create modal gains a focused "this graph only" override without adding a
  second workflow
- existing data structures already persist the final `root_dir`, so no registry
  migration is needed

### Option 2: Add a "use system default" toggle in the create modal

This would make the override behavior more explicit, but it adds an extra control
and interaction branch for a simple form.

Why not chosen:

- more UI complexity for very little benefit
- the create modal already has room for a single defaulted text field

### Option 3: Remove graph-root configuration from the system page entirely

This would push all graph-save-location choices into the create flow.

Why not chosen:

- it removes a useful global default
- it broadens scope beyond the user's request
- it would require rethinking the system-config page instead of extending the
  current model

## Chosen Approach

Extend the existing `POST /api/graph` create request with an optional
`projects_root` field representing the parent directory to use for that one graph
creation.

The create flow will become:

1. receive `name`, `description`, `model_profile_id`, optional `projects_root`,
   and optional `chunking`
2. compute the effective parent directory:
   `payload.projects_root or system_config.projects_root`
3. resolve that parent directory using the existing registry path-resolution
   rules
4. compute the final workspace as `<effective_parent_dir>/<graph_id>`
5. initialize the GraphRAG workspace at that final directory
6. register the graph using the final resolved `root_dir`
7. return the normal graph detail payload

This keeps the system config as the default source of truth while allowing a
create-time override.

## API Design

Continue using the existing route:

- `POST /api/graph`

Request payload:

```json
{
  "name": "Customer Service Graph",
  "description": "客服知识图谱",
  "model_profile_id": "profile-123",
  "projects_root": "D:/GraphData/customer-a",
  "chunking": {
    "type": "tokens",
    "size": 1200,
    "overlap": 100,
    "encoding_model": "o200k_base"
  }
}
```

Schema changes:

- `GraphCreateRequest`
  - existing fields remain unchanged
  - add `projects_root: str | None = None`

Response payload remains unchanged because `GraphDetailPayload.root_dir` already
returns the final created workspace path.

### Field Semantics

- `projects_root` means the parent directory for this graph creation
- it is not the final graph workspace path
- the backend always appends the generated `graph_id`

Example:

- submitted `projects_root`: `D:/GraphData/customer-a`
- generated `graph_id`: `customer-service-kg-a1b2c3d4`
- final `root_dir`:
  `D:/GraphData/customer-a/customer-service-kg-a1b2c3d4`

## Backend Design

### Schema Layer

Update `api/schemas/graph.py`:

- add `projects_root: str | None = None` to `GraphCreateRequest`
- trim whitespace for `projects_root`
- normalize whitespace-only input to `None`

This keeps the router logic simple and provides defensive handling if a client
submits an empty string.

### Router Flow

Update `api/routers/graph.py` create flow so it:

- loads the system config as today
- computes:
  `effective_projects_root = payload.projects_root or system_config.projects_root`
- resolves that value through
  `graph_registry_service.resolve_root_dir(effective_projects_root)`
- constructs the final workspace as `projects_root / graph_id`
- passes the final `root_dir` into workspace initialization
- registers the graph using that final `root_dir`

No route changes are required for graph detail, listing, build, or delete.

### Registry and Persistence

No graph-registry schema changes are required.

Why:

- the registry already stores the final `root_dir`
- existing graphs already work with fully resolved workspace paths
- we do not need to persist a separate "overrode default directory" flag for this
  iteration

This avoids any migration of `config/graph_registry.json`.

### Filesystem Rules

The backend should continue following current workspace-initialization behavior
with these explicit guarantees:

- if the parent directory does not exist, it may be created during workspace
  initialization
- if the chosen parent path exists and is a file, graph creation must fail with a
  clear error
- if the final `<parent_dir>/<graph_id>` path already exists, creation should
  fail rather than overwrite it
- relative paths are still resolved against the application project root through
  `GraphRegistryService.resolve_root_dir(...)`
- absolute paths remain absolute

### Delete Behavior

Delete behavior must remain scoped to the final graph workspace directory only.

Given a graph created under:

- parent directory: `D:/GraphData/customer-a`
- final root dir:
  `D:/GraphData/customer-a/customer-service-kg-a1b2c3d4`

Deleting the graph removes only:

- `D:/GraphData/customer-a/customer-service-kg-a1b2c3d4`

It must not remove:

- `D:/GraphData/customer-a`

This preserves safe behavior when multiple graph projects share the same parent
directory.

## Frontend Design

### System Config Page

Keep the existing `projects_root` field in the system-config page, but adjust the
user-facing copy so it reads as a default rather than the only possible location.

Recommended label change:

- from `图谱项目根目录`
- to `默认图谱保存位置`

Optional helper text:

- `新建图谱时会默认使用这里，也可以按图谱单独修改。`

The payload field remains `projects_root`; only the copy changes.

### Graph Creation Modal

Extend the existing create-graph modal in `web/src/pages/GraphManagePage.tsx`
with a new field:

- label: `保存位置`
- bound request field: `projects_root`
- meaning: parent directory only
- default value: current system-config `projects_root`

Recommended helper text:

- `最终目录将自动生成为 <保存位置>/<图谱ID>`

Interaction rules:

- opening the modal should preload the current system default
- users may submit without changing it
- users may edit it for the current graph only
- successful creation should behave exactly as today except for the chosen parent
  directory

### Graph Detail Display

No new field is required in the detail payload.

The existing detail view should continue displaying the final `root_dir`, because
that is the most useful value after creation succeeds.

## Validation and Error Handling

### Frontend Validation

The `保存位置` field should be required in the UI and initialized from the system
default so users always see what will be used.

This prevents confusion about whether the path is optional or inferred.

### Backend Validation

The backend should still be tolerant for robustness:

- trim incoming `projects_root`
- treat whitespace-only values as `None`
- fall back to `system_config.projects_root` if `projects_root` is omitted or
  normalizes to `None`

This ensures compatibility with imperfect clients while keeping the primary UI
strict.

Error cases that should return clear failures:

- parent path resolves to an existing file
- workspace initialization cannot create the directory
- final graph workspace path already exists

## Testing Strategy

### Backend Unit Tests

Update `tests/unit/api/test_graph_routes.py` to cover:

- create graph without `projects_root` still uses the system default
- create graph with custom `projects_root` uses the overridden parent directory
- stored `root_dir` equals `<effective_parent_dir>/<graph_id>`
- whitespace `projects_root` falls back to the system default
- parent path as an existing file fails clearly

Update `tests/unit/api/test_project_workspace_service.py` if needed to cover
workspace initialization against custom parent directories.

Update delete-related tests to confirm:

- deleting a graph removes only the final workspace directory
- the chosen parent directory remains intact

### Frontend Tests

Follow the existing lightweight source-assertion style in
`tests/unit/web/test_frontend_scaffold.py`.

Add assertions that:

- `GraphCreateRequest` includes `projects_root`
- the create modal includes a `保存位置` field
- the modal preloads the system default path
- the modal includes helper text explaining `<保存位置>/<图谱ID>`
- the system-config page describes `projects_root` as a default save location

## Non-Goals

This design does not add:

- editing a graph's save location after creation
- moving an existing graph workspace from one directory to another
- changing upload-root behavior
- separate persistence of "default path override" metadata in the graph registry
- filesystem picker UI

## Risks

- users may still assume `保存位置` is the final path unless the helper text is
  explicit
- allowing arbitrary absolute paths increases the chance of permission-related
  errors on some environments, so error messages should stay readable
- if many graphs share a parent directory, delete safety becomes more important,
  so tests around deletion boundaries should be explicit

## Acceptance Criteria

When creating a graph project from the admin console:

- the user sees a `保存位置` field in the create modal
- the field defaults to the system-config `projects_root`
- the user may change that value for the current graph only
- the backend creates the workspace under
  `<effective_projects_root>/<graph_id>`
- the registry stores and returns the final `root_dir` as today
- if the user leaves the default unchanged, current behavior is preserved
- deleting the graph removes only that graph's final workspace directory, not the
  parent directory
