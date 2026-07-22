# Helio Design System

This folder is the design home for Helio in Obsidian. It keeps design decisions, reusable assets, and references alongside the code that implements them.

## Structure

- `01-Typography.md` — the active typography system and implementation rules.
- `02-Spacing.md` — the active spacing scale, usage rules, and documented exceptions.
- `03-Surfaces-and-Elevation.md` — surface, border, and elevation hierarchy.
- `04-Interaction-States-and-Focus.md` — shared state language, focus, motion, loading, validation, and accessibility rules.
- `05-Token-Inventory.md` — the complete token inventory and approved component primitives.
- `06-Contributor-Rules.md` — contribution, migration, and exception rules for application code.
- `assets/` — source design assets: logos, approved illustrations, exports, and reference images. Use descriptive filenames and retain source files where possible.
- Future decisions belong in this folder as short, dated Markdown notes, for example `02-Colour-and-Contrast.md` or `03-Component-Principles.md`.

## Working rule

This is a design record, not a second specification. A decision is only marked implemented when the related source change exists and has been verified.

## v1.0 baseline

The semantic token layer in `src/main.css` is the single source of truth for Helio's visual decisions. Tailwind exposes those roles, and shared component primitives express the common patterns. New visual literals, one-off utility values, and component-specific focus treatments are not permitted without a documented exception.
