begin;

drop policy "venue_media_anon_read_visible" on storage.objects;
drop policy "venue_media_authenticated_read_visible" on storage.objects;
drop policy "venue_media_owner_upload" on storage.objects;
drop policy "venue_media_owner_update" on storage.objects;
drop policy "venue_media_owner_delete" on storage.objects;

create policy "venue_media_anon_read_visible"
on storage.objects for select to anon
using (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(storage.objects.name))[1]
      and v.status = 'approved'
      and (
        (storage.foldername(storage.objects.name))[2] in ('logo', 'cover', 'gallery')
        or (
          (storage.foldername(storage.objects.name))[2] = 'courts'
          and exists (
            select 1 from public.courts c
            where c.id::text = (storage.foldername(storage.objects.name))[3]
              and c.venue_id = v.id and c.status = 'active'
          )
        )
      )
  )
);

create policy "venue_media_authenticated_read_visible"
on storage.objects for select to authenticated
using (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(storage.objects.name))[1]
      and (
        v.owner_id = (select auth.uid())
        or (select private.current_user_role()) = 'super_admin'
        or (
          v.status = 'approved'
          and (
            (storage.foldername(storage.objects.name))[2] in ('logo', 'cover', 'gallery')
            or (
              (storage.foldername(storage.objects.name))[2] = 'courts'
              and exists (
                select 1 from public.courts c
                where c.id::text = (storage.foldername(storage.objects.name))[3]
                  and c.venue_id = v.id and c.status = 'active'
              )
            )
          )
        )
      )
  )
);

create policy "venue_media_owner_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(storage.objects.name))[1]
      and v.owner_id = (select auth.uid())
      and (
        (
          v.status in ('draft', 'rejected', 'changes_requested')
          and (storage.foldername(storage.objects.name))[2] in ('logo', 'cover', 'gallery')
        )
        or (
          v.status = 'approved'
          and (storage.foldername(storage.objects.name))[2] = 'courts'
          and (storage.foldername(storage.objects.name))[4] in ('cover', 'gallery')
          and exists (
            select 1 from public.courts c
            where c.id::text = (storage.foldername(storage.objects.name))[3]
              and c.venue_id = v.id
          )
        )
      )
  )
);

create policy "venue_media_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(storage.objects.name))[1]
      and v.owner_id = (select auth.uid())
      and (
        (v.status in ('draft', 'rejected', 'changes_requested') and (storage.foldername(storage.objects.name))[2] in ('logo', 'cover', 'gallery'))
        or (v.status = 'approved' and (storage.foldername(storage.objects.name))[2] = 'courts'
          and (storage.foldername(storage.objects.name))[4] in ('cover', 'gallery')
          and exists (
            select 1 from public.courts c
            where c.id::text = (storage.foldername(storage.objects.name))[3] and c.venue_id = v.id
          ))
      )
  )
)
with check (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(storage.objects.name))[1]
      and v.owner_id = (select auth.uid())
      and (
        (v.status in ('draft', 'rejected', 'changes_requested') and (storage.foldername(storage.objects.name))[2] in ('logo', 'cover', 'gallery'))
        or (v.status = 'approved' and (storage.foldername(storage.objects.name))[2] = 'courts'
          and (storage.foldername(storage.objects.name))[4] in ('cover', 'gallery')
          and exists (
            select 1 from public.courts c
            where c.id::text = (storage.foldername(storage.objects.name))[3] and c.venue_id = v.id
          ))
      )
  )
);

create policy "venue_media_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'venue-media'
  and exists (
    select 1 from public.venues v
    where v.id::text = (storage.foldername(storage.objects.name))[1]
      and v.owner_id = (select auth.uid())
      and (
        (v.status in ('draft', 'rejected', 'changes_requested') and (storage.foldername(storage.objects.name))[2] in ('logo', 'cover', 'gallery'))
        or (v.status = 'approved' and (storage.foldername(storage.objects.name))[2] = 'courts'
          and exists (
            select 1 from public.courts c
            where c.id::text = (storage.foldername(storage.objects.name))[3] and c.venue_id = v.id
          ))
      )
  )
);

commit;
