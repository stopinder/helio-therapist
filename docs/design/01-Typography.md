# Typography

## Decision

Inter is Helio's sole typeface. It is loaded in `src/main.css` and configured as the Tailwind sans family.

The system uses contrast, spacing, and a small weight range to establish hierarchy. It does not introduce decorative fonts, colour-coded text hierarchy, or one-off font sizes.

## Semantic roles

| Role | Tailwind size token | Weight | Intended use |
| --- | --- | --- | --- |
| Display | `text-display` | 700 | Rare, high-level product moments only |
| H1 | `text-h1` | 700 | Workspace/page title |
| H2 | `text-h2` | 600 | Major section heading |
| H3 | `text-h3` | 600 | Card and sub-section heading |
| Body | `text-body` | 400 | Default interface copy: 15px / 24px |
| Long-form body | `text-body-long` | 400 | Clinical notes, transcript excerpts, and other reading: 16px / 28px |
| Body small | `text-body-sm` | 400 | Supporting interface copy |
| Caption | `text-caption` | 500 | Compact metadata and controls |
| Overline | `text-overline` | 600 | Short uppercase labels only |

Use the corresponding `type-*` class (for example, `type-h2` or `type-body`) in templates. The class includes the semantic weight so components do not choose their own type styling.

## Constraints

- Allowed weights are 400, 500, 600, and 700 only.
- Default body copy is 15px with generous 24px line height.
- Use the long-form role for clinical reading and writing; it is intentionally 16px with 28px line height.
- Do not use `text-[...]`, `text-sm`, `text-base`, or ad-hoc `font-size` declarations in new or refactored interface work.
- Do not add colours solely to create hierarchy. Use the semantic role and appropriate contrast from the existing colour system.

## Implementation status

The semantic Tailwind scale and global `type-*` classes are established. The active Today, client workspace, calendar, Inbox, client directory, and settings surfaces are being migrated first; older specialist tools should adopt the same roles whenever they are touched.
