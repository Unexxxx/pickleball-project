drop policy if exists event_attendance_player_or_club_read
on public.event_attendance;

create policy event_attendance_player_or_club_read
on public.event_attendance
for select
to authenticated
using (
  player_id = public.current_player_id()
  or exists (
    select 1
    from public.events event
    where event.id = event_attendance.event_id
      and private.has_club_role(
        event.club_id,
        array[
          'owner',
          'organizer',
          'score_official',
          'staff'
        ]::public.club_role[]
      )
  )
);

comment on policy event_attendance_player_or_club_read
on public.event_attendance is
  'Players may read their own attendance; authorized Club operations roles may read attendance for their Club events.';
