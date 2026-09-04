# Midnight Meridian

Status: approved visual direction for the `design/living-botanical` exploration branch and PR #204.

## Intent

Midnight Meridian is a spacious, low-glare clinical workspace organized around one calm point in time. It replaces the abandoned botanical metaphor while retaining the approved structural jump away from a conventional SaaS dashboard.

The first implementation slice covers the authenticated application shell and Overview/Today only. It does not change Supabase, authentication, integrations, session creation, business rules, or Clinical Record behavior.

## Composition

### Bound index navigation

The authenticated shell uses a midnight rail. Destinations are ordered with restrained numeric indices. The selected destination crosses the rail into the workspace using a steel-blue tab and a narrow amber binding edge.

On mobile, the same grammar becomes a bottom index for Today, Calendar, Clients, and More. The existing drawer remains available for the full destination set and account actions.

### Midnight orientation plane

Today begins with one large midnight-blue field containing the date, greeting, daily session count, and draft count. Sparse meridian geometry provides orientation without decorative imagery.

### Smoked time aperture

The next appointment is the sole dominant focal object. A smoked steel-blue circular aperture overlaps the orientation plane and clinical folio. It contains:

- next-session time;
- client display name;
- session type and duration;
- textual readiness/status information;
- relative start time;
- one anchored Clinical Workspace action when the appointment is eligible.

The action has a solid midnight registration edge and compresses visibly when pressed. Amber is limited to the aperture arc, status signal, active binding edge, and keyboard focus.

### Continuous clinical folio

Appointments are not rendered as independent cards. They align to one ruled timeline with columns for time, session, status, context, and action. The current focal appointment receives a pale slate field and amber binding strip without elevation.

### Attached work

Pending notes and supervision preparation attach to the right edge of the folio as index tabs. They do not form a competing dashboard column.

## Colour roles

- deep midnight `#091522`: navigation binding and physical registration edge;
- midnight `#102235`: orientation and primary action;
- steel blue `#294761`: selected navigation, focal aperture, and secondary structure;
- pale slate `#C7D0D9`: attached supporting work;
- cloud `#DCE3E9`: sustained application canvas;
- frost `#F7F9FA`: raised reading surface;
- warm signal `#C89B68`: tightly rationed active, readiness, and focus indication;
- primary ink `#182431`: sustained clinical reading.

Large warm or high-chroma fields are not part of this direction.

## Interaction and accessibility

- practical interactive target minimum remains 2.75rem;
- status retains text and is never colour-only;
- focus is a three-pixel shared outline, distinct from selected state;
- hover is supplemental, not the sole interaction indicator;
- reduced-motion preference removes positional movement;
- dense clinical content remains on pale neutral/slate surfaces;
- the next-session focal action is not duplicated in the schedule row.

## Verification

The smallest baseline is the `Overview view requirements` Node test. The focused implementation tests cover the Overview contract, shell navigation, scroll behavior, appointment clock, and Midnight Meridian composition.

The smallest browser acceptance is the Overview case in `e2e/calendar-session-start.spec.js`, which verifies real session creation/resumption and navigation into the existing session workspace.
