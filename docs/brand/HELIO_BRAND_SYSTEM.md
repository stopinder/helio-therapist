# Helio Brand & Interface System

Status: canonical implementation reference for the current design pass. Visual changes remain subject to product review before merge.

## Brand direction
Helio is a calm, professional clinical workspace. Warmth should reduce institutional harshness without making the product feel like wellness, lifestyle, publishing, or sales software. Clinical clarity and operational legibility outrank decoration.

The approved Overview is the visual reference. It is a reference for the system, not a licence to reproduce its appointment-card treatment on every feature.

## Architecture
`src/layouts/AppShell.vue` is the canonical authenticated shell. The old `App.vue` / `LeftSidebar.vue` path is legacy and must not develop a second visual system.

Sidebar information architecture:
- Practice: Overview, Calendar, Clients
- Records: Transcripts, Documents
- Professional: CPD
- compact account control

Selected navigation uses the quiet selected state: soft sage surface, accent icon, strong primary text. Selection is not indicated by a strong green outline; `focus-visible` is a separate keyboard state.

## Semantic source of truth
CSS custom properties in `src/main.css` are the semantic source of truth. Tailwind aliases in `tailwind.config.js` expose them to components. Do not scatter replacement hex/rgb values or arbitrary radii/shadows through application components.

### Typography
- UI/body family: Inter
- Editorial/display family: Newsreader
- `type-greeting`: exceptional orientation/personal greeting role; Newsreader, upright, restrained. Current size 2rem, 2.35rem at md+, line-height 1.12, tracking -0.025em.
- `type-page-title`: operational page title; Inter 2rem / 2.35rem, weight 600, tracking -0.025em.
- `type-section-title`: section orientation; Newsreader 1.45rem, weight 600, tracking -0.015em. Use deliberately, not as a generic operational label.
- `type-subsection`: Inter 1.0625rem / 1.5rem, weight 600.
- `type-body`: Inter .9375rem / 1.55rem.
- `type-body-long`: Inter 1rem / 1.8rem.
- `type-ui`: Inter .8125rem / 1.3rem, weight 500.
- `type-metadata`: Inter .75rem / 1.05rem, weight 500.
- `type-eyebrow`: Inter .6875rem / 1rem, weight 600, uppercase, tracking .13em.

Rule: operational pages such as Clients, Calendar and Transcripts do not independently select serif/sans. Display serif is reserved for orientation moments such as the Overview greeting and the shared greeting treatment on CPD.

Legacy `type-h*`, `type-caption`, `type-overline` aliases remain compatibility shims during migration; new/refactored application UI should use semantic roles.

### Surfaces and colour roles
Current semantic tokens:
- application canvas `--surface-canvas` #f3eee5
- base surface `--surface` #faf6ef
- muted `--surface-muted` #ebe4d9
- subtle `--surface-subtle` #f6f0e7
- raised `--surface-elevated` #fffaf3
- overlay `--surface-overlay` #fffbf5
- sidebar `--surface-sidebar` #f8f3ea
- primary text `--text-primary` #242722
- secondary text `--text-secondary` #4c5049
- muted text `--text-muted` #716f66
- subtle text `--text-subtle` #938d82
- primary accent/action `--action-primary` #587765
- primary hover `--action-primary-hover` #466453
- link `--action-link` #4f705e
- link hover `--action-link-hover` #385846
- border `--border` #d6ccbd
- muted border `--border-muted` #e4dbcf
- strong border `--border-strong` #b8ad9e
- selected surface `--state-selected` #dde6dc
- focus ring `--state-focus-ring` #3f6a55
- success `--state-success` #47725c
- warning `--state-warning` #9a681f
- danger `--state-danger` #a34a43
- brand amber `--brand-amber` #c88a27

Amber is an identity accent, not a general interaction colour. Sage is the primary interaction/state family.

### Shape and elevation
- control radius: .75rem
- panel radius: 1rem
- pill: full radius
- minimum practical control target: 2.75rem
- `shadow-elevated`: restrained raised-surface shadow
- `shadow-overlay`: reserved for menus/dialog overlays

Do not make all feature structures look like Overview cards. Calendar remains a time grid, Clients a directory, Transcripts a queue, Documents a library/workspace.

### Spacing
Use the semantic inline/stack/page tokens in `main.css` and Tailwind aliases. Page padding grows from 1.25rem to 2.5rem and 3.25rem at larger breakpoints. Do not create feature-specific spacing scales to solve ordinary layout.

## Shared primitives
Canonical initial primitives in `src/components/ui`:
- `PageHeader`: operational page orientation; `type-page-title`.
- `GreetingHeader`: optional eyebrow + dynamic phrase + dynamic display name + supporting information; `type-greeting`.
- `SectionHeader`: section orientation with optional eyebrow/action.
- `AppButton`: primary/secondary action variants with shared target size.
- `SurfaceCard`: raised/base/muted semantic surfaces.
- `FormControl`: shared label/control/help/error contract and canonical control field.
- `StatusIndicator`: neutral/success/warning/danger text + dot; state is communicated with text, not colour alone.

Do not abstract ordinary flex/grid page layout merely to remove Tailwind classes. Centralise brand and interaction decisions, not every composition.

## Greeting contract
`src/composables/useGreeting.js` owns the application-level time-dependent greeting rule:
- before 12:00: Good morning
- before 18:00: Good afternoon
- otherwise: Good evening

Keep date/eyebrow, greeting phrase, therapist display name, and supporting daily information separate. Visual components do not own time-of-day logic. Therapist identity comes from application/user data via the identity composable. Do not hard-code a therapist name.

## Action hierarchy
Reusable rule:
- contextual page action = primary action for the current workspace
- persistent/global action = remains available but becomes visually secondary when a contextual primary exists

Example: Clients `Add Client` is primary; global `Schedule appointment` remains available but does not compete at equal hierarchy. Use shared button variants, never page-specific colours.

## Accessibility contract
- `focus-visible` uses the shared focus ring and is visually distinct from selected state.
- Native controls retain native keyboard semantics.
- Practical interactive target minimum is 2.75rem.
- Disabled controls receive explicit disabled foreground/background/border treatment, not opacity alone.
- Status includes textual meaning, not colour alone.
- Hover is never the sole indication of an interactive control.
- Reduced-motion preference collapses animation/transition duration.

## Screen-specific decisions
### Overview
Approved orientation reference. Warm, restrained, personal. Display greeting is exceptional. Do not export its card density or serif hierarchy indiscriminately to operational screens.

### Clients
Operational directory. Inter operational typography. Search is dominant over the Active/Archived/All segmented filter (approximately 60/40 on desktop). Add Client is contextual primary. Rows are keyboard-operable client-open targets with a restrained chevron. Under Active or Archived, repeated identical row status is omitted; under All, status is shown with `StatusIndicator`.

### Transcripts
Work queue/triage: review incoming source material and decide what needs to happen next. `Needs attention · n` carries queue count; do not duplicate it as a dashboard metric. Search is utility-level. Preserve workflow-specific actions such as Link session and Review transcript; next action should outrank passive status. Do not rename Transcripts / Zoom imports / Transcript Inbox without product approval.

### Calendar
Spatial time grid. Preserve Google Calendar integration, event fetching, sync, scheduling, event timing, initial scroll, date calculations, navigation and Day/Week/Month behaviour. Shared system adoption is presentational only. Grid stays restrained: no decorative cardification, display serif, or excessive shadows/colour.

### CPD / Professional Development
Preserve approved card composition and CPD functionality. Workspace orientation precedes the personal greeting. Greeting consumes the same central greeting contract as Overview and uses upright display serif; no CPD-specific italic/oversized treatment. Decorative `WORKSPACE` badge was removed because it did not represent a product state.

### Documents
Global Documents is a practice document workspace/search surface, not the canonical filing cabinet for every client's retained history.
- Practice Documents: operational/professional documents belonging to the practice.
- Practice Resources: reusable outward-facing material not tied to a client. This is the user-facing term for the existing internal `prospect` scope; do not expose sales/marketing terminology.
- Client Documents: canonical archive lives with the client record. Global Documents may surface matching client documents through explicit search rather than expanding every client by default.
- Archiving a client never deletes retained documents. Archived-client records remain intact and retrievable through the client record/archive lifecycle.

The internal database scope may remain `prospect`; changing persistence terminology is not required for a UI naming decision.

## Handoff / change protocol
Before changing Helio UI:
1. Identify whether the change is a brand decision, shared primitive change, or legitimate feature layout.
2. Reuse semantic tokens and shared primitives before adding values.
3. If a semantic role is missing, add it centrally in CSS variables and expose a Tailwind alias where useful.
4. Do not change a shared primitive to solve one screen without checking its current consumers.
5. Preserve feature-specific structures and behaviour unless product explicitly requests structural change.
6. Compare orientation surfaces against Overview, operational screens against Clients/Calendar/Transcripts, and reflective CPD against its approved hierarchy.
7. Check selected vs focus states, keyboard operation, target sizes, contrast, status semantics and reduced motion.
8. Visually review the implementation before declaring a brand change canonical.
9. Update this specification when a reviewed decision changes; do not allow implementation and documentation to drift.

## Known migration debt / intentional exceptions
- Legacy `App.vue` / `LeftSidebar.vue` shell remains in repository but is not canonical.
- Compatibility typography aliases remain until remaining feature pages are migrated.
- Some existing feature/document-print surfaces still contain local/arbitrary values; do not treat those as brand precedent.
- Printed/exported professional documents are a separate output-design surface from the Helio application shell and require their own deliberate review before token migration.
- CPD, Documents, client records and session workspaces should only be migrated/reviewed explicitly; do not opportunistically restyle them.
