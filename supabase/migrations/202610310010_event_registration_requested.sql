-- A pending request to join a public event. Holds no spot: capacity,
-- rosters, check-in and the queue only count 'confirmed' (and 'waitlisted').
-- Own file: a new enum value can't be used in the transaction that adds it.
alter type public.registration_status add value if not exists 'requested';
