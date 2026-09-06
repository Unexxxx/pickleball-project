-- Proposal generation remains an internal implementation detail of
-- assign_next_queued_match. Clients can no longer invoke the retired manual
-- proposal workflow directly.
revoke execute on function public.generate_match_proposal(uuid, text, uuid) from authenticated;
revoke execute on function public.confirm_match_proposal(uuid, bigint, uuid) from authenticated;
