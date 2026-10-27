-- A pending join request. Grants nothing: club roles (has_club_role) and
-- private-event access only count 'active' (and 'invited') memberships.
-- Own file: a new enum value can't be used in the transaction that adds it.
alter type public.membership_status add value if not exists 'requested';
