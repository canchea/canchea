begin;

create extension if not exists btree_gist with schema extensions;

alter table public.venues
  add column timezone text not null default 'America/La_Paz',
  add constraint venues_timezone_length check (char_length(timezone) between 3 and 80);

comment on column public.venues.timezone is 'Zona IANA usada para horarios locales, precios y bloqueos.';

create type public.court_block_kind as enum ('maintenance', 'event', 'internal_use', 'other');

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint platform_settings_key_format check (key ~ '^[a-z][a-z0-9_]{2,79}$'),
  constraint platform_settings_description_length check (char_length(description) between 5 and 240)
);

create index platform_settings_updated_by_idx on public.platform_settings (updated_by);

create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row execute function private.set_updated_at();

insert into public.platform_settings (key, value, description, is_public) values
  ('app_name', '"CANCHEA"'::jsonb, 'Nombre público provisional de la plataforma.', true),
  ('currency', '"BOB"'::jsonb, 'Moneda utilizada para mostrar y registrar precios.', true),
  ('platform_timezone', '"America/La_Paz"'::jsonb, 'Zona horaria operativa inicial de la plataforma.', true),
  ('booking_min_advance_minutes', '60'::jsonb, 'Anticipación mínima para reservar un horario.', true),
  ('booking_hold_minutes', '5'::jsonb, 'Minutos de retención temporal durante checkout.', true),
  ('booking_deposit_amount', '50'::jsonb, 'Seña inicial requerida para confirmar una reserva.', true),
  ('platform_commission_percentage', '10'::jsonb, 'Porcentaje inicial de comisión de la plataforma.', false),
  ('cancellation_threshold_hours', '6'::jsonb, 'Horas que separan la política temprana de la tardía.', true),
  ('deposit_refund_amount', '30'::jsonb, 'Monto reembolsable en una cancelación temprana.', true),
  ('cancellation_penalty_amount', '20'::jsonb, 'Penalización de una cancelación temprana.', true),
  ('trial_months', '3'::jsonb, 'Meses de prueba sin mensualidad para nuevos complejos.', false);

create table public.court_weekly_schedules (
  court_id uuid not null references public.courts (id) on delete cascade,
  day_of_week smallint not null,
  opens_minute smallint,
  closes_minute smallint,
  is_available boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (court_id, day_of_week),
  constraint court_weekly_schedules_day_range check (day_of_week between 0 and 6),
  constraint court_weekly_schedules_valid_minutes check (
    (not is_available and opens_minute is null and closes_minute is null)
    or (
      is_available
      and opens_minute between 0 and 1439
      and closes_minute between 1 and 1440
      and opens_minute < closes_minute
      and opens_minute % 30 = 0
      and closes_minute % 30 = 0
    )
  )
);

comment on table public.court_weekly_schedules is 'Horario semanal recurrente por cancha. 0 representa lunes y 6 domingo.';

create trigger court_weekly_schedules_set_updated_at
before update on public.court_weekly_schedules
for each row execute function private.set_updated_at();

create table public.court_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  day_of_week smallint not null,
  starts_minute smallint not null,
  ends_minute smallint not null,
  duration_minutes smallint not null,
  price_bob numeric(10, 2) not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  minute_range int4range generated always as (int4range(starts_minute, ends_minute, '[)')) stored,
  constraint court_pricing_rules_day_range check (day_of_week between 0 and 6),
  constraint court_pricing_rules_valid_minutes check (
    starts_minute between 0 and 1439
    and ends_minute between 1 and 1440
    and starts_minute < ends_minute
    and starts_minute % 30 = 0
    and ends_minute % 30 = 0
  ),
  constraint court_pricing_rules_duration check (duration_minutes in (30, 60)),
  constraint court_pricing_rules_price check (price_bob > 0 and price_bob <= 100000),
  constraint court_pricing_rules_no_overlap exclude using gist (
    court_id with =,
    day_of_week with =,
    duration_minutes with =,
    minute_range with &&
  ) where (is_active)
);

create index court_pricing_rules_court_day_idx on public.court_pricing_rules (court_id, day_of_week, duration_minutes, starts_minute);
create index court_pricing_rules_created_by_idx on public.court_pricing_rules (created_by);

create trigger court_pricing_rules_set_updated_at
before update on public.court_pricing_rules
for each row execute function private.set_updated_at();

create table public.court_blocks (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind public.court_block_kind not null,
  reason text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  period tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  constraint court_blocks_valid_period check (starts_at < ends_at),
  constraint court_blocks_reason_length check (reason is null or char_length(reason) between 3 and 240),
  constraint court_blocks_no_overlap exclude using gist (court_id with =, period with &&)
);

create index court_blocks_court_start_idx on public.court_blocks (court_id, starts_at, ends_at);
create index court_blocks_created_by_idx on public.court_blocks (created_by);

alter table public.platform_settings enable row level security;
alter table public.court_weekly_schedules enable row level security;
alter table public.court_pricing_rules enable row level security;
alter table public.court_blocks enable row level security;

revoke all on table public.platform_settings, public.court_weekly_schedules,
  public.court_pricing_rules, public.court_blocks from anon, authenticated;

grant select on table public.platform_settings, public.court_weekly_schedules,
  public.court_pricing_rules to anon, authenticated;
grant select on table public.court_blocks to authenticated;

create policy "platform_settings_anon_read_public"
on public.platform_settings for select to anon
using (is_public);

create policy "platform_settings_authenticated_read_visible"
on public.platform_settings for select to authenticated
using (is_public or (select private.current_user_role()) = 'super_admin');

create policy "court_weekly_schedules_anon_read_active"
on public.court_weekly_schedules for select to anon
using (
  exists (
    select 1 from public.courts c
    join public.venues v on v.id = c.venue_id
    where c.id = court_id and c.status = 'active' and v.status = 'approved'
  )
);

create policy "court_weekly_schedules_authenticated_read_visible"
on public.court_weekly_schedules for select to authenticated
using (
  exists (
    select 1 from public.courts c
    join public.venues v on v.id = c.venue_id
    where c.id = court_id
      and ((c.status = 'active' and v.status = 'approved') or v.owner_id = (select auth.uid()))
  )
  or (select private.current_user_role()) = 'super_admin'
);

create policy "court_pricing_rules_anon_read_active"
on public.court_pricing_rules for select to anon
using (
  is_active and exists (
    select 1 from public.courts c
    join public.venues v on v.id = c.venue_id
    where c.id = court_id and c.status = 'active' and v.status = 'approved'
  )
);

create policy "court_pricing_rules_authenticated_read_visible"
on public.court_pricing_rules for select to authenticated
using (
  exists (
    select 1 from public.courts c
    join public.venues v on v.id = c.venue_id
    where c.id = court_id
      and ((is_active and c.status = 'active' and v.status = 'approved') or v.owner_id = (select auth.uid()))
  )
  or (select private.current_user_role()) = 'super_admin'
);

create policy "court_blocks_authenticated_read_owner_or_admin"
on public.court_blocks for select to authenticated
using (
  exists (
    select 1 from public.courts c
    join public.venues v on v.id = c.venue_id
    where c.id = court_id and v.owner_id = (select auth.uid())
  )
  or (select private.current_user_role()) = 'super_admin'
);

create function private.minute_from_time(p_value time)
returns integer
language sql
immutable
set search_path = ''
as $$
  select extract(hour from p_value)::integer * 60 + extract(minute from p_value)::integer
$$;

revoke execute on function private.minute_from_time(time) from public, anon, authenticated;

create function public.save_my_court_schedule(p_court_id uuid, p_schedule jsonb)
returns setof public.court_weekly_schedules
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_venue public.venues;
  v_count integer;
  v_distinct_days integer;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;

  select v.* into v_venue
  from public.courts c
  join public.venues v on v.id = c.venue_id
  where c.id = p_court_id and v.owner_id = v_user_id and v.status = 'approved';

  if not found then
    raise exception 'Court not found' using errcode = '22023';
  end if;

  if jsonb_typeof(p_schedule) <> 'array' or jsonb_array_length(p_schedule) <> 7 then
    raise exception 'Seven schedule entries are required' using errcode = '22023';
  end if;

  select count(*), count(distinct (item ->> 'day_of_week')::smallint)
  into v_count, v_distinct_days
  from jsonb_array_elements(p_schedule) item
  where (item ->> 'day_of_week')::smallint between 0 and 6;

  if v_count <> 7 or v_distinct_days <> 7 then
    raise exception 'Schedule days must be unique and complete' using errcode = '22023';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(p_schedule) item
    where coalesce((item ->> 'is_available')::boolean, false)
  ) then
    raise exception 'At least one available day is required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_schedule) item
    left join public.venue_opening_hours vh
      on vh.venue_id = v_venue.id
      and vh.day_of_week = (item ->> 'day_of_week')::smallint
    where coalesce((item ->> 'is_available')::boolean, false)
      and (
        vh.venue_id is null
        or vh.is_closed
        or (item ->> 'opens_minute')::integer < private.minute_from_time(vh.opens_at)
        or (item ->> 'closes_minute')::integer > private.minute_from_time(vh.closes_at)
      )
  ) then
    raise exception 'Court hours must fit inside venue opening hours' using errcode = '22023';
  end if;

  delete from public.court_weekly_schedules where court_id = p_court_id;

  insert into public.court_weekly_schedules (
    court_id, day_of_week, opens_minute, closes_minute, is_available
  )
  select
    p_court_id,
    (item ->> 'day_of_week')::smallint,
    case when (item ->> 'is_available')::boolean then (item ->> 'opens_minute')::smallint else null end,
    case when (item ->> 'is_available')::boolean then (item ->> 'closes_minute')::smallint else null end,
    (item ->> 'is_available')::boolean
  from jsonb_array_elements(p_schedule) item;

  if exists (
    select 1
    from public.court_pricing_rules r
    left join public.court_weekly_schedules s
      on s.court_id = r.court_id and s.day_of_week = r.day_of_week
    where r.court_id = p_court_id
      and r.is_active
      and (
        s.court_id is null or not s.is_available
        or r.starts_minute < s.opens_minute
        or r.ends_minute > s.closes_minute
      )
  ) then
    raise exception 'Schedule would leave existing pricing rules outside operating hours' using errcode = '22023';
  end if;

  return query
  select s.* from public.court_weekly_schedules s
  where s.court_id = p_court_id
  order by s.day_of_week;
exception
  when check_violation or invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Invalid court schedule' using errcode = '22023';
end;
$$;

revoke execute on function public.save_my_court_schedule(uuid, jsonb) from public, anon;
grant execute on function public.save_my_court_schedule(uuid, jsonb) to authenticated;

create function public.create_my_pricing_rule(
  p_court_id uuid,
  p_day_of_week smallint,
  p_starts_minute smallint,
  p_ends_minute smallint,
  p_duration_minutes smallint,
  p_price_bob numeric
)
returns public.court_pricing_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_rule public.court_pricing_rules;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.courts c
    join public.venues v on v.id = c.venue_id
    where c.id = p_court_id and v.owner_id = v_user_id and v.status = 'approved'
  ) then
    raise exception 'Court not found' using errcode = '22023';
  end if;

  if p_day_of_week not between 0 and 6
     or p_starts_minute not between 0 and 1439
     or p_ends_minute not between 1 and 1440
     or p_starts_minute >= p_ends_minute
     or p_starts_minute % 30 <> 0
     or p_ends_minute % 30 <> 0
     or p_duration_minutes not in (30, 60)
     or p_price_bob <= 0 or p_price_bob > 100000 then
    raise exception 'Invalid pricing rule' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.court_durations d
    where d.court_id = p_court_id and d.duration_minutes = p_duration_minutes
  ) then
    raise exception 'Duration is not enabled for this court' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.court_weekly_schedules s
    where s.court_id = p_court_id
      and s.day_of_week = p_day_of_week
      and s.is_available
      and p_starts_minute >= s.opens_minute
      and p_ends_minute <= s.closes_minute
      and p_ends_minute - p_starts_minute >= p_duration_minutes
  ) then
    raise exception 'Pricing range must fit inside the court schedule' using errcode = '22023';
  end if;

  insert into public.court_pricing_rules (
    court_id, day_of_week, starts_minute, ends_minute, duration_minutes, price_bob, created_by
  ) values (
    p_court_id, p_day_of_week, p_starts_minute, p_ends_minute,
    p_duration_minutes, p_price_bob, v_user_id
  ) returning * into v_rule;

  return v_rule;
exception
  when exclusion_violation then
    raise exception 'Pricing rule overlaps an existing rule' using errcode = '22023';
  when check_violation or invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Invalid pricing rule' using errcode = '22023';
end;
$$;

revoke execute on function public.create_my_pricing_rule(uuid, smallint, smallint, smallint, smallint, numeric) from public, anon;
grant execute on function public.create_my_pricing_rule(uuid, smallint, smallint, smallint, smallint, numeric) to authenticated;

create function public.delete_my_pricing_rule(p_rule_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted_id uuid;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;

  delete from public.court_pricing_rules r
  using public.courts c, public.venues v
  where r.id = p_rule_id and c.id = r.court_id and v.id = c.venue_id
    and v.owner_id = v_user_id and v.status = 'approved'
  returning r.id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'Pricing rule not found' using errcode = '22023';
  end if;

  return v_deleted_id;
end;
$$;

revoke execute on function public.delete_my_pricing_rule(uuid) from public, anon;
grant execute on function public.delete_my_pricing_rule(uuid) to authenticated;

create function public.create_my_court_block(
  p_court_id uuid,
  p_starts_local timestamp,
  p_ends_local timestamp,
  p_kind public.court_block_kind,
  p_reason text default null
)
returns public.court_blocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_timezone text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_block public.court_blocks;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;

  select v.timezone into v_timezone
  from public.courts c
  join public.venues v on v.id = c.venue_id
  where c.id = p_court_id and v.owner_id = v_user_id and v.status = 'approved';

  if not found then
    raise exception 'Court not found' using errcode = '22023';
  end if;

  v_starts_at := p_starts_local at time zone v_timezone;
  v_ends_at := p_ends_local at time zone v_timezone;

  if v_starts_at >= v_ends_at
     or v_ends_at <= now()
     or v_ends_at - v_starts_at > interval '31 days'
     or (v_reason is not null and char_length(v_reason) not between 3 and 240) then
    raise exception 'Invalid court block' using errcode = '22023';
  end if;

  insert into public.court_blocks (court_id, starts_at, ends_at, kind, reason, created_by)
  values (p_court_id, v_starts_at, v_ends_at, p_kind, v_reason, v_user_id)
  returning * into v_block;

  return v_block;
exception
  when exclusion_violation then
    raise exception 'Court block overlaps an existing block' using errcode = '22023';
  when check_violation or invalid_text_representation then
    raise exception 'Invalid court block' using errcode = '22023';
end;
$$;

revoke execute on function public.create_my_court_block(uuid, timestamp, timestamp, public.court_block_kind, text) from public, anon;
grant execute on function public.create_my_court_block(uuid, timestamp, timestamp, public.court_block_kind, text) to authenticated;

create function public.delete_my_court_block(p_block_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted_id uuid;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;

  delete from public.court_blocks b
  using public.courts c, public.venues v
  where b.id = p_block_id and c.id = b.court_id and v.id = c.venue_id
    and v.owner_id = v_user_id and v.status = 'approved'
  returning b.id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'Court block not found' using errcode = '22023';
  end if;

  return v_deleted_id;
end;
$$;

revoke execute on function public.delete_my_court_block(uuid) from public, anon;
grant execute on function public.delete_my_court_block(uuid) to authenticated;

create function public.get_court_availability(p_court_id uuid, p_date date)
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
  order by candidate.candidate_start, candidate.candidate_duration;
end;
$$;

revoke execute on function public.get_court_availability(uuid, date) from public;
grant execute on function public.get_court_availability(uuid, date) to anon, authenticated;

commit;
