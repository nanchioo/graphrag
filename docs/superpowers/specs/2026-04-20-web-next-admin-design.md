# Web Next Admin Design

Date: 2026-04-20
Status: Approved in conversation, pending written-spec review

## Goal

Create a new frontend admin application for GraphRAG without modifying or
replacing the existing `web` app.

The new application will:

- live in a separate directory, proposed as `web-next`
- use the visual language from `D:\Software\Feishu\GraphRAG Admin Design System`
- ship a complete 9-screen admin shell in phase 1
- start as a static, high-fidelity product UI backed by mock repositories
- be structured so phase 2 can progressively replace mock data with real API
  integrations

The existing `web` application remains available and unchanged during this work.

## Requested Product Shape

The user selected the following direction in conversation:

- delivery mode: two-step rollout
- phase 1: complete static frontend
- phase 2: progressively connect real functionality
- foundation: independent React application
- product bias: migration-ready rather than demo-only

This means the first delivery is not just a visual prototype. It must already
encode the future information architecture, domain types, and component
boundaries needed for real integration.

## Chosen Approach

Build a new `web-next` application with `React + Vite + TypeScript +
React Router`, and implement the UI with design-system-aligned custom
components rather than relying on Ant Design as the primary presentation layer.

Why this approach:

- it keeps the current `web` intact and avoids risky in-place rewrites
- it allows the new app to adopt the design system cleanly instead of fighting
  a component library's defaults
- it preserves a clear migration path from mock data to real API data
- it lets the team rebuild core screens around stable domain concepts instead of
  cloning the current page structure blindly
- it keeps phase 1 and phase 2 on the same codebase so the static version is not
  throwaway work

## Product Scope

Phase 1 will include a complete navigation shell and 9 implemented screens:

1. `Dashboard`
2. `Graph Management`
3. `Graph Visualization`
4. `Data Sources`
5. `Query Workbench`
6. `Entity and Relation Browser`
7. `Job Monitor`
8. `Dify Integration`
9. `Settings`

All 9 screens are real pages in phase 1, not empty placeholders. They may use
mock data, but each screen should feel product-complete and consistent with the
future admin experience.

## Relationship to Existing Web App

The new app does not replace the old one during phase 1.

Existing-to-new mapping:

- current `/graphs` maps to `Graph Management`
- current `/models` maps to `Settings`
- current `/query` maps to `Query Workbench`

The new app will also add first-class pages that are only partially represented
or absent in the current `web` app:

- `Dashboard`
- `Graph Visualization`
- `Data Sources`
- `Entity and Relation Browser`
- `Job Monitor`
- `Dify Integration`

Important rule:

- do not edit, move, or rename the current `web` directory as part of this work

## Visual and Content Direction

The new UI should follow the provided GraphRAG Admin design system:

- light-mode admin shell
- `#155EEF` as primary brand color
- indigo accent for graph-oriented surfaces and visualization accents
- restrained technical Chinese copywriting
- white cards on a light canvas
- left navigation plus compact top header
- subtle borders and low-elevation shadows

The design system's token intent should be preserved, but the code should be
owned inside the repo rather than hard-linking the external design-system
directory at runtime.

## Information Architecture

### Dashboard

Purpose:

- give an operational overview of graph assets, build activity, query activity,
  and Dify connection state

Phase 1 content:

- graph count and recent status distribution
- entity/relation scale stats
- recent build tasks
- recent query snippets
- Dify connection summary

Phase 2 integration candidates:

- graph list summary
- build status summary
- recent query telemetry if exposed later

### Graph Management

Purpose:

- become the primary operating surface for graph lifecycle tasks

Layout:

- left list panel for graphs
- right detail workspace for the selected graph

Primary detail sections:

- graph metadata
- build status
- source files
- text units
- graph preview summary
- report summary

This page is the first migration target in phase 2.

### Graph Visualization

Purpose:

- separate graph exploration from graph management detail

Views:

- force-directed graph
- community block view

Phase 1 uses structured mock entities, edges, and communities. Phase 2 can
adapt this page to `GraphPreviewPayload` and report summaries.

### Data Sources

Purpose:

- represent where graph input comes from and how ingestion is configured

Sections:

- source connectors
- reader type
- chunk parameters
- import status/history

Phase 1 is static but must use field names and labels that can later align with
real configuration data.

### Query Workbench

Purpose:

- replace the current query console with a stronger operator workflow

Layout:

- left composer for graph selection, mode, query text, and advanced parameters
- right result area for answer, references, and structured context

Modes:

- `global`
- `local`
- `drift`

This page is the second major migration target in phase 2.

### Entity and Relation Browser

Purpose:

- provide a dedicated browsing surface for extracted graph content

Content:

- entity list
- relation list
- community metadata
- filtering and drill-down affordances

Phase 1 uses mock data with future-facing field names and table structure.

### Job Monitor

Purpose:

- show indexing and build progress, errors, duration, and token consumption

Content:

- active jobs
- recent failures
- progress states
- token and runtime summaries

This page can later consume build/job history when the backend supports it.

### Dify Integration

Purpose:

- configure and observe GraphRAG-to-Dify integration

Content:

- endpoint and API key fields
- dataset mapping
- callback configuration
- recent sync or invocation history

Phase 1 is mock-backed but product-shaped.

### Settings

Purpose:

- absorb and expand the current model-configuration workflow

Content:

- system paths
- default profile selection
- model profile management
- provider configuration
- future vector-store and LLM-provider settings

This page is the third major migration target in phase 2.

## Application Architecture

The app should be built as a standalone frontend under `web-next`.

Recommended structure:

```text
web-next/
  src/
    app/
      layout/
      providers/
      router/
    pages/
      dashboard/
      graphs/
      graph-viz/
      data-sources/
      query/
      browse/
      jobs/
      dify/
      settings/
    features/
      graph-management/
      graph-query/
      model-profiles/
      dify-integration/
      job-monitoring/
    entities/
      graph/
      model-profile/
      query/
      source-file/
      report/
    services/
      api/
      repositories/
      adapters/
    mocks/
      fixtures/
      repositories/
    shared/
      ui/
      lib/
      hooks/
      types/
      constants/
    styles/
      tokens.css
      globals.css
      utilities.css
    main.tsx
```

Design intent of this split:

- `pages` compose route-level UI
- `features` contain reusable business blocks
- `entities` own domain shapes and presentation helpers
- `services/repositories` define data-source contracts
- `mocks/repositories` implement phase-1 data
- `services/api` will implement phase-2 live data adapters
- `shared/ui` contains reusable shell and primitive components

## Routing Design

The app should use explicit route URLs rather than local prototype state.

Proposed routes:

- `/` -> redirect to `/dashboard`
- `/dashboard`
- `/graphs`
- `/graphs/:graphId/viz`
- `/sources`
- `/query`
- `/browse`
- `/jobs`
- `/dify`
- `/settings`

Route design rules:

- route names should be stable across phase 1 and phase 2
- the sidebar should always reflect the current route
- graph visualization may use a graph-aware nested route if a selected graph is
  available

## Styling Strategy

Bring the design-system tokens into the repo and expose them through local CSS
files:

- `src/styles/tokens.css`
- `src/styles/globals.css`
- `src/styles/utilities.css`

Implementation rules:

- preserve the supplied token values unless there is a concrete integration need
- prefer local CSS modules or scoped page styles for feature-specific layout
- keep shell primitives visually consistent across all screens
- use `Inter` for UI and `JetBrains Mono` for code-like or metric surfaces

Do not treat the external design-system folder as a runtime dependency. It is a
reference source, not part of the deployable app.

## Component Strategy

The app should use lightweight custom primitives aligned to the design system.

Recommended shell and primitive set:

- `AppShell`
- `Sidebar`
- `TopHeader`
- `PageHeader`
- `Card`
- `StatCard`
- `Button`
- `IconButton`
- `Tabs`
- `Badge`
- `Tag`
- `EmptyState`
- `Alert`
- `Table`
- `Field`
- `Panel`
- `Skeleton`

Reason for this choice:

- it keeps presentation consistent
- it avoids extensive style overrides against Ant Design defaults
- it makes the static-to-live transition easier because visual primitives remain
  under project control

## Data Architecture

The central requirement is that phase 1 screens must not bind directly to mock
JSON blobs. They should depend on repository contracts.

### Repository-first design

Define repository interfaces for the main domains:

- `GraphRepository`
- `ModelProfileRepository`
- `QueryRepository`
- `SystemConfigRepository`
- `JobRepository`
- `DifyRepository`

Phase 1:

- pages consume repository interfaces
- repositories are implemented by mock-backed modules

Phase 2:

- add API-backed repository implementations
- switch the provider wiring from mock repositories to API repositories
- keep page composition and most feature components unchanged

### Type Reuse

The existing `web/src/types/index.ts` already defines useful backend-aligned
types such as:

- `GraphDetailPayload`
- `GraphStatusPayload`
- `GraphPreviewPayload`
- `GraphReportsPayload`
- `ModelProfileResponse`
- `SystemConfigPayload`
- `QueryResponsePayload`

Phase 1 should reuse these types directly where practical, or extend them in a
backward-compatible way for mock presentation needs.

This reduces migration cost because the live-data integration can target shapes
the backend already returns.

### Adapter Layer

Where a page needs richer presentation-oriented structures, create adapters that
map API payloads or raw mocks into view models.

Example:

- payload model: `GraphStatusPayload`
- page model: `GraphOverviewCardModel`

This keeps view formatting out of repository implementations and prevents route
components from becoming data-mapping hubs.

## State Management

Use a lightweight state model:

- route state via `React Router`
- local page state via `useState` and `useReducer`
- shared repository or environment selection via small React contexts

Do not introduce a heavyweight global store in phase 1 unless a real integration
need appears during implementation.

Why:

- the app is medium-sized, not state-complex yet
- phase 1 needs fast execution and clean boundaries
- repository abstraction already removes much of the pressure for global state

## Mock Strategy

Mock data should be realistic, structured, and migration-friendly.

Rules:

- use domain-accurate field names
- include timestamps, IDs, status strings, counts, and error states
- avoid placeholder-only lorem ipsum for operational data
- model success, empty, warning, and failure scenarios

Mock coverage expectations:

- at least one populated graph-management flow
- at least one failed or in-progress build case
- at least one empty-state screen section
- at least one query result with structured context and references
- at least one Dify connection test success/failure state

## Phase Plan

### Phase 1

Deliver a complete `web-next` application with:

- working route shell
- 9 high-fidelity pages
- custom design-system-aligned components
- repository contracts
- mock repository implementations
- reusable tokens and styles

### Phase 2

Progressively replace mock repositories with API-backed repositories,
prioritizing:

1. `Graph Management`
2. `Settings`
3. `Query Workbench`

Later targets:

- `Graph Visualization`
- `Job Monitor`
- `Data Sources`
- `Entity and Relation Browser`
- `Dify Integration`
- `Dashboard`

## Error Handling and UX States

The migration-ready requirement means phase 1 must implement operational states,
not only happy paths.

Every core screen should account for:

- loading state
- empty state
- error state
- disabled action state
- partial data state where relevant

Examples:

- graph list with no graphs
- selected graph with missing artifacts
- query response area before first run
- Dify connection test failure
- settings page with no default model profile

These states should exist visually in phase 1 so phase 2 only needs to connect
real triggers.

## Testing Strategy

### Phase 1 Verification

At minimum verify:

- `npm build` succeeds for `web-next`
- all 9 routes render
- sidebar navigation works
- the 3 migration-priority screens render complete mock flows
- static data wiring works through repositories rather than route-local literals

### Phase 2 Verification

As each live screen is connected:

- verify repository swap works without page rewrites
- verify real API success and failure paths
- verify loading and empty states against actual network behavior

### Suggested Test Shape

Given the current repo style, favor practical coverage such as:

- build verification
- small component or rendering tests for route shells and key states
- source assertions only where the repo already uses that pattern

## Non-Goals

This design does not include:

- removing or rewriting the existing `web` app
- making all 9 screens fully live in phase 1
- introducing a mobile-first responsive redesign
- implementing every future backend endpoint up front
- preserving Ant Design as the main visual layer in `web-next`

## Risks

- if custom primitives are under-scoped, the team may recreate inconsistent page
  patterns across the 9 screens
- if mock data is too shallow, phase 2 integration will expose missing empty or
  error states late
- if types drift away from existing backend payloads, repository replacement will
  become expensive
- if the team falls back to route-local mock objects, the repository abstraction
  loses value

## Implementation Notes

Important practical rules for execution:

- create `web-next` as a sibling to `web`, not inside it
- do not modify existing `web` routing or behavior
- establish the style tokens and shell primitives before building page details
- build the 3 migration-priority screens with stronger domain fidelity than the
  remaining 6 screens
- prefer mock repositories over in-component fixture imports
- keep page copy Chinese-first and technically restrained

## Acceptance Criteria

The design is satisfied when:

- a new `web-next` app exists separately from the current `web`
- the current `web` remains untouched and usable
- the new app exposes 9 navigable screens
- the visual language follows the supplied GraphRAG admin design system
- phase 1 uses repository abstractions rather than page-local mock literals
- the future live-data path is clear for `Graph Management`, `Settings`, and
  `Query Workbench`
- the codebase structure supports progressive phase-2 integration without a new
  rewrite
