-- Published rule metadata is readable, but never writable by API clients.
-- RLS does not protect TRUNCATE; explicitly remove all excess table grants.
alter table public.leaderboard_rules enable row level security;
revoke all privileges on table public.leaderboard_rules from public, anon, authenticated;
grant select on table public.leaderboard_rules to anon, authenticated;

create policy leaderboard_rules_public_read
on public.leaderboard_rules
for select
to anon, authenticated
using (true);

-- Keep trusted server-side maintenance available.
grant all privileges on table public.leaderboard_rules to service_role;
