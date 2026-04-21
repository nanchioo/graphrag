# Web Next Main Flow Integration Design

Date: 2026-04-21
Status: Approved in conversation, pending written-spec review

## Goal

Connect the existing `web-next` application to the current backend in a way
that makes the main operator flow actually usable end to end.

This work is not a general "make every screen live" effort. It is a focused
integration pass that uses the backend capabilities already present in this repo
as the primary constraint, then reshapes the frontend around those capabilities.

## Decision Summary

The chosen direction is:

- keep the current backend feature set as the anchor
- avoid inventing a large new API surface just to match mock-heavy UI
- replace `web-next` mock repositories with real HTTP-backed repositories
- narrow `web-next` interactions to the backend-supported main flow
- downgrade unsupported UI areas to static, read-only, or non-primary flows

Main flow to make real:

1. read system config and model profiles
2. list graphs
3. create a graph
4. upload source files to that graph
5. start a build and inspect build status
6. run `global`, `local`, and `drift` queries against a built graph

## Existing Backend Capability Inventory

The integration should build on the following already-implemented backend
capabilities.

### Config

Available today:

- `GET /api/config/system`
- `PUT /api/config/system`
- `GET /api/config/models`
- `POST /api/config/models`
- `PUT /api/config/models/{profile_id}`
- `DELETE /api/config/models/{profile_id}`

These endpoints already support persisted system settings and model profile
CRUD, so they are valid live targets for `Settings`.

### Graph Management

Available today:

- `GET /api/graph`
- `POST /api/graph`
- `GET /api/graph/{graph_id}`
- `DELETE /api/graph/{graph_id}`
- `GET /api/graph/{graph_id}/files`
- `POST /api/graph/{graph_id}/files`
- `POST /api/graph/{graph_id}/build`
- `GET /api/graph/{graph_id}/status`

These endpoints already support the operational lifecycle needed for the main
flow. This makes `Graph Management` the correct place to host the real create,
upload, build, and status interactions.

### Query

Available today:

- `POST /api/query`
- `POST /api/chat`

The query route already supports:

- `graph_id`
- `question`
- `mode`
- `community_level`
- `response_type`
- `dynamic_community_selection`

This is sufficient to make `Query Workbench` real without expanding into a new
query API design.

## Chosen Integration Approach

Use the current backend contracts directly wherever possible, and change the
frontend to fit those contracts instead of forcing the backend to grow toward
the richer mock UI.

This means:

- thin frontend repository adapters over the existing `/api/...` routes
- minimal backend changes only when there is a real blocker or an obvious
  inconsistency in current payloads
- frontend display fields should prefer derivation, omission, or downgraded UI
  over introducing new backend-only presentation payloads

Examples of this rule:

- if a mock screen shows fields that the backend does not persist today, prefer
  hiding or simplifying those widgets instead of adding broad new persistence
- if the backend already returns enough raw data for the page to render, prefer
  lightweight frontend mapping over adding purely decorative fields
- if an endpoint is missing a field required to complete the chosen main flow,
  adding that field is acceptable

## Scope

### In Scope

- `web-next` repository layer switched from mock data to real HTTP calls
- live `Settings` support for system config and model profiles
- live `Graph Management` support for list, detail, create, upload, build,
  status, and delete
- live `Query Workbench` support for graph-backed queries
- targeted backend fixes required to support the above
- verification of the complete main flow without mock repositories

### Out of Scope

- making `Dashboard` live
- making `Job Monitor` live
- making `Dify Integration` live
- making `Entity Browser` live
- making `Graph Visualization` live beyond its current mock/stat display
- making `Data Sources` a fully backed configuration surface
- building a full backend contract for vector stores, API keys, users,
  permissions, webhooks, or logs
- implementing all advanced parameters shown in the current mock UI

## Frontend Screen Strategy

### Settings

`Settings` should become partially live rather than fully live.

Live sections:

- system configuration
- model profile management

Static or read-only sections:

- vector stores
- users and permissions
- API keys
- webhooks
- logs

Implementation rule:

- if a section has no real backend capability behind it today, it must not
  present itself as a working persisted workflow

### Graph Management

`Graph Management` becomes the primary real operator surface.

It should support:

- listing graphs from `GET /api/graph`
- creating graphs with `POST /api/graph`
- loading graph detail with `GET /api/graph/{graph_id}`
- showing build status with `GET /api/graph/{graph_id}/status`
- listing and uploading source files through `/files`
- starting builds through `/build`
- deleting graphs with `DELETE /api/graph/{graph_id}`

This page should absorb the real operational flow that is currently split across
mock-heavy page concepts.

### Create Graph Wizard

The current 4-step wizard may keep its visual framing, but submission must be
reduced to fields the backend actually supports now:

- `name`
- `description`
- `model_profile_id`

Fields that are not currently accepted by the backend should be treated as one
of the following:

- removed from submission
- visually marked as not yet connected
- retained only as explanatory placeholders

The wizard must not imply that chunking, reader, vector, or advanced indexing
settings are already persisted if they are not.

### Data Sources

`Data Sources` should remain a secondary, mostly static page in this iteration.

Reason:

- the backend main flow already supports source upload through graph-specific
  file APIs
- the current `Data Sources` screen models future reader/chunk/vector
  configuration that is not yet backed by the existing backend

Practical rule:

- do not make `Data Sources` the primary upload entry point in this pass

### Query Workbench

`Query Workbench` should become a real query page driven by live graph data.

Required behavior:

- load graph options from the real graph list
- allow choosing a real graph instead of hard-coding `demo-001`
- submit `global`, `local`, and `drift` queries through `/api/query`
- render real answer and context payloads

The page may keep some advanced controls visually, but only the parameters
actually supported by the current backend should be sent.

Supported outbound parameters:

- `graph_id`
- `question`
- `mode`
- `community_level`
- `response_type`
- `dynamic_community_selection`

Unsupported parameters such as temperature, streaming, or max-context tuning
must not silently pretend to be active backend controls.

## Repository Layer Design

`web-next` should continue using repository contracts, but the implementations
must switch from mocks to real HTTP.

Target repositories:

- `GraphRepository`
- `QueryRepository`
- `SettingsRepository`

Implementation guidance:

- add a small HTTP client helper for `ApiResponse<T>` parsing
- keep error handling consistent and centralized
- make the repositories thin and boring
- put payload-to-view mapping in repository helpers only when needed

Avoid:

- route components directly calling `fetch` everywhere
- duplicating response parsing across pages
- large adapter layers created only to preserve mock-era display fields

## Backend Adjustment Rules

Backend changes in this pass must stay narrow.

Allowed backend changes:

- fix payload inconsistencies that block real frontend use
- expose data already implied by existing workflows
- normalize status behavior where current frontend integration would otherwise be
  brittle
- add small compatibility fields only if they are required for the main flow

Disallowed direction:

- designing whole new subsystems to satisfy static UI sections
- adding broad config persistence for future pages that are still mock-only
- reshaping every schema to exactly mirror the richer mock frontend types

## Data Alignment Rules

Because `web-next` was built from richer mock data, some current frontend types
are wider than the backend contracts.

Alignment policy:

- the source of truth is the current backend contract
- frontend types should be narrowed or made optional where current backend data
  is legitimately absent
- pages should render gracefully when optional mock-era fields do not exist

Examples:

- graph list cards may show fewer summary metrics if only core metadata is
  available
- query result tabs should derive counts from real context when possible
- settings forms should only expose persisted fields as editable

## Main Flow UX

The intended live user journey after this integration is:

1. open `Settings` and confirm or edit system config / model profiles
2. open `Graph Management`
3. create a graph
4. upload one or more source files to the graph
5. trigger a build
6. monitor status until artifacts exist
7. open `Query Workbench`
8. select the built graph
9. run `global`, `local`, or `drift` queries

This flow is the primary acceptance target for the work.

## Error and Empty State Expectations

The live integration must explicitly handle:

- no graphs exist yet
- no default model profile exists
- graph exists but has no uploaded files
- graph has uploaded files but no build yet
- graph build is running
- graph build failed
- query is attempted against an unbuilt graph
- backend request fails or returns validation errors

The frontend should surface these as clear, non-broken states rather than
relying on mock defaults.

## Verification Plan

The work should only be considered complete when the real main flow is verified.

Required verification:

1. frontend build succeeds for `web-next`
2. relevant backend unit tests pass for config, graph, and query routes
3. `web-next` can load real system config and model profiles
4. a graph can be created through the live frontend
5. files can be uploaded through the live frontend
6. a build can be started and status can be observed
7. a built graph can be queried from the live frontend
8. pages render without falling back to mock repositories

If any advanced UI control remains visible but not wired, that must be made
obvious in the UI or reduced in scope before calling the flow complete.

## Risks

- the current mock types may have leaked too deeply into page components,
  creating extra cleanup work during live integration
- some graph summary/detail widgets may currently assume richer metadata than the
  backend persists
- long-running build behavior may expose polling or stale-state issues once the
  UI becomes real
- unsupported advanced controls can confuse users if they remain visually active

## Acceptance Criteria

This design is satisfied when:

- `web-next` no longer depends on mock repositories for `Settings`,
  `Graph Management`, and `Query Workbench`
- the main flow works against the real backend already present in the repo
- unsupported mock-era UI areas are visibly downgraded instead of misleadingly
  interactive
- backend changes remain limited to what is necessary to support the chosen main
  flow
- the result is a real operator path, not just a visually connected demo
