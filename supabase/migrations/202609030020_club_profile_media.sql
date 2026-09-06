alter table public.clubs
  add column profile_image_path text,
  add column background_image_path text;

create or replace function public.can_manage_club_media(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.has_club_role(
    p_club_id,
    array['owner', 'organizer']::public.club_role[]
  )
$$;

revoke all on function public.can_manage_club_media(uuid) from public;
grant execute on function public.can_manage_club_media(uuid) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-media',
  'club-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy club_media_public_read
on storage.objects
for select
using (bucket_id = 'club-media');

create policy club_media_manager_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.can_manage_club_media(((storage.foldername(name))[1])::uuid)
);

create policy club_media_manager_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'club-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.can_manage_club_media(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'club-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.can_manage_club_media(((storage.foldername(name))[1])::uuid)
);

create policy club_media_manager_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.can_manage_club_media(((storage.foldername(name))[1])::uuid)
);
