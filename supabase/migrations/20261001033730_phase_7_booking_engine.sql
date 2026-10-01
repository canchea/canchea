begin;

create type public.booking_status as enum (
  'pending_payment',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'expired',
  'refunded_partial'
);

alter table public.courts
  add constraint courts_id_venue_unique unique (id, venue_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  player_id uuid not null references public.profiles (id) on delete restrict,
  court_id uuid not null references public.courts (id) on delete restrict,
  venue_id uuid not null references public.venues (id) on delete restrict,
  status public.booking_status not null default 'pending_payment',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  slot_period tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  duration_minutes smallint not null,
  total_price_bob numeric(10, 2) not null,
  deposit_amount_bob numeric(10, 2) not null,
  commission_percentage numeric(5, 2) not null,
  commission_amount_bob numeric(10, 2) not null,
  venue_net_amount_bob numeric(10, 2) not null,
  remaining_balance_bob numeric(10, 2) not null,
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  in_progress_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bookings_public_code_format check (public_code ~ '^CAN-[A-Z2-9]{6}$'),
  constraint bookings_valid_period check (starts_at < ends_at),
  constraint bookings_duration_supported check (duration_minutes in (30, 60)),
  constraint bookings_duration_matches_period check (
    extract(epoch from (ends_at - starts_at)) / 60 = duration_minutes
  ),
  constraint bookings_financial_values check (
    total_price_bob >= 0
    and deposit_amount_bob >= 0
    and deposit_amount_bob <= total_price_bob
    and commission_percentage between 0 and 100
    and commission_amount_bob >= 0
    and venue_net_amount_bob >= 0
    and remaining_balance_bob >= 0
    and commission_amount_bob = round(total_price_bob * commission_percentage / 100, 2)
    and venue_net_amount_bob = total_price_bob - commission_amount_bob
    and remaining_balance_bob = total_price_bob - deposit_amount_bob
  ),
  constraint bookings_pending_requires_expiry check (
    status <> 'pending_payment' or hold_expires_at is not null
  ),
  constraint bookings_court_venue_consistency foreign key (court_id, venue_id)
    references public.courts (id, venue_id) on delete restrict,
  constraint bookings_no_active_overlap exclude using gist (
    court_id with =,
    slot_period with &&
  ) where (status in ('pending_payment', 'confirmed', 'in_progress'))
);

comment on table public.bookings is 'Reservas de CANCHEA. Los importes son snapshots inmutables de la configuración vigente al crear el hold.';
comment on column public.bookings.public_code is 'Código público amigable; el UUID sigue siendo la clave interna.';
comment on column public.bookings.hold_expires_at is 'Fin del bloqueo temporal. La disponibilidad ignora holds vencidos aunque la normalización a EXPIRED sea diferida.';

create index bookings_player_created_idx on public.bookings (player_id, created_at desc);
create index bookings_venue_starts_idx on public.bookings (venue_id, starts_at desc);
create index bookings_court_starts_idx on public.bookings (court_id, starts_at desc);
create index bookings_active_holds_idx on public.bookings (court_id, hold_expires_at)
  where status = 'pending_payment';
create index bookings_status_starts_idx on public.bookings (status, starts_at);

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function private.set_updated_at();

create table public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint booking_status_history_reason_length check (char_length(reason) between 3 and 120),
  constraint booking_status_history_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index booking_status_history_booking_idx
  on public.booking_status_history (booking_id, created_at, id);
create index booking_status_history_changed_by_idx
  on public.booking_status_history (changed_by)
  where changed_by is not null;

create function private.generate_booking_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_attempt integer;
begin
  for v_attempt in 1..20 loop
    select 'CAN-' || string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      into v_code
    from generate_series(1, 6);

    if not exists (select 1 from public.bookings where public_code = v_code) then
      return v_code;
    end if;
  end loop;

  raise exception 'Could not generate booking code' using errcode = 'P0001';
end;
$$;

revoke execute on function private.generate_booking_code() from public, anon, authenticated;

create function private.validate_booking_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if not (
    (old.status = 'pending_payment' and new.status in ('confirmed', 'cancelled', 'expired'))
    or (old.status = 'confirmed' and new.status in ('in_progress', 'cancelled', 'no_show', 'refunded_partial'))
    or (old.status = 'in_progress' and new.status in ('completed', 'no_show'))
    or (old.status = 'cancelled' and new.status = 'refunded_partial')
  ) then
    raise exception 'Invalid booking status transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  if new.status = 'confirmed' then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  elsif new.status = 'in_progress' then
    new.in_progress_at := coalesce(new.in_progress_at, now());
  elsif new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif new.status = 'expired' then
    new.expired_at := coalesce(new.expired_at, now());
  end if;

  return new;
end;
$$;

create trigger bookings_validate_status_transition
before update of status on public.bookings
for each row execute function private.validate_booking_status_transition();

create function private.record_booking_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(current_setting('canchea.booking_status_reason', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.booking_status_history (
      booking_id, from_status, to_status, changed_by, reason
    ) values (
      new.id, null, new.status, (select auth.uid()), coalesce(v_reason, 'booking_created')
    );
  elsif old.status is distinct from new.status then
    insert into public.booking_status_history (
      booking_id, from_status, to_status, changed_by, reason
    ) values (
      new.id, old.status, new.status, (select auth.uid()), coalesce(v_reason, 'status_changed')
    );
  end if;

  return new;
end;
$$;

create trigger bookings_record_status_history
after insert or update of status on public.bookings
for each row execute function private.record_booking_status_history();

alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;

revoke all on table public.bookings, public.booking_status_history from anon, authenticated;
grant select on table public.bookings, public.booking_status_history to authenticated;

create policy "bookings_authenticated_read_authorized"
on public.bookings for select to authenticated
using (
  player_id = (select auth.uid())
  or exists (
    select 1
    from public.venues v
    where v.id = venue_id and v.owner_id = (select auth.uid())
  )
  or (select private.current_user_role()) = 'super_admin'
);

create policy "booking_status_history_authenticated_read_authorized"
on public.booking_status_history for select to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (
        b.player_id = (select auth.uid())
        or exists (
          select 1
          from public.venues v
          where v.id = b.venue_id and v.owner_id = (select auth.uid())
        )
        or (select private.current_user_role()) = 'super_admin'
      )
  )
);

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
      ((p_date + make_interval(mins => slot.minute_value + d.duration_minutes)) at time zone v_timezone) as candidate_end,
      make_time(slot.minute_value / 60, slot.minute_value % 60, 0) as candidate_time,
      d.duration_minutes as candidate_duration,
      pr.price_bob as candidate_price
    from public.court_weekly_schedules s
    join public.court_durations d on d.court_id = s.court_id
    cross join lateral generate_series(
      s.opens_minute::integer,
      (s.closes_minute - d.duration_minutes)::integer,
      30
    ) as slot(minute_value)
    join public.court_pricing_rules pr
      on pr.court_id = s.court_id
      and pr.day_of_week = s.day_of_week
      and pr.duration_minutes = d.duration_minutes
      and pr.is_active
      and slot.minute_value >= pr.starts_minute
      and slot.minute_value + d.duration_minutes <= pr.ends_minute
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
  order by candidate.candidate_start, candidate.candidate_duration;
end;
$$;

revoke execute on function public.get_court_availability(uuid, date) from public;
grant execute on function public.get_court_availability(uuid, date) to anon, authenticated;

create function public.create_booking_hold(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes smallint
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings;
  v_venue_id uuid;
  v_timezone text;
  v_slot record;
  v_hold_minutes integer;
  v_deposit numeric(10, 2);
  v_commission_percentage numeric(5, 2);
  v_commission numeric(10, 2);
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;

  if p_court_id is null or p_starts_at is null or p_duration_minutes is null
     or p_duration_minutes not in (30, 60) then
    raise exception 'Invalid booking slot' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_court_id::text, 0));
  perform set_config('canchea.booking_status_reason', 'hold_expired', true);

  update public.bookings
  set status = 'expired'
  where court_id = p_court_id
    and status = 'pending_payment'
    and hold_expires_at <= now();

  select c.venue_id, v.timezone
  into v_venue_id, v_timezone
  from public.courts c
  join public.venues v on v.id = c.venue_id
  where c.id = p_court_id
    and c.status = 'active'
    and v.status = 'approved';

  if not found then
    raise exception 'Court is not available for booking' using errcode = '22023';
  end if;

  select availability.* into v_slot
  from public.get_court_availability(
    p_court_id,
    (p_starts_at at time zone v_timezone)::date
  ) availability
  where availability.starts_at = p_starts_at
    and availability.duration_minutes = p_duration_minutes
  limit 1;

  if not found then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select coalesce((value #>> '{}')::integer, 5)
  into v_hold_minutes
  from public.platform_settings
  where key = 'booking_hold_minutes';

  select coalesce((value #>> '{}')::numeric, 50)
  into v_deposit
  from public.platform_settings
  where key = 'booking_deposit_amount';

  select coalesce((value #>> '{}')::numeric, 10)
  into v_commission_percentage
  from public.platform_settings
  where key = 'platform_commission_percentage';

  v_hold_minutes := coalesce(v_hold_minutes, 5);
  v_deposit := coalesce(v_deposit, 50);
  v_commission_percentage := coalesce(v_commission_percentage, 10);

  if v_hold_minutes not between 1 and 30
     or v_deposit < 0
     or v_deposit > v_slot.price_bob
     or v_commission_percentage not between 0 and 100 then
    raise exception 'Invalid booking configuration' using errcode = '22023';
  end if;

  v_commission := round(v_slot.price_bob * v_commission_percentage / 100, 2);
  perform set_config('canchea.booking_status_reason', 'checkout_started', true);

  insert into public.bookings (
    public_code,
    player_id,
    court_id,
    venue_id,
    starts_at,
    ends_at,
    duration_minutes,
    total_price_bob,
    deposit_amount_bob,
    commission_percentage,
    commission_amount_bob,
    venue_net_amount_bob,
    remaining_balance_bob,
    hold_expires_at
  ) values (
    private.generate_booking_code(),
    v_user_id,
    p_court_id,
    v_venue_id,
    v_slot.starts_at,
    v_slot.ends_at,
    p_duration_minutes,
    v_slot.price_bob,
    v_deposit,
    v_commission_percentage,
    v_commission,
    v_slot.price_bob - v_commission,
    v_slot.price_bob - v_deposit,
    now() + make_interval(mins => v_hold_minutes)
  ) returning * into v_booking;

  return v_booking;
exception
  when exclusion_violation then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'P0001';
end;
$$;

revoke execute on function public.create_booking_hold(uuid, timestamptz, smallint)
  from public, anon;
grant execute on function public.create_booking_hold(uuid, timestamptz, smallint)
  to authenticated;

create function public.get_my_booking_checkout(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform set_config('canchea.booking_status_reason', 'hold_expired', true);
  update public.bookings
  set status = 'expired'
  where id = p_booking_id
    and player_id = v_user_id
    and status = 'pending_payment'
    and hold_expires_at <= now();

  select * into v_booking
  from public.bookings
  where id = p_booking_id and player_id = v_user_id;

  if not found then
    raise exception 'Booking not found' using errcode = '22023';
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.get_my_booking_checkout(uuid) from public, anon;
grant execute on function public.get_my_booking_checkout(uuid) to authenticated;

create function public.release_my_booking_hold(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;

  perform set_config('canchea.booking_status_reason', 'checkout_released', true);

  update public.bookings
  set status = 'expired'
  where id = p_booking_id
    and player_id = v_user_id
    and status = 'pending_payment'
  returning * into v_booking;

  if not found then
    select * into v_booking
    from public.bookings
    where id = p_booking_id and player_id = v_user_id;
  end if;

  if v_booking.id is null then
    raise exception 'Booking not found' using errcode = '22023';
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.release_my_booking_hold(uuid) from public, anon;
grant execute on function public.release_my_booking_hold(uuid) to authenticated;

commit;
