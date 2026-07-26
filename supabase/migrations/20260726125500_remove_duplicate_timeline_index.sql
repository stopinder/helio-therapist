-- The clinical exchange migration already created the equivalent
-- client_timeline_events_client_time_idx index.
drop index if exists public.client_timeline_events_client_occurred_idx;
