begin;

create index venue_photos_created_by_idx on public.venue_photos (created_by);
create index venue_services_service_id_idx on public.venue_services (service_id);
create index venue_status_history_changed_by_idx on public.venue_status_history (changed_by);
create index venues_reviewed_by_idx on public.venues (reviewed_by) where reviewed_by is not null;

drop policy "profiles_select_own" on public.profiles;
drop policy "profiles_admin_select" on public.profiles;
create policy "profiles_authenticated_read_own_or_admin"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or (select private.current_user_role()) = 'super_admin');

drop policy "venues_public_read_approved" on public.venues;
drop policy "venues_authenticated_read_own_or_admin" on public.venues;
create policy "venues_anon_read_approved"
on public.venues for select
to anon
using (status = 'approved');
create policy "venues_authenticated_read_visible"
on public.venues for select
to authenticated
using (
  status = 'approved'
  or owner_id = (select auth.uid())
  or (select private.current_user_role()) = 'super_admin'
);

drop policy "services_public_read_active" on public.services;
drop policy "services_admin_read_all" on public.services;
create policy "services_anon_read_active"
on public.services for select
to anon
using (is_active);
create policy "services_authenticated_read_visible"
on public.services for select
to authenticated
using (is_active or (select private.current_user_role()) = 'super_admin');

drop policy "venue_services_public_read_approved" on public.venue_services;
drop policy "venue_services_authenticated_read_own_or_admin" on public.venue_services;
create policy "venue_services_anon_read_approved"
on public.venue_services for select
to anon
using (exists (select 1 from public.venues v where v.id = venue_id and v.status = 'approved'));
create policy "venue_services_authenticated_read_visible"
on public.venue_services for select
to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id
      and (
        v.status = 'approved'
        or v.owner_id = (select auth.uid())
        or (select private.current_user_role()) = 'super_admin'
      )
  )
);

drop policy "venue_hours_public_read_approved" on public.venue_opening_hours;
drop policy "venue_hours_authenticated_read_own_or_admin" on public.venue_opening_hours;
create policy "venue_hours_anon_read_approved"
on public.venue_opening_hours for select
to anon
using (exists (select 1 from public.venues v where v.id = venue_id and v.status = 'approved'));
create policy "venue_hours_authenticated_read_visible"
on public.venue_opening_hours for select
to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id
      and (
        v.status = 'approved'
        or v.owner_id = (select auth.uid())
        or (select private.current_user_role()) = 'super_admin'
      )
  )
);

drop policy "venue_photos_public_read_approved" on public.venue_photos;
drop policy "venue_photos_authenticated_read_own_or_admin" on public.venue_photos;
create policy "venue_photos_anon_read_approved"
on public.venue_photos for select
to anon
using (exists (select 1 from public.venues v where v.id = venue_id and v.status = 'approved'));
create policy "venue_photos_authenticated_read_visible"
on public.venue_photos for select
to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id
      and (
        v.status = 'approved'
        or v.owner_id = (select auth.uid())
        or (select private.current_user_role()) = 'super_admin'
      )
  )
);

drop policy "venue_media_public_read_approved" on storage.objects;
drop policy "venue_media_authenticated_read_own_or_admin" on storage.objects;
create policy "venue_media_anon_read_approved"
on storage.objects for select
to anon
using (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(name))[1]
      and v.status = 'approved'
  )
);
create policy "venue_media_authenticated_read_visible"
on storage.objects for select
to authenticated
using (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(name))[1]
      and (
        v.status = 'approved'
        or v.owner_id = (select auth.uid())
        or (select private.current_user_role()) = 'super_admin'
      )
  )
);

commit;
