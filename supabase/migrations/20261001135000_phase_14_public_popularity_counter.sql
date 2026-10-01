alter table public.venues
  add column booking_count integer not null default 0,
  add constraint venues_booking_count_valid check (booking_count >= 0);

update public.venues venue
set booking_count = (
  select count(*)::integer
  from public.bookings booking
  where booking.venue_id = venue.id
    and booking.status in ('confirmed', 'in_progress', 'completed', 'no_show')
);

create function private.refresh_venue_booking_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  venue_to_refresh uuid;
  venues_to_refresh uuid[] := array[]::uuid[];
begin
  if tg_op <> 'INSERT' then
    venues_to_refresh := array_append(venues_to_refresh, old.venue_id);
  end if;
  if tg_op <> 'DELETE' then
    venues_to_refresh := array_append(venues_to_refresh, new.venue_id);
  end if;

  for venue_to_refresh in
    select distinct candidate
    from unnest(venues_to_refresh) candidate
    where candidate is not null
  loop
    update public.venues venue
    set booking_count = (
      select count(*)::integer
      from public.bookings booking
      where booking.venue_id = venue_to_refresh
        and booking.status in ('confirmed', 'in_progress', 'completed', 'no_show')
    )
    where venue.id = venue_to_refresh;
  end loop;
  return coalesce(new, old);
end;
$$;

create trigger bookings_refresh_venue_booking_count
after insert or update of status, venue_id or delete on public.bookings
for each row execute function private.refresh_venue_booking_count();

do $$
declare
  function_definition text;
  previous_sort text := 'case when p_sort = ''popularity'' then (select count(*) from public.bookings booking where booking.venue_id = counted.match_venue_id and booking.status in (''confirmed'', ''in_progress'', ''completed'', ''no_show'')) end desc nulls last,';
  public_sort text := 'case when p_sort = ''popularity'' then (select venue.booking_count from public.venues venue where venue.id = counted.match_venue_id) end desc nulls last,';
begin
  select pg_get_functiondef(
    'public.search_available_courts(text,text,date,time without time zone,numeric,numeric,smallint,text,numeric,numeric,integer,integer)'::regprocedure
  ) into function_definition;
  if position(previous_sort in function_definition) = 0 then
    raise exception 'Expected popularity ranking clause was not found';
  end if;
  execute replace(function_definition, previous_sort, public_sort);
end;
$$;
