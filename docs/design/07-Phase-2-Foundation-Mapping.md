# Phase 2 Foundation Mapping

Status: implementation mapping for PR #62. This is not the final brand specification and must not be copied to Notion until visual review confirms the canonical tokens.

## Shell ownership

Repository evidence establishes `src/layouts/AppShell.vue` as the canonical authenticated application shell:

- `src/main.js` mounts `AuthGate.vue`.
- `AuthGate.vue` renders `AppShell` for authenticated sessions and places `router-view` inside it.
- `src/router/index.js` owns the current application route tree.
- `src/App.vue` is not mounted by the application entry point.
- `src/components/tools/LeftSidebar.vue` is referenced by the unmounted `src/App.vue` path.

Therefore `App.vue` / `LeftSidebar.vue` are treated as legacy shell code. This phase does not restyle, delete, or extend that legacy path.

## Existing token mapping

| Existing token / alias | Current role | Intended semantic role | Action | Current consumers |
| --- | --- | --- | --- | --- |
| `--surface-canvas` / `surface-canvas` | App background | Application canvas | Keep | AppShell, pages |
| `--surface-sidebar` / `sidebar` | Sidebar background | Navigation surface | Keep | AppShell |
| `--surface`, `--surface-subtle`, `--surface-muted` | Base/quiet fills | Base, subtle and muted surfaces | Keep | Shell and feature components |
| `--surface-elevated`, `--surface-overlay` | Raised/overlay fills | Raised surface and overlay surface | Keep | Cards, dialogs, auth |
| `--text-primary` / `ink` | Primary text | Primary text | Keep | Global |
| `--text-secondary` / `ink-secondary` | Secondary text | Secondary text | Keep | Global |
| `--text-muted`, `--text-subtle` | Low-emphasis text | Muted and subtle metadata | Keep | Global |
| `--text-on-action` / `on-action` | Text on strong controls | On-accent text | Keep | Buttons, account avatar |
| `--action-primary`, `--action-primary-hover` | Primary action | Accent and accent-hover | Keep; expose `accent` aliases | Buttons, navigation state |
| `--action-link`, `--action-link-hover` | Text links | Link interaction role | Keep | Links |
| `--border`, `--border-muted`, `--border-strong` | Boundaries | Standard, quiet and strong boundaries | Keep | Global |
| `--state-success`, `--state-warning`, `--state-danger` | State foregrounds | Semantic status foregrounds | Keep | Status/validation |
| `--state-*-surface` | State fills | Semantic status surfaces | Keep | Auth/validation |
| `--state-focus-ring` | Focus outline | Focus-visible ring | Keep | Global focus rule |
| `--state-hover`, `--state-active`, `--state-selected` | Interaction fills | Shared interaction states | Keep | Navigation/controls |
| `--state-disabled` | Disabled foreground | Disabled text/border role | Keep; stop relying on opacity alone | Controls |
| `--radius-control`, `--radius-panel`, `--radius-pill` | Shape scale | Control, panel and pill radii | Keep | Global |
| `--shadow-elevated`, `--shadow-overlay` | Elevation | Restrained raised/overlay elevation | Keep | Cards/dialogs |
| `--space-inline-*`, `--space-stack-*`, `--space-section`, `--space-page` | Spacing rhythm | Inline, stack, section and page spacing | Keep | Global |
| Tailwind `display`, `h1`, `h2`, `h3` | Mixed typography hierarchy | Explicit greeting/page/section roles | Alias/deprecate generic role use in new primitives | Existing templates |
| `type-display`, `type-h1`, `type-h2`, `type-h3` | Mixed font-family decisions | `type-greeting`, `type-page-title`, `type-section-title` | Add explicit roles; retain old classes temporarily as compatibility aliases | Existing templates |
| `body`, `body-sm`, `caption`, `overline` | Body/metadata hierarchy | Body, UI/control, metadata, eyebrow | Keep and expose explicit role classes | Existing templates |
| `--brand-amber`, `--brand-amber-soft`, `--brand-sage-soft` | Brand/supporting accents | Brand mark/supporting decorative surfaces only | Keep | Brand lockup/reference surfaces |
| reflection-specific tokens | Reflection workflow semantics | Feature-specific semantic exception | Keep | Reflection/supervision surfaces |

## Typography contract for Phase 2

- Greeting/display: Newsreader, exceptional orientation role only.
- Page title: Inter, strong operational page orientation.
- Section title: Newsreader only where the reference uses editorial section hierarchy; feature code consumes the semantic role rather than selecting the family.
- Body: Inter, default application copy.
- UI/control: Inter, compact functional labels and controls.
- Metadata: Inter, secondary compact information.
- Eyebrow: Inter, uppercase orientation/date labels.

Existing generic `type-h1` / `type-h2` / `type-h3` remain available for untouched legacy screens during migration, but new/refactored Overview code must consume the explicit semantic roles.

## Phase boundary

This phase creates the shared foundation and migrates Overview only. Calendar, Clients, Inbox, Timeline, Sessions, supervision/CPD and client-context surfaces remain visually unchanged until reviewed migration phases.