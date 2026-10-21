#!/usr/bin/env bash
set -euo pipefail

racing_user='00000000-0000-4000-8000-000000000105'
first_output=$(mktemp)
second_output=$(mktemp)
trap 'rm -f "$first_output" "$second_output"' EXIT

# The first request reserves the fifth credit but holds the transaction open.
# The second request must wait for the row lock and be denied.
(
  psql -X -v ON_ERROR_STOP=1 <<'SQL'
begin;
select public.reserve_free_ai_action(
  '00000000-0000-4000-8000-000000000105',
  'reflection.analysis', 1000, 500
);
select pg_sleep(3);
commit;
SQL
) >"$first_output" 2>&1 &
first_pid=$!

sleep 1
set +e
psql -X -v ON_ERROR_STOP=1 -c "select public.reserve_free_ai_action('$racing_user','reflection.analysis',1000,500)" >"$second_output" 2>&1
second_status=$?
set -e

wait "$first_pid" || { cat "$first_output"; exit 1; }
if [[ "$second_status" -eq 0 ]]; then
  echo 'ERROR: simultaneous sixth Free AI call was allowed' >&2
  exit 1
fi
if ! grep -q 'FREE_AI_MONTHLY_LIMIT' "$second_output"; then
  cat "$second_output"
  exit 1
fi
actual=$(psql -X -qAt -c "select used from private.free_ai_monthly_usage where user_id='$racing_user' and period_start=date_trunc('month',now() at time zone 'UTC')::date")
if [[ "$actual" != '5' ]]; then
  echo "ERROR: expected exactly 5 reserved Free AI actions, received $actual" >&2
  exit 1
fi
echo 'FREE_AI_CONCURRENT_RESERVATION_OK'
