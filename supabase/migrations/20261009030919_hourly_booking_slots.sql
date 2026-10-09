-- Standardize all future availability and bookings as one-hour, top-of-hour slots.
-- Historical bookings keep their recorded duration because the bookings constraint
-- intentionally continues to accept legacy 30-minute rows.

delete from public.court_pricing_rules
where duration_minutes = 30;

delete from public.court_durations
where duration_minutes = 30;

alter table public.court_durations
  drop constraint court_durations_supported,
  add constraint court_durations_supported check (duration_minutes = 60);

alter table public.court_weekly_schedules
  drop constraint court_weekly_schedules_valid_minutes,
  add constraint court_weekly_schedules_valid_minutes check (
    (not is_available and opens_minute is null and closes_minute is null)
    or (
      is_available
      and opens_minute between 0 and 1439
      and closes_minute between 1 and 1440
      and opens_minute < closes_minute
      and opens_minute % 60 = 0
      and closes_minute % 60 = 0
    )
  );

alter table public.court_pricing_rules
  drop constraint court_pricing_rules_valid_minutes,
  add constraint court_pricing_rules_valid_minutes check (
    starts_minute between 0 and 1439
    and ends_minute between 1 and 1440
    and starts_minute < ends_minute
    and starts_minute % 60 = 0
    and ends_minute % 60 = 0
  ),
  drop constraint court_pricing_rules_duration,
  add constraint court_pricing_rules_duration check (duration_minutes = 60);

create or replace function public.get_court_availability(p_court_id uuid, p_date date)
returns table (
  court_id uuid,
  slot_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  start_time time,
  duration_minutes smallint,
  price_bob numeric
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_timezone text;
  v_min_advance integer := 60;
begin
  select v.timezone into v_timezone
  from public.courts c
  join public.venues v on v.id = c.venue_id
  where c.id = p_court_id
    and (
      (c.status = 'active' and v.status = 'approved')
      or v.owner_id = (select auth.uid())
      or (select private.current_user_role()) = 'super_admin'
    );

  if not found or p_date is null then
    return;
  end if;

  select coalesce(
    (select (value #>> '{}')::integer from public.platform_settings where key = 'booking_min_advance_minutes'),
    60
  ) into v_min_advance;

  if p_date < (timezone(v_timezone, now()))::date then
    return;
  end if;

  return query
  with candidates as (
    select
      p_court_id as candidate_court_id,
      p_date as candidate_date,
      ((p_date + make_interval(mins => slot.minute_value)) at time zone v_timezone) as candidate_start,
      ((p_date + make_interval(mins => slot.minute_value + 60)) at time zone v_timezone) as candidate_end,
      make_time(slot.minute_value / 60, 0, 0) as candidate_time,
      60::smallint as candidate_duration,
      pr.price_bob as candidate_price
    from public.court_weekly_schedules s
    join public.court_durations d
      on d.court_id = s.court_id
      and d.duration_minutes = 60
    cross join lateral generate_series(
      s.opens_minute::integer,
      (s.closes_minute - 60)::integer,
      60
    ) as slot(minute_value)
    join public.court_pricing_rules pr
      on pr.court_id = s.court_id
      and pr.day_of_week = s.day_of_week
      and pr.duration_minutes = 60
      and pr.is_active
      and slot.minute_value >= pr.starts_minute
      and slot.minute_value + 60 <= pr.ends_minute
    where s.court_id = p_court_id
      and s.day_of_week = (extract(isodow from p_date)::integer - 1)
      and s.is_available
  )
  select
    candidate_court_id,
    candidate_date,
    candidate_start,
    candidate_end,
    candidate_time,
    candidate_duration,
    candidate_price
  from candidates candidate
  where candidate.candidate_start >= now() + make_interval(mins => v_min_advance)
    and not exists (
      select 1 from public.court_blocks b
      where b.court_id = candidate.candidate_court_id
        and b.period && tstzrange(candidate.candidate_start, candidate.candidate_end, '[)')
    )
    and not exists (
      select 1 from public.bookings booking
      where booking.court_id = candidate.candidate_court_id
        and booking.slot_period && tstzrange(candidate.candidate_start, candidate.candidate_end, '[)')
        and (
          booking.status in ('confirmed', 'in_progress')
          or (
            booking.status = 'pending_payment'
            and booking.hold_expires_at > now()
          )
        )
    )
  order by candidate.candidate_start;
end;
$$;

comment on function public.get_court_availability(uuid, date)
is 'Returns bookable one-hour slots aligned to exact hours while preserving legacy booking history.';

revoke execute on function public.get_court_availability(uuid, date) from public;
grant execute on function public.get_court_availability(uuid, date) to anon, authenticated;

create function private.enforce_hourly_new_booking()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.duration_minutes <> 60
     or extract(minute from new.starts_at) <> 0
     or extract(second from new.starts_at) <> 0 then
    raise exception 'New bookings must use one-hour slots aligned to the hour'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger bookings_enforce_hourly_insert
before insert on public.bookings
for each row execute function private.enforce_hourly_new_booking();

comment on trigger bookings_enforce_hourly_insert on public.bookings
is 'Allows legacy 30-minute rows to remain while enforcing one-hour slots for every new booking.';
