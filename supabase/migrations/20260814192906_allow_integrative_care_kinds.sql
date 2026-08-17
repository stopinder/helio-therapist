alter table public.client_care_items
  drop constraint if exists client_care_items_kind_check;

alter table public.client_care_items
  add constraint client_care_items_kind_check
  check (
    kind in (
      'current_focus',
      'shared_understanding',
      'trying',
      'change_noticed',
      'learning',
      'narrative',
      'themes',
      'interventions',
      'outcomes'
    )
  );
