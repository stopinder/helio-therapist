# Spacing

## Decision

Helio uses one semantic spacing scale. CSS variables in `src/main.css` are the source of truth; matching Tailwind aliases keep templates readable (`p-page`, `gap-stack-md`, `px-inline-md`, and so on).

| Role | Value | Use |
| --- | ---: | --- |
| `inline-xs/sm/md/lg` | 4 / 8 / 12 / 16px | Horizontal control and row relationships |
| `stack-xs/sm/md/lg` | 4 / 8 / 12 / 16px | Tight vertical relationships and compact components |
| `stack-xl/2xl` | 24 / 32px | Card groups and breathing room |
| `section` | 40px | Major page sections |
| `page` | 16px small screens; 32px desktop | Outer workspace padding |

## Rules

- Keep related elements closer together than distinct sections.
- Standard cards use 24px internal padding; operational cards and navigation use 16px.
- List rows use 8–12px vertical padding and borders before background cards.
- Forms use an 8px label-to-field gap, 20px field gap, and 24px action spacing.
- Do not add arbitrary Tailwind spacing values unless a component’s geometry requires it and the exception is documented here.

## Deliberate exceptions

- Calendar month and week grids retain tighter cell spacing because their job is schedule scanning, not long-form reading.
- Floating event popovers use positional pixel values for collision avoidance; this is geometry rather than layout rhythm.
- Existing specialist clinical tools will adopt the scale when they are next revised; the active daily workspace, Inbox, directory, sidebar, and client drawer are migrated now.

## Implementation status

The source variables, Tailwind aliases, structural guardrail test, and priority-surface migration are implemented. No workflow behaviour changes are part of this decision.
