# Graph Analysis Console Visual Language Design

Date: 2026-04-22
Status: Approved in conversation, pending written-spec review

## Goal

Replace the current warm, generic admin-console styling with a visual language
that feels like a knowledge-graph analysis tool.

The redesign should:

- keep the existing information architecture and page layout responsibilities
- preserve the current GraphRAG admin-console workflows
- shift the product away from a warm, template-like dashboard look
- introduce a cleaner, sharper, more analytical visual identity
- make graph- and data-oriented surfaces feel intentional rather than generic

This is a visual-language redesign, not a navigation or feature redesign.

## User Direction Confirmed In Conversation

The approved direction is:

- cleaner, more professional, less warm
- closer to a data product or analysis console than a standard admin template
- not overly branded, not marketing-like, and not decorative for its own sake
- more contrast and more presence than the "plain black/white SaaS" explorations
- not neon, not cyberpunk, and not dark mode
- keep the current page structure, but restyle it with a more graph-native
  visual tone

The approved mockup direction is the "knowledge graph analysis station" variant:

- cold white and light gray background system
- deep gray structural surfaces
- restrained cold cyan accent family
- graph-like hero and panel treatment
- sharper enterprise-tool feel with stronger hierarchy

## Alternatives Considered

### Option 1: Pure neutral SaaS restyle

Use only white, gray, black, and a minimal conventional blue accent.

Why not chosen:

- it looked too generic and "template admin"
- it solved cleanliness but not product character
- it did not feel specific to knowledge graphs

### Option 2: Strong brand-forward console

Use heavier contrast, stronger decorative choices, and more obvious branding.

Why not chosen:

- it risks looking like a marketing or product website
- it can compete visually with the graph data itself
- the user specifically pushed back on stylings that felt forced or off-tone

### Option 3: Knowledge graph analysis console (chosen)

Keep the layout structure, but shift the visual language toward a professional
analysis tool with restrained cold accent color and graph-aware surfaces.

Why this is recommended:

- it preserves the utility of the current admin console
- it gives the product a clearer identity without changing workflows
- it better matches the semantics of nodes, edges, builds, relations, and query
  operations
- it makes the UI feel more intentional and less like a stock dashboard

## Chosen Approach

Implement a global visual-language refresh around a "graph analysis station"
theme.

The design system should be driven by:

- light cool background layers instead of warm beige gradients
- glassy but restrained white panels with explicit borders
- deep gray structural anchors for brand blocks and primary actions
- a cold cyan accent family used sparingly for focus, activity, graph lines,
  active selection, and progress
- stronger typographic hierarchy, especially in the page hero and modal titles
- graph-like visual motifs in the overview and preview surfaces

This approach should make the application feel like a domain tool for structure
analysis rather than a generic CRUD dashboard.

## Visual System

### Color Strategy

Use a restrained cool palette:

- background base: `#eef2f6` to `#f5f8fb`
- primary text: `#111827`
- secondary text: `#617084`
- faint text: `#8a95a5`
- border: `rgba(15, 23, 42, 0.09)`
- strong border: `rgba(15, 23, 42, 0.16)`
- accent: `#0f8ea8`
- accent bright edge: `#27c2d9`
- accent soft fill: `rgba(15, 142, 168, 0.12)`
- accent medium border/focus fill: `rgba(15, 142, 168, 0.22)`

Color usage rules:

- accent color should never dominate the whole page
- most surfaces remain white, cool gray, or deep gray
- accent exists to communicate graph activity, selected state, progress,
  analytical emphasis, and topology
- destructive and success states remain distinct semantic colors, but they
  should sit under the same restrained system rather than reintroducing bright
  consumer-app saturation

### Shape and Depth

Use a sharper but not harsh shape language:

- outer application shell radius: 24px to 28px
- surface cards: 20px to 24px
- compact controls: 12px to 14px
- pills/chips: fully rounded

Depth rules:

- rely on subtle shadow plus explicit borders
- do not use heavy floating-card depth everywhere
- keep panels readable, layered, and slightly technical

### Typography

Typography should carry more of the product character than color.

Recommended hierarchy:

- large page hero headings with tighter tracking
- compact uppercase micro-labels for system and metric descriptors
- restrained body copy
- strong numeric emphasis for graph counts, entity volume, and task metrics

The page should feel like an instrument panel: high signal, concise text, and
clear visual ranking.

## Application-Level Design

### App Shell

The current app shell remains intact in structure, but the styling changes:

- the left rail / sidebar should feel more like a tool rail than a card stack
- top navigation should become tighter and more instrument-like
- the main canvas should sit inside a cool-toned product frame rather than a
  warm gradient backdrop

### Hero Area

The hero area should stop looking like a generic welcome panel.

Instead, it should:

- present a stronger page identity
- foreground graph-domain meaning
- use one graph-aware visual treatment, such as a subtle topology or analytical
  pulse motif
- provide a stronger first-impression anchor for the product

The hero should read like the command surface of a graph analysis environment.

## Component Design

### Cards and Panels

Cards should become cleaner, sharper, and more domain-aware.

Rules:

- increase border clarity
- reduce warm color influence to zero
- use cool glassy white panels where appropriate
- reserve the strongest visual emphasis for panels that carry graph or build
  status information

Not all cards need equal visual weight. Panels such as graph preview, build
status, topology summaries, and task streams should feel more intentional than
generic form wrappers.

### Buttons

Buttons should follow a two-tier system:

- primary actions use deep gray structural fill with crisp contrast
- accent is used for focused states, selected pills, and active graph/system
  indicators

This keeps the interface grounded and avoids making every call-to-action feel
bright or consumer-like.

### Inputs and Forms

Forms, especially the create-graph modal, should feel like a configuration
console rather than a standard admin form.

Rules:

- use cooler surface backgrounds
- apply cleaner border treatment
- use accent focus rings for active fields
- keep spacing compact but breathable
- make grouped configuration sections feel like parameter blocks

The current field structure can remain, but the visual treatment should better
match technical configuration workflows.

### Tables

Tables should lean into analytical clarity:

- stronger row separators
- cleaner header styling
- tighter numeric emphasis
- subtler but clearer progress/status displays

The goal is "operations console", not "business admin spreadsheet".

### Graph and Data Visuals

Graph-aware surfaces are where the redesign should distinguish itself most.

For graph previews, entity growth panels, token charts, and similar surfaces:

- use restrained cold accent lines and bars
- introduce graph/topology visual language where helpful
- avoid bright rainbow charting
- keep the composition clean enough that data remains the focus

The right kind of graph treatment should make the UI feel specific to knowledge
graphs even before the user reads the labels.

## Page-Specific Application

### Graph Management Page

This page should become the clearest expression of the new style.

Apply the design by:

- turning the hero into a stronger graph-analysis header
- making the selected graph state feel more instrument-like
- giving build status, graph preview, and text-unit surfaces clearer hierarchy
- making the create-graph modal feel like a configuration panel

The page should feel closer to a graph operations workspace.

### Model Config Page

This page remains secondary in visual drama, but should still inherit the new
system:

- cool surfaces
- sharper borders
- stronger field grouping
- technical rather than generic settings-page styling

### Query Page

The query page should feel like an operator console:

- prompt area and response area should read as working surfaces
- controls should feel crisp and analytical
- answer/result sections should use the same restrained hierarchy

## Animation and Motion

Motion should remain minimal and purposeful.

Allowed:

- subtle hover lift or border emphasis
- focus ring transitions
- selected-state transitions
- graph-preview shimmer or analytical pulse when it directly supports the page

Avoid:

- decorative motion
- floaty consumer-app transitions
- strong scale animations

## Implementation Design

### Styling Strategy

Keep implementation focused and low-risk by layering the redesign on top of the
existing frontend structure.

Recommended implementation split:

1. introduce or revise global design tokens in `web/src/styles.css`
2. update application shell styling in `web/src/App.tsx` and shared page-level
   classes
3. restyle major surfaces on:
   - `web/src/pages/GraphManagePage.tsx`
   - `web/src/pages/ModelConfigPage.tsx`
   - `web/src/pages/QueryPage.tsx`
4. restyle high-value shared components such as:
   - `web/src/components/BuildStatusCard.tsx`
   - `web/src/components/GraphPreview.tsx`
   - `web/src/components/GraphTable.tsx`
   - `web/src/components/TextUnitList.tsx`
   - `web/src/components/UploadPanel.tsx`

This keeps the work scoped to visual language while preserving the current
routing, APIs, and component boundaries.

### Token Scope

Global styles should define:

- background layers
- panel backgrounds
- border colors
- text hierarchy colors
- accent colors and focus ring colors
- radius scale
- surface shadow scale

Component styles should consume those values instead of introducing unrelated
one-off colors.

## Testing Strategy

### Frontend Source Assertions

Update `tests/unit/web/test_frontend_scaffold.py` to cover:

- the presence of the revised cool-toned shell styles
- the presence of graph-analysis-oriented visual classes where relevant
- the absence of old warm-gradient assumptions that no longer reflect the chosen
  direction

The test style should remain consistent with the current lightweight
source-assertion approach in this repo.

### Build Verification

Run the frontend build after styling changes:

- `cmd /c npm.cmd run build`

This verifies:

- TypeScript still compiles
- style changes do not break Vite production build
- any page/component refactors still bundle correctly

### Visual Sanity Check

Manually inspect at least:

- graph management page
- create-graph modal
- model config page
- query page

Check both desktop and narrow-width behavior.

## Non-Goals

This redesign does not include:

- route changes
- workflow changes
- page layout rewrites that alter information architecture
- new navigation concepts
- backend or API changes
- dark mode
- animation-heavy branding

## Risks

- if the accent color is overused, the UI may drift back toward generic SaaS
  rather than graph analysis tooling
- if graph-aware surfaces are too decorative, the page may look like a concept
  mockup rather than a working product
- if the cool glass treatment is overdone, readability may suffer on dense data
  panels
- if hero and panel hierarchy are not carefully balanced, secondary pages may
  inherit too much visual weight

## Acceptance Criteria

The redesign is successful when:

- the app no longer reads as a warm or template-like admin dashboard
- the product feels closer to a knowledge-graph analysis console
- the graph management page has stronger visual identity without changing its
  workflow structure
- the create-graph modal feels like a graph configuration surface
- the query and model pages inherit the same visual system without feeling
  overdesigned
- accent color is restrained, cool, and graph-appropriate
- the build passes and responsive behavior remains intact
