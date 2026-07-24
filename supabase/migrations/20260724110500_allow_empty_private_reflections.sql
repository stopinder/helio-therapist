-- A reflection can be intentionally started before meaningful content is written.
alter table public.private_reflections drop constraint if exists private_reflections_body_check;
alter table public.private_reflections add constraint private_reflections_body_check
  check (char_length(body) <= 20000);
