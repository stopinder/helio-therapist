-- PostgreSQL 17 behavioural regression tests (synthetic data, no production users).
DO $$
DECLARE
  free_owner uuid := '00000000-0000-4000-8000-000000000001';
  legacy_owner uuid := '00000000-0000-4000-8000-000000000002';
  paid_owner uuid := '00000000-0000-4000-8000-000000000003';
  race_owner uuid := '00000000-0000-4000-8000-000000000004';
  constraint_found text;
  n integer;
BEGIN
  FOR n IN 1..5 LOOP
    INSERT INTO public.clients(user_id,display_name) VALUES(free_owner, 'free-' || n);
  END LOOP;

  BEGIN
    INSERT INTO public.clients(user_id,display_name) VALUES(free_owner, 'free-sixth');
    RAISE EXCEPTION 'sixth Free client unexpectedly inserted';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS constraint_found = CONSTRAINT_NAME;
    IF constraint_found <> 'free_active_client_limit' THEN
      RAISE EXCEPTION 'wrong quota constraint: %', constraint_found;
    END IF;
  END;

  UPDATE public.clients SET display_name='free-edited'
    WHERE user_id=free_owner AND display_name='free-2';
  UPDATE public.clients SET archived=true
    WHERE user_id=free_owner AND display_name='free-1';
  INSERT INTO public.clients(user_id,display_name) VALUES(free_owner,'replacement-fifth');

  BEGIN
    UPDATE public.clients SET archived=false
      WHERE user_id=free_owner AND display_name='free-1';
    RAISE EXCEPTION 'unarchive unexpectedly exceeded Free quota';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS constraint_found = CONSTRAINT_NAME;
    IF constraint_found <> 'free_active_client_limit' THEN
      RAISE EXCEPTION 'wrong unarchive constraint';
    END IF;
  END;

  INSERT INTO public.clients(user_id,display_name,archived)
    VALUES(free_owner,'archived-new',true);
  BEGIN
    UPDATE public.clients SET archived=false
      WHERE user_id=free_owner AND display_name='archived-new';
    RAISE EXCEPTION 'archived-new unexpectedly reactivated';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO public.clients(user_id,display_name) VALUES(paid_owner,'movable');
  BEGIN
    UPDATE public.clients SET user_id=free_owner
      WHERE user_id=paid_owner AND display_name='movable';
    RAISE EXCEPTION 'owner reassignment bypassed Free quota';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  FOR n IN 1..7 LOOP
    INSERT INTO public.clients(user_id,display_name) VALUES(legacy_owner, 'legacy-' || n);
    INSERT INTO public.clients(user_id,display_name) VALUES(paid_owner, 'paid-' || n);
  END LOOP;

  UPDATE public.therapist_subscriptions SET status='canceled'
    WHERE therapist_id=paid_owner;
  UPDATE public.clients SET display_name='still-accessible'
    WHERE user_id=paid_owner AND display_name='paid-1';
  BEGIN
    INSERT INTO public.clients(user_id,display_name) VALUES(paid_owner,'after-downgrade');
    RAISE EXCEPTION 'downgraded account added an eighth client';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE public.clients SET archived=true
    WHERE user_id=paid_owner AND display_name='paid-2';

  FOR n IN 1..4 LOOP
    INSERT INTO public.clients(user_id,display_name) VALUES(race_owner,'race-' || n);
  END LOOP;

  IF (SELECT count(*) FROM public.clients WHERE user_id=free_owner AND NOT archived) <> 5 THEN
    RAISE EXCEPTION 'wrong Free active count';
  END IF;
  IF (SELECT count(*) FROM public.clients WHERE user_id=paid_owner) <> 8 THEN
    RAISE EXCEPTION 'existing client records lost on downgrade';
  END IF;
END;
$$;

-- Simulate RLS-protected Data API writes as the signed-in authenticated role.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
INSERT INTO public.clients(user_id,display_name)
VALUES ('00000000-0000-4000-8000-000000000005','authenticated-allowed');
RESET ROLE;
SELECT 'FREE_CLIENT_CAP_CASES_OK' AS result;
