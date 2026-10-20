#!/usr/bin/env bash
set -euo pipefail
race_owner='00000000-0000-4000-8000-000000000004'
first_output=$(mktemp)
second_output=$(mktemp)
trap 'rm -f "$first_output" "$second_output"' EXIT

(
  psql -X -v ON_ERROR_STOP=1 <<'SQL'
begin;
insert into public.clients(user_id,display_name)
values ('00000000-0000-4000-8000-000000000004','race-winner');
select pg_sleep(3);
commit;
SQL
) >"$first_output" 2>&1 &
first_pid=$!

sleep 1
set +e
psql -X -v ON_ERROR_STOP=1 -c "insert into public.clients(user_id,display_name) values ('$race_owner','race-second')" >"$second_output" 2>&1
second_status=$?
set -e

wait "$first_pid" || { cat "$first_output"; exit 1; }
if [[ "$second_status" -eq 0 ]]; then
  echo 'ERROR: simultaneous sixth Free client was allowed' >&2
  exit 1
fi
if ! grep -q 'Free plan includes up to 5 active clients' "$second_output"; then
  cat "$second_output"
  exit 1
fi
actual=$(psql -X -qAt -c "select count(*) from public.clients where user_id='$race_owner' and archived=false")
if [[ "$actual" != '5' ]]; then
  echo "ERROR: expected exactly 5 active clients, received $actual" >&2
  exit 1
fi
echo 'FREE_CLIENT_CONCURRENT_QUOTA_OK'
