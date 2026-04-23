# UI/UX Refactor Plan: GraphRAG Workbench (Pro Max)

## Objective
Refactor the UI/UX of the GraphRAG web application to align with the `ui-ux-pro-max` professional standards. This includes updating the color palette, layout, and component styling for a more analytical and premium feel.

## Key Files & Context
- `src/styles.css`: Global design system and variable definitions.
- `src/App.tsx`: Main layout structure (Header/Content).
- `src/pages/GraphManagePage.tsx`: Core workspace layout.
- `src/components/*.tsx`: Individual UI components (BuildStatus, Upload, etc.).

## Implementation Steps

### Phase 1: CSS Design System Overhaul (`src/styles.css`)
- **Color Palette**: 
    - Use Slate-900 for text, Slate-500 for muted text.
    - Use Indigo-600 as the primary brand color.
    - Neutral backgrounds: Slate-50 and pure white.
- **Effects**:
    - Update `analysis-panel` to use `backdrop-filter: blur(12px)`.
    - Reduce border radius from 24px to 12px for better "analytical" alignment.
    - Replace heavy shadows with a subtler `0 4px 6px -1px rgb(0 0 0 / 0.1)`.
- **Transitions**: Add global `transition: all 0.2s ease-in-out` for hoverable elements.

### Phase 2: Layout & Navigation (`src/App.tsx`)
- **Floating Header**: 
    - Detach the header from the edges (add `top: 1rem`, `margin: 0 1.5rem`).
    - Add rounded corners and glass effect to the header.
    - Shrink the brand title to make more room for content.
- **Content Padding**: Adjust to account for the floating header.

### Phase 3: Page & Component Refinement
- **GraphManagePage.tsx**:
    - Refine the 2-column grid spacing.
    - Update the sidebar "Selected" state with a clean Indigo border-left.
- **BuildStatusCard.tsx**:
    - Slim down the progress bar.
    - Organize descriptions into a more readable grid.
- **UploadPanel.tsx**:
    - Redesign the Dragger with a subtler dashed border and AntD icons.
- **GraphPreview.tsx**:
    - Update ECharts theme to match the new Slate/Indigo palette.

### Phase 4: Micro-Interactions & Accessibility
- Add `cursor: pointer` to all interactive cards.
- Ensure all states (Building, Failed, Ready) have distinct, high-contrast tag colors.
- Verify light mode contrast ratios meet WCAG AA standards.

## Verification & Testing
- **Visual Check**: Cross-reference with the `ui-ux-pro-max` checklist.
- **Responsive Test**: Verify layout at 375px (mobile), 1024px (tablet), and 1440px (desktop).
- **Interactive Check**: Verify hover states and transitions on all buttons and cards.
- **Build Flow**: Ensure the UI correctly reflects real-time build progress and errors.
