# Surfaces, Borders, and Elevation

## Decision

Helio uses a restrained layer hierarchy. The page canvas carries most of the interface; surfaces are introduced only when they clarify a working region, interaction, or temporary layer. CSS variables in `src/main.css` are the source of truth, with matching Tailwind aliases for templates.

| Role | Value | Use |
| --- | --- | --- |
| `surface-canvas` | `#f4f5f3` | Application background and space between sections |
| `surface` | `#fbfbfa` | Meaningful working panels and contained clinical content |
| `surface-muted` | `#f1f2ef` | Toolbars, grouped metadata, and quieter context |
| `surface-subtle` | `#f7f7f5` | Hover and selected-region backgrounds |
| `surface-elevated` | `#ffffff` | Inputs, menus, and compact transient panels |
| `surface-overlay` | `#ffffff` | Drawers and modal content |

| Boundary | Value | Use |
| --- | --- | --- |
| `border` | `#d9ddd8` | Inputs, drawer edges, and stable panel boundaries |
| `border-muted` | `#e7e9e5` | Internal row separators and quiet dividers |
| `border-strong` | `#bcc3bc` | Hovered controls and selected outlined controls only |

`shadow-elevated` is reserved for menus and popovers. `shadow-overlay` is reserved for drawers and dialogs. Stable cards, timelines, navigation, calendar columns, and page sections have no shadow.

## Usage rules

- Use `bg-surface-canvas` for the workspace canvas; do not recreate it with one-off greys.
- A standard card is `bg-surface border border-border-muted rounded-lg`, with no shadow.
- Operational lists use a single surface and muted row separators. Individual rows are not separate cards.
- Use `bg-surface-subtle` for hover or selection, paired with text weight, an accent marker, or keyboard focus—not colour alone.
- Inputs retain a defined border and use the visible blue focus ring. Muted or disabled surfaces never replace a clear label or state.
- Drawers and dialogs use one overlay boundary plus `shadow-overlay`; do not layer a heavy border, nested card, and heavy shadow together.

## Migration status and exceptions

The application shell, Today, calendar controls and popovers, Inbox queue, client directory, client record, timeline, and client context drawer use the semantic system. Existing specialist clinical tools retain legacy local styles until their next focused revision; this avoids a cosmetic-only rewrite of active tooling.

Calendar cells remain dense for scanning. Event colour and status accents are preserved for scheduling meaning, but the grid surfaces and separators now use the common hierarchy. Positioning values in event popovers remain geometric exceptions rather than layout tokens.
