grant execute on function private.is_match_participant(uuid) to authenticated;
grant execute on function private.can_manage_match(uuid) to authenticated;
grant execute on function private.can_view_event_operations(uuid) to authenticated;

comment on function private.can_view_event_operations(uuid) is
  'RLS predicate available only to authenticated sessions; returns whether the current player may see event operations.';
