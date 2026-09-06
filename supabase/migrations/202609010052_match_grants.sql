revoke insert, update, delete, truncate, references, trigger
  on public.match_proposals, public.matches, public.match_participants
  from anon, authenticated;

grant select on public.match_proposals, public.matches, public.match_participants
  to authenticated;

comment on table public.matches is
  'Official assignments are writable only through checked transactional functions.';
