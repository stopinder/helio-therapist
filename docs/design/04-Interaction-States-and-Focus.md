# Interaction States and Focus

## Decision

Helio has one quiet interaction language. The source of truth is the semantic state and motion token layer in `src/main.css`, exposed through Tailwind as `state-*` colours and `duration-fast`, `duration-standard`, and `duration-slow` aliases. Components must not introduce their own focus blue, hover grey, status colour, or transition duration.

| Token | Role |
| --- | --- |
| `state-hover` | Pointer hover on an available control or row |
| `state-active` | Pressed control |
| `state-selected` | Current navigation, selected day, row, or event |
| `state-focus-ring` | Keyboard-only focus ring |
| `state-disabled` | Unavailable control, always paired with disabled semantics |
| `state-loading` | Quiet spinner, skeleton, or progress label |
| `state-success` / `state-warning` / `state-danger` | Validation and outcome states; always paired with text or an icon |
| `state-recording` | Active dictation only |
| `state-ai-working` | Contextual AI processing only; never a page-level dominant treatment |

## Interaction rules

- Buttons use the same progression: default → hover → pressed → keyboard focus → disabled/loading. Loading retains the button label or adds explicit progress text; it does not substitute an unrelated animation.
- Navigation, list rows, calendar cells, and timeline rows use `state-hover` for availability and `state-selected` for their current item. Selection is also communicated by text weight, an accent marker, or an `aria-current`/selected state.
- Inputs retain their label. Validation is conveyed by explanatory text or icon as well as semantic colour. Readonly controls remain readable and do not impersonate disabled controls.
- Drawers and dialogs use the established overlay surface. They open and close with restrained opacity/position transitions, restore focus to the invoking control, and trap keyboard focus while open. The therapist client-context and AI drawers now use the shared `useFocusTrap` helper; other legacy modal components are migrated to it when their behaviour is next touched, with no workflow change in this sprint.
- Empty states use the same contained icon, title, supporting copy, then one optional action. Loading uses a single quiet spinner/skeleton language rather than decorative motion.

## Focus and motion

All native interactive controls share a 2px `state-focus-ring` with a 2px offset through `:focus-visible`; browser defaults are not relied on. It appears for keyboard navigation and does not flash after ordinary mouse clicks. Focus order follows the DOM and actions retain accessible names.

Motion is limited to 100ms, 150ms, or 200ms with `ease-out`. There is no bounce, scale, or playful easing. `prefers-reduced-motion: reduce` reduces animation and transition duration to effectively none.

## Current migration scope and exceptions

The global focus, disabled, reduced-motion, interaction-control, interaction-row, selection, status, recording, AI-working, and empty-state primitives apply throughout Helio. The therapist shell’s top-bar controls and Today’s later-appointment rows now consume the shared primitives directly.

Legacy specialist clinical tools still contain local component styling. The global focus, reduced-motion, disabled, and state-token rules protect them now; their local hover rules will be replaced only during focused work on those tools, avoiding a cosmetic rewrite of live clinical workflows.
