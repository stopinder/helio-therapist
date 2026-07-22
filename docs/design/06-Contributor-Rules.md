# Contributor Rules and Migration Guidance

## Rules

1. Start with a semantic token or approved primitive. Do not add literal colour, shadow, radius, opacity, duration, easing, or arbitrary Tailwind value for ordinary interface styling.
2. Use `type-*` roles; never introduce a new interface font size or weight to solve hierarchy.
3. Use the semantic spacing scale. Keep data geometry separate from layout rhythm.
4. Focus is provided globally with `:focus-visible`. Do not add a competing focus ring.
5. Pair success, warning, danger, and AI states with readable text or an icon; colour alone is insufficient.
6. Stable workspace surfaces do not gain shadow. Use elevation only for menus, popovers, drawers, and dialogs.
7. Prefer one shared component variant over duplicating a local button, input, empty state, or row recipe.

## Migration checklist

- Replace literal visual utilities with the closest semantic alias.
- Replace repeated local control recipes with an approved primitive where the behaviour is standard.
- Preserve labels, data handling, navigation, and workflow behaviour.
- Add a narrow guardrail test if a new token family or reusable primitive is introduced.
- Record any genuine exception in `05-Token-Inventory.md`, including why a token cannot represent it.
- Run `npm test` and `npm run build`; never commit `dist`.
