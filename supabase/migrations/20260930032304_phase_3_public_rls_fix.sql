begin;

drop policy "venues_read_approved_or_authorized" on public.venues;
create policy "venues_public_read_approved"
on public.venues for select
to anon, authenticated
using (status = 'approved');
create policy "venues_authenticated_read_own_or_admin"
on public.venues for select
to authenticated
using (owner_id = (select auth.uid()) or (select private.current_user_role()) = 'super_admin');

drop policy "services_read_active" on public.services;
create policy "services_public_read_active"
on public.services for select
to anon, authenticated
using (is_active);
create policy "services_admin_read_all"
on public.services for select
to authenticated
using ((select private.current_user_role()) = 'super_admin');

drop policy "venue_services_read_approved_or_authorized" on public.venue_services;
create policy "venue_services_public_read_approved"
on public.venue_services for select
to anon, authenticated
using (exists (select 1 from public.venues v where v.id = venue_id and v.status = 'approved'));
create policy "venue_services_authenticated_read_own_or_admin"
on public.venue_services for select
to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id
      and (v.owner_id = (select auth.uid()) or (select private.current_user_role()) = 'super_admin')
  )
);

drop policy "venue_hours_read_approved_or_authorized" on public.venue_opening_hours;
create policy "venue_hours_public_read_approved"
on public.venue_opening_hours for select
to anon, authenticated
using (exists (select 1 from public.venues v where v.id = venue_id and v.status = 'approved'));
create policy "venue_hours_authenticated_read_own_or_admin"
on public.venue_opening_hours for select
to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id
      and (v.owner_id = (select auth.uid()) or (select private.current_user_role()) = 'super_admin')
  )
);

drop policy "venue_photos_read_approved_or_authorized" on public.venue_photos;
create policy "venue_photos_public_read_approved"
on public.venue_photos for select
to anon, authenticated
using (exists (select 1 from public.venues v where v.id = venue_id and v.status = 'approved'));
create policy "venue_photos_authenticated_read_own_or_admin"
on public.venue_photos for select
to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id
      and (v.owner_id = (select auth.uid()) or (select private.current_user_role()) = 'super_admin')
  )
);

drop policy "venue_media_read_approved_or_authorized" on storage.objects;
create policy "venue_media_public_read_approved"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(name))[1]
      and v.status = 'approved'
  )
);
create policy "venue_media_authenticated_read_own_or_admin"
on storage.objects for select
to authenticated
using (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(name))[1]
      and (v.owner_id = (select auth.uid()) or (select private.current_user_role()) = 'super_admin')
  )
);

commit;
