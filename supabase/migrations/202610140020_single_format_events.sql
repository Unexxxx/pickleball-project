-- An event is either singles or doubles, chosen when it is created. Events
-- that listed both already ran as doubles (the selector used doubles whenever
-- it was offered), so they keep that format.
update public.events
set formats = array['doubles']
where cardinality(formats) <> 1;

alter table public.events
  add constraint events_single_format
  check (cardinality(formats) = 1 and formats[1] in ('singles', 'doubles'));
