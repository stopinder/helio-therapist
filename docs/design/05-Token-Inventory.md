# Token Inventory and Component Catalogue

## Source of truth

`src/main.css` owns the CSS variables. `tailwind.config.js` exposes their semantic aliases for Vue templates. Neither layer may define a competing literal value.

| Family | Roles |
| --- | --- |
| Type | `display`, `h1`, `h2`, `h3`, `body`, `body-long`, `body-sm`, `caption`, `overline` |
| Text | `ink`, `ink-secondary`, `ink-muted`, `ink-subtle`, `on-action` |
| Actions | `action-primary`, `action-primary-hover`, `action-link`, `action-link-hover` |
| Surfaces | `surface-canvas`, `surface`, `surface-muted`, `surface-subtle`, `surface-elevated`, `surface-overlay`, `sidebar`, `reflection` |
| Boundaries and shape | `border`, `border-muted`, `border-strong`, `radius-control`, `radius-panel`, `radius-pill` |
| State | hover, active, selected, focus, disabled, loading, success, warning, danger, recording, AI working |
| Spacing | inline xs–lg; stack xs–2xl; section; page |
| Motion and elevation | fast, standard, slow; elevated and overlay shadows |

## Approved reusable primitives

| Primitive | Use |
| --- | --- |
| `type-*` | All type hierarchy and weights |
| `page-layout`, `page-section` | Page canvas and major sections |
| `card-standard`, `card-compact`, `surface-card`, `surface-panel` | Stable contained regions |
| `control-field`, `control-surface` | Inputs and compact controls |
| `button-primary`, `button-secondary` | Standard actions; retain native semantics and labels |
| `dialog-surface` | Dialogs and temporary overlays |
| `interaction-control`, `interaction-row`, `state-selected` | Shared interaction feedback |
| `empty-state-standard` | Empty-state alignment and spacing |

Use a component primitive when it matches. Compose semantic Tailwind roles only where the primitive cannot express a real structural difference.

## Documented exceptions

- Calendar grids, chart/canvas nodes, SVG relationship maps, and popover collision handling use local dimensional values because they express data geometry, not visual rhythm.
- Brand marks and third-party service logos retain their supplied SVG fills.
- The reflective map node palette remains data-category encoding. It is isolated from the application surface and interaction system.
- Responsive drawer widths and preview-frame heights are content constraints, not spacing tokens.
