# GraphRAG Workbench UI Unification Design

Date: 2026-04-23
Status: Approved in conversation, pending written-spec review

## Goal

Unify the GraphRAG web application's three primary pages into one coherent,
professional admin-console experience:

- graph management
- model configuration
- query operations

The redesign should improve visual consistency, task clarity, information
hierarchy, and terminology without changing the underlying product workflows or
API behavior.

This is a cross-page UI/UX tightening pass, not a feature expansion.

## User Direction Confirmed In Conversation

The approved direction is:

- optimize all three pages together rather than improving a single page in
  isolation
- use a balanced professional admin-console style rather than either a sparse
  minimalist shell or a dense operator-only console
- rewrite the content system and fix existing garbled Chinese strings instead of
  only restyling the current text
- design for a mixed audience that includes technical users and adjacent product
  or analysis roles
- allow small information-architecture adjustments and module regrouping, but
  do not change the feature set or the core workflows

The user explicitly chose:

- visual direction: balanced professional backend
- content direction: full terminology and copy rewrite
- audience: mixed team
- layout scope: modest page-level reordering, no major functional redesign

## Inputs And Design References

This design is informed by:

- `C:/Users/EDY/.gemini/tmp/web/fde28d62-673d-4915-a101-778674fee0fc/plans/ui_ux_refactor_pro_max.md`
- `web/.skill/ui-ux-pro-max/SKILL.md`
- the current implementation in:
  - `web/src/App.tsx`
  - `web/src/styles.css`
  - `web/src/pages/GraphManagePage.tsx`
  - `web/src/pages/ModelConfigPage.tsx`
  - `web/src/pages/QueryPage.tsx`
  - shared components under `web/src/components/`

The local `ui-ux-pro-max` design search recommended a data-dense dashboard
direction with:

- blue-led analytical color hierarchy
- restrained amber used only for attention states
- technical, dashboard-oriented typography
- hover and highlight behavior that improves scanability without decorative
  motion

This design adopts that recommendation in a moderated form suitable for a mixed
team and a Chinese-first interface.

## Alternatives Considered

### Option 1: Conservative visual cleanup

Only normalize colors, shadows, spacing, and button styles while preserving the
current page structures almost exactly.

Why not chosen:

- it would make the pages more polished, but still feel like separate screens
  rather than one product
- it would not solve the current inconsistency in task hierarchy
- it would leave the terminology system fragmented

### Option 2: Balanced professional workbench (chosen)

Unify the shell, copy system, state language, and page structure while making
only small module-order changes inside each page.

Why this is recommended:

- it matches the user's chosen visual and structural scope
- it improves usability for both technical and adjacent users
- it creates a shared product identity across all three pages
- it preserves implementation risk at a manageable level

### Option 3: Hard operator-console redesign

Push all pages toward a very dense, strongly technical operational control
surface with minimal breathing room and heavier state emphasis.

Why not chosen:

- it would bias too far toward engineering operators
- it would be less approachable for mixed teams
- it would risk reducing clarity on forms and result-reading surfaces

## Chosen Approach

Implement a three-page workbench unification around a balanced analytical
backend language.

The redesign should:

- keep the floating top-level application shell concept
- introduce one shared page frame across graph, model, and query workflows
- sharpen hierarchy between page header, primary action zone, main workspace,
  and supporting detail surfaces
- rewrite UI copy into one concise terminology system
- standardize status semantics across all pages
- improve component-specific hierarchy without altering feature behavior

The result should feel like one GraphRAG workbench instead of three adjacent
admin pages.

## Core Design Principles

### One Product, Three Task Surfaces

The pages should feel related but not identical in emphasis:

- graph management is the build and asset workflow
- model configuration is the governance and connectivity workflow
- query is the experimentation and answer-inspection workflow

Each page keeps its domain-specific priority, but all three use the same
structural grammar.

### Professional, Not Cold Or Decorative

The product should read as professional and analytical, but not severe, flashy,
or marketing-driven.

This means:

- no decorative hero theatrics
- no strong glassmorphism dependence
- no oversized consumer-style CTAs
- no ornamental animation
- no neon or dark-mode console styling

### Mixed-Team Readability

The interface must remain efficient for technical users without assuming every
operator is an engineer.

This means:

- clearer section names
- explanatory helper text that points to the next action
- technical terms preserved only where they are standard and useful
- reduced reliance on implicit backend vocabulary

## Visual System

### Color Strategy

Use a clean analytical palette centered on slate neutrals and stable blue data
accents.

Recommended token direction:

- background base: `#f8fafc`
- elevated background: `#ffffff`
- structural text: `#0f172a`
- secondary text: `#475569`
- faint text: `#94a3b8`
- border: `rgba(15, 23, 42, 0.08)`
- strong border: `rgba(15, 23, 42, 0.12)`
- primary action / active state: `#1e40af`
- secondary active / hover: `#3b82f6`
- active soft fill: `rgba(30, 64, 175, 0.08)`
- warning / attention: `#f59e0b`
- success: restrained green
- error: restrained red

Color rules:

- blue carries selection, primary action, active progress, and analytical focus
- amber appears only for "needs attention" states, not as a second brand color
- neutral surfaces remain dominant so tables, forms, and graph output stay
  readable
- no page should introduce a one-off color family outside the system

### Shape And Elevation

Adopt a cleaner, more precise surface system than the current rounded glass-like
cards.

Recommended direction:

- primary shell radius: 14px to 16px
- cards and panels: 12px to 16px
- compact controls: 10px to 12px
- subtle border-first depth, with restrained shadow support

The UI should feel stable and instrument-like rather than soft and floating.

### Typography

The UI should use typography to distinguish product copy from technical values.

Rules:

- Chinese-first body typography should remain a readable sans-serif stack
- IDs, paths, model names, metrics, and code-like values may use a monospace
  family for contrast
- headings should become more consistent and compact
- descriptive copy should be shorter and more directive

The `ui-ux-pro-max` search recommended a Fira-style dashboard pairing. Rather
than adopting that literally for all text, this design uses the underlying
principle:

- normal interface copy stays readable for Chinese
- technical tokens get a more code-oriented treatment

### Motion

Motion should remain lightweight and purposeful.

Allowed:

- hover-state border or background transitions
- focused control emphasis
- selected-row and selected-panel transitions
- loading indicators

Avoid:

- decorative looping motion
- scale-based hover that shifts layout
- attention-seeking animation unrelated to active work

## App-Level Design

### Shared Shell

Keep the fixed top navigation, but tighten it into a lighter workbench header.

The shell should:

- preserve route switching between the three pages
- reduce decorative glass emphasis
- keep enough separation from the viewport edges to feel intentional
- use a smaller, clearer brand block
- make the active route state more explicit

The shell must support the feeling that every page is part of one instrument
panel.

### Shared Page Frame

Every page should use the same high-level sequence:

1. page header
2. primary action or control zone
3. main work surface
4. supporting detail or output surface

This shared grammar is more important than making every page look visually
identical.

## Content System

### Terminology Direction

Use concise Chinese labels for user-facing tasks while preserving standard
technical English where translation would reduce clarity.

Examples:

- page names:
  - a Chinese label meaning "Graph Workspace"
  - a Chinese label meaning "Model Configuration"
  - a Chinese label meaning "Query Workspace"
- actions:
  - a Chinese action meaning "Create Graph"
  - a Chinese action meaning "Upload Files"
  - a Chinese action meaning "Start Build"
  - a Chinese action meaning "Resume Build"
  - a Chinese action meaning "Full Rebuild"
  - a Chinese action meaning "Clear Artifacts"
  - a Chinese action meaning "Add Model"
  - a Chinese action meaning "Save Settings"
  - a Chinese action meaning "Set As Default"
  - a Chinese action meaning "Test Connection"
  - a Chinese action meaning "Run Query"
- preserved technical fields:
  - `Graph ID`
  - `Base URL`
  - `API Key`
  - `Embedding Model`
  - `Community Level`

### Copy Rules

Helper text should explain what the user can do next, not just restate what the
component is.

Examples:

- upload helper copy should explain supported input and what happens after
  upload
- build-state copy should emphasize progress and next available actions
- query-mode copy should clarify the practical difference between modes

This requires removing or rewriting the current garbled Chinese strings across
all three pages and shared components.

Because the current repository already contains corrupted Chinese strings in
multiple frontend files, final implementation must verify:

- source files are saved with stable UTF-8 encoding
- rewritten labels render correctly in the browser
- no newly introduced copy regresses into mojibake in JSX, CSS, or tests

## State Semantics

Standardize all visible statuses into one semantic system.

### Neutral / Pending

Use gray.

Examples:

- waiting for upload
- not configured
- no result yet

### In Progress

Use blue.

Examples:

- building
- connecting
- querying

### Success / Ready

Use green.

Examples:

- ready
- connected
- default active

### Warning / Attention

Use amber.

Examples:

- waiting for build
- artifacts cleared and rebuild needed
- incomplete setup needing a next step

### Failure / Error

Use red.

Examples:

- build failed
- connection failed
- query failed

Status rules:

- color should never be the only indicator
- every status must include a text label
- the same meaning must map to the same color family across pages

## Page-Specific Design

### Graph Management Page

This page remains the operational center of the product and should receive the
strongest task-clarity improvements.

#### Structural Changes

Keep a two-column desktop layout:

- left column:
  - graph project navigation
  - new graph action
  - refresh action
- right column:
  - graph overview
  - data input zone
  - build control zone
  - build output zone

#### Information Order

Reorder the main workspace into:

1. overview
2. upload and source files
3. build control and status
4. preview, reports, and text units

This makes the user journey easier to scan:

- select graph
- understand current state
- upload data
- build
- inspect output

#### Component Treatment

- `GraphTable` should behave more like a navigation list than a generic table
- the selected graph state should combine row highlight and a left active rail
- `UploadPanel` should read as the input surface for the current graph
- `BuildStatusCard` should become a clearer build console with separated error
  treatment
- `GraphPreview` and `TextUnitList` should visually belong to one output area

### Model Configuration Page

This page should feel governed and orderly rather than form-heavy.

#### Structural Changes

Keep a single-column flow, but divide the page into two clearer sections:

1. system defaults
2. model registry

#### Information Priorities

The system section should foreground:

- graph storage root
- upload root
- default model profile

The model registry should foreground:

- profile name
- provider
- primary model
- connectivity state
- default state

Base URL and masked API key remain visible, but at lower emphasis.

#### Modal Design

`ModelProfileForm` should be reorganized into grouped sections:

1. preset selection
2. connection basics
3. model capability fields
4. default-state controls

This reduces the current "long vertical form" feeling and makes onboarding
faster for mixed teams.

### Query Page

This page should feel like a working session surface rather than a generic form
followed by a result card.

#### Structural Changes

Use a split desktop layout:

- left: query controls
- right: answer and context inspection

On narrow widths, collapse into a vertical sequence:

1. query controls
2. answer
3. context basis

#### Information Priorities

The control column should emphasize:

- target graph
- query mode
- community level
- response format
- question input
- submit action

The result column should separate:

- answer
- supporting context

Raw context keys should be translated or mapped into clearer user-facing labels
where practical instead of exposing the API response structure directly.

## Shared Component Design

### BuildStatusCard

Reframe from a general status card into a build control surface.

Recommended structure:

- top: progress and phase summary
- middle: key counts and active file information
- bottom: action row
- separate error region when needed

The current design hides too much important state inside `Descriptions`.

### UploadPanel

Clarify it as the graph input area.

Rules:

- primary instruction should describe the task, not only the drag interaction
- supported file types and pending file count should be visible but secondary
- primary upload action should use shorter copy

### GraphTable

Treat the list as a project navigator.

Rules:

- project name is the primary line
- graph identifier is secondary
- delete is visually de-emphasized
- row selection state must be clearer than it is today

### GraphPreview

Create a more coherent output workspace for:

- graph visualization
- summary metrics
- reports

The chart color system should move to a blue-gray data palette instead of the
current near-black emphasis.

### ModelProfileForm

Improve scanability with grouped sections and clearer helper copy for presets,
providers, keys, and model fields.

### QueryPanel

The form should read as experiment controls.

Rules:

- query-mode choices should include short guidance
- the main question area should feel intentional and prominent
- the action area should remain stable while results update elsewhere

## Responsive Design

### Desktop (`>= 1280px`)

- preserve split layouts where relevant
- graph page uses left navigation plus right workspace
- query page uses left controls plus right results
- statistics may stay in multiple columns

### Medium Width (`768px - 1279px`)

- preserve the section sequence
- reduce parallel density
- collapse multi-column metric areas where necessary
- keep control actions visible without crowding

### Mobile (`<= 767px`)

- stack all sections vertically
- order content by task sequence
- allow internal table scrolling only where needed
- avoid full-page horizontal overflow

## Accessibility Design

This redesign should explicitly improve baseline accessibility.

Requirements:

- heading levels should be sequential and semantically correct
- status meaning must be visible through text and color
- keyboard focus states must be clear on buttons, rows, tabs, collapse headers,
  and upload surfaces
- contrast should remain readable in light mode
- motion should respect `prefers-reduced-motion`

This is not a full accessibility overhaul, but obvious issues should not remain.

## Implementation Design

### Scope Boundary

This work may:

- revise global design tokens
- refine page structure within each route
- reorder modules inside pages
- rewrite UI copy
- restyle shared components
- add small presentational subcomponents where that improves clarity

This work should not:

- change backend APIs
- change route structure
- add new workflows
- add new persistent business state
- expand beyond the three existing pages and their directly related components

### File-Level Implementation Focus

Primary implementation surfaces:

- `web/src/styles.css`
- `web/src/App.tsx`
- `web/src/pages/GraphManagePage.tsx`
- `web/src/pages/ModelConfigPage.tsx`
- `web/src/pages/QueryPage.tsx`
- `web/src/components/BuildStatusCard.tsx`
- `web/src/components/UploadPanel.tsx`
- `web/src/components/GraphTable.tsx`
- `web/src/components/GraphPreview.tsx`
- `web/src/components/TextUnitList.tsx`
- `web/src/components/ModelProfileForm.tsx`
- `web/src/components/QueryPanel.tsx`

Recommended implementation order:

1. update global shell and token layer
2. stabilize shared page-frame classes
3. refactor graph management structure
4. refactor model configuration structure
5. refactor query page structure
6. normalize shared components and copy
7. verify responsive behavior and source assertions

### React Structure Guidance

The current pages mix data work and surface rendering. Keep the existing route
containers, but improve presentational boundaries where that reduces complexity.

In particular:

- prefer clearer container/presentational splits when touching large page files
- avoid pushing more UI logic into already long route components
- keep behavior stable while reshaping render structure

## Testing Strategy

### Source Assertion Tests

Update frontend scaffold assertions to cover the new shared language, including:

- consistent page-level shell classes
- revised copy anchors where tests already assert visible labels
- removal of outdated visual assumptions

If source assertions are currently too brittle, they may need focused updates
rather than broad snapshot-like checks.

### Build Verification

Run the frontend production build:

- `cmd /c npm.cmd run build`

This verifies:

- TypeScript correctness
- Vite bundling
- that layout refactors did not break imports or JSX structure

### Visual Verification

Manually verify at minimum:

- graph management page
- model configuration page
- query page
- create graph modal
- model profile modal

Check desktop and mobile-width behavior.

### Interaction Verification

Verify:

- selected navigation state on graph list
- build-state transitions remain readable
- upload flow still behaves correctly
- model connect/default/edit/delete actions remain distinguishable
- query submission still keeps controls understandable while results update

## Risks

- if copy rewrite is inconsistent, the pages will still feel fragmented even if
  styling improves
- if the graph page keeps too much equal-weight card treatment, task flow will
  remain unclear
- if the query split layout is too aggressive, medium-width usability may suffer
- if technical English terms are translated too literally, mixed-team clarity may
  decrease rather than improve
- if all pages become visually identical, domain-specific priorities may be lost

## Non-Goals

This design does not include:

- backend logic changes
- route or navigation redesign
- new model-management workflows
- new graph-build features
- new query capabilities
- dark mode
- marketing-style brand expression
- broad restyling outside the three target pages and their shared shell

## Acceptance Criteria

The redesign is successful when:

- all three pages clearly look and behave like one product family
- existing garbled Chinese strings are removed from the targeted pages and
  components
- terminology becomes consistent across graph, model, and query workflows
- graph management reads as a clearer end-to-end task flow
- model configuration feels more governed and less like an undifferentiated form
- query becomes easier to operate and easier to read, especially on desktop
- status language and color meaning are consistent across the application
- desktop and mobile layouts remain usable without obvious overflow or crowding
- the frontend build succeeds after the refactor
