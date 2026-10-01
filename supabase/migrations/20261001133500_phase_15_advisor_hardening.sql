create index if not exists analytics_events_actor_idx
  on public.analytics_events (actor_id) where actor_id is not null;
create index if not exists analytics_events_venue_idx
  on public.analytics_events (venue_id) where venue_id is not null;
create index if not exists complaints_player_idx
  on public.complaints (player_id);
create index if not exists complaints_reviewed_by_idx
  on public.complaints (reviewed_by) where reviewed_by is not null;
create index if not exists refunds_requested_by_idx
  on public.refunds (requested_by) where requested_by is not null;
create index if not exists settlements_created_by_idx
  on public.settlements (created_by);

drop policy if exists "profiles_authenticated_read_own_or_admin" on public.profiles;
drop policy if exists "profiles_super_admin_read_all" on public.profiles;
drop policy if exists "profiles_venue_owner_read_booked_players" on public.profiles;

create policy "profiles_authenticated_read_authorized"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.current_user_role()) = 'super_admin'
  or (
    role = 'player'
    and exists (
      select 1
      from public.bookings booking
      join public.venues venue on venue.id = booking.venue_id
      where booking.player_id = profiles.id
        and venue.owner_id = (select auth.uid())
    )
  )
);
