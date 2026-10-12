begin;

-- CANCHEA no cobra al jugador durante el piloto. Cada complejo mantiene un
-- saldo prepago del que se reserva la comisión al crear una reserva y se
-- descuenta definitivamente únicamente cuando el servicio se completa.

create type public.venue_billing_status as enum (
  'active',
  'low_balance',
  'suspended'
);

create type public.venue_wallet_transaction_kind as enum (
  'pilot_credit',
  'top_up',
  'commission_hold',
  'commission_release',
  'commission_capture',
  'adjustment'
);

create type public.venue_commission_hold_status as enum (
  'held',
  'captured',
  'released'
);

insert into public.platform_settings (key, value, description, is_public) values
  ('owner_pilot_credit_bob', '200'::jsonb, 'Crédito promocional inicial para probar las reservas sin cobro al jugador.', false),
  ('owner_low_balance_threshold_bob', '30'::jsonb, 'Saldo disponible desde el cual se advierte al complejo que debe recargar.', false)
on conflict (key) do nothing;

create table public.venue_billing_accounts (
  venue_id uuid primary key references public.venues (id) on delete restrict,
  available_balance_bob numeric(12, 2) not null default 0,
  reserved_balance_bob numeric(12, 2) not null default 0,
  status public.venue_billing_status not null default 'suspended',
  low_balance_threshold_bob numeric(10, 2) not null default 30,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint venue_billing_accounts_balances_valid check (
    available_balance_bob >= 0
    and reserved_balance_bob >= 0
    and low_balance_threshold_bob >= 0
  )
);

create table public.venue_commission_holds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  venue_id uuid not null references public.venues (id) on delete restrict,
  amount_bob numeric(10, 2) not null,
  status public.venue_commission_hold_status not null default 'held',
  release_reason text,
  held_at timestamptz not null default timezone('utc', now()),
  finalized_at timestamptz,
  constraint venue_commission_holds_amount_positive check (amount_bob > 0),
  constraint venue_commission_holds_release_reason_length check (
    release_reason is null or char_length(release_reason) between 3 and 120
  )
);

create table public.venue_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete restrict,
  commission_hold_id uuid references public.venue_commission_holds (id) on delete restrict,
  kind public.venue_wallet_transaction_kind not null,
  amount_bob numeric(10, 2) not null,
  available_balance_after_bob numeric(12, 2) not null,
  reserved_balance_after_bob numeric(12, 2) not null,
  reference text not null unique,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint venue_wallet_transactions_amount_positive check (amount_bob > 0),
  constraint venue_wallet_transactions_balances_valid check (
    available_balance_after_bob >= 0 and reserved_balance_after_bob >= 0
  ),
  constraint venue_wallet_transactions_reference_length check (char_length(reference) between 4 and 160),
  constraint venue_wallet_transactions_description_length check (char_length(description) between 3 and 240),
  constraint venue_wallet_transactions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index venue_commission_holds_venue_status_idx
  on public.venue_commission_holds (venue_id, status, held_at desc);
create index venue_wallet_transactions_venue_created_idx
  on public.venue_wallet_transactions (venue_id, created_at desc);
create index venue_wallet_transactions_booking_idx
  on public.venue_wallet_transactions (booking_id)
  where booking_id is not null;

create trigger venue_billing_accounts_set_updated_at
before update on public.venue_billing_accounts
for each row execute function private.set_updated_at();

alter table public.venue_billing_accounts enable row level security;
alter table public.venue_commission_holds enable row level security;
alter table public.venue_wallet_transactions enable row level security;

revoke all on table public.venue_billing_accounts,
  public.venue_commission_holds,
  public.venue_wallet_transactions
from anon, authenticated;

grant select on table public.venue_billing_accounts,
  public.venue_commission_holds,
  public.venue_wallet_transactions
to authenticated;

create policy "venue_billing_accounts_owner_or_admin_read"
on public.venue_billing_accounts for select to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id and v.owner_id = (select auth.uid())
  )
  or (select private.current_user_role()) = 'super_admin'
);

create policy "venue_commission_holds_owner_or_admin_read"
on public.venue_commission_holds for select to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id and v.owner_id = (select auth.uid())
  )
  or (select private.current_user_role()) = 'super_admin'
);

create policy "venue_wallet_transactions_owner_or_admin_read"
on public.venue_wallet_transactions for select to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id and v.owner_id = (select auth.uid())
  )
  or (select private.current_user_role()) = 'super_admin'
);

create function private.refresh_venue_billing_status(p_venue_id uuid)
returns public.venue_billing_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.venue_billing_accounts;
begin
  update public.venue_billing_accounts
  set status = case
    when available_balance_bob <= 0 then 'suspended'::public.venue_billing_status
    when available_balance_bob <= low_balance_threshold_bob then 'low_balance'::public.venue_billing_status
    else 'active'::public.venue_billing_status
  end
  where venue_id = p_venue_id
  returning * into v_account;

  return v_account;
end;
$$;

create function private.initialize_venue_billing_account(p_venue_id uuid)
returns public.venue_billing_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credit numeric(10, 2) := 200;
  v_threshold numeric(10, 2) := 30;
  v_account public.venue_billing_accounts;
begin
  if not exists (
    select 1 from public.venues
    where id = p_venue_id and status = 'approved'
  ) then
    raise exception 'Approved venue required' using errcode = '22023';
  end if;

  select coalesce((value #>> '{}')::numeric, 200)
  into v_credit
  from public.platform_settings
  where key = 'owner_pilot_credit_bob';

  select coalesce((value #>> '{}')::numeric, 30)
  into v_threshold
  from public.platform_settings
  where key = 'owner_low_balance_threshold_bob';

  v_credit := coalesce(v_credit, 200);
  v_threshold := coalesce(v_threshold, 30);

  insert into public.venue_billing_accounts (
    venue_id,
    available_balance_bob,
    reserved_balance_bob,
    status,
    low_balance_threshold_bob
  ) values (
    p_venue_id,
    v_credit,
    0,
    case
      when v_credit <= 0 then 'suspended'::public.venue_billing_status
      when v_credit <= v_threshold then 'low_balance'::public.venue_billing_status
      else 'active'::public.venue_billing_status
    end,
    v_threshold
  )
  on conflict (venue_id) do nothing
  returning * into v_account;

  if v_account.venue_id is not null and v_credit > 0 then
    insert into public.venue_wallet_transactions (
      venue_id,
      kind,
      amount_bob,
      available_balance_after_bob,
      reserved_balance_after_bob,
      reference,
      description,
      metadata
    ) values (
      p_venue_id,
      'pilot_credit',
      v_credit,
      v_credit,
      0,
      'pilot-credit:' || p_venue_id::text,
      'Crédito promocional del piloto CANCHEA',
      jsonb_build_object('source', 'pilot_launch')
    );
  end if;

  if v_account.venue_id is null then
    select * into v_account
    from public.venue_billing_accounts
    where venue_id = p_venue_id;
  end if;

  return v_account;
end;
$$;

create function private.initialize_approved_venue_billing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform private.initialize_venue_billing_account(new.id);
  end if;
  return new;
end;
$$;

create trigger venues_initialize_billing_account
after insert or update of status on public.venues
for each row execute function private.initialize_approved_venue_billing();

do $$
declare
  v_venue record;
begin
  for v_venue in select id from public.venues where status = 'approved' loop
    perform private.initialize_venue_billing_account(v_venue.id);
  end loop;
end;
$$;

create function private.hold_booking_commission(
  p_booking_id uuid,
  p_venue_id uuid,
  p_amount_bob numeric
)
returns public.venue_commission_holds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.venue_billing_accounts;
  v_hold public.venue_commission_holds;
begin
  if p_amount_bob <= 0 then
    return null;
  end if;

  perform private.initialize_venue_billing_account(p_venue_id);

  select * into v_account
  from public.venue_billing_accounts
  where venue_id = p_venue_id
  for update;

  if v_account.available_balance_bob < p_amount_bob then
    raise exception 'VENUE_BALANCE_LOW' using errcode = 'P0001';
  end if;

  update public.venue_billing_accounts
  set available_balance_bob = available_balance_bob - p_amount_bob,
      reserved_balance_bob = reserved_balance_bob + p_amount_bob
  where venue_id = p_venue_id
  returning * into v_account;

  insert into public.venue_commission_holds (booking_id, venue_id, amount_bob)
  values (p_booking_id, p_venue_id, p_amount_bob)
  returning * into v_hold;

  insert into public.venue_wallet_transactions (
    venue_id, booking_id, commission_hold_id, kind, amount_bob,
    available_balance_after_bob, reserved_balance_after_bob,
    reference, description, metadata
  ) values (
    p_venue_id, p_booking_id, v_hold.id, 'commission_hold', p_amount_bob,
    v_account.available_balance_bob, v_account.reserved_balance_bob,
    'booking:' || p_booking_id::text || ':hold',
    'Comisión reservada al confirmar la reserva',
    jsonb_build_object('booking_id', p_booking_id)
  );

  perform private.refresh_venue_billing_status(p_venue_id);
  return v_hold;
end;
$$;

create function private.release_booking_commission(
  p_booking_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold public.venue_commission_holds;
  v_account public.venue_billing_accounts;
begin
  select * into v_hold
  from public.venue_commission_holds
  where booking_id = p_booking_id
  for update;

  if v_hold.id is null or v_hold.status <> 'held' then
    return;
  end if;

  update public.venue_billing_accounts
  set available_balance_bob = available_balance_bob + v_hold.amount_bob,
      reserved_balance_bob = reserved_balance_bob - v_hold.amount_bob
  where venue_id = v_hold.venue_id
  returning * into v_account;

  update public.venue_commission_holds
  set status = 'released',
      release_reason = left(coalesce(nullif(trim(p_reason), ''), 'booking_released'), 120),
      finalized_at = timezone('utc', now())
  where id = v_hold.id;

  insert into public.venue_wallet_transactions (
    venue_id, booking_id, commission_hold_id, kind, amount_bob,
    available_balance_after_bob, reserved_balance_after_bob,
    reference, description, metadata
  ) values (
    v_hold.venue_id, p_booking_id, v_hold.id, 'commission_release', v_hold.amount_bob,
    v_account.available_balance_bob, v_account.reserved_balance_bob,
    'booking:' || p_booking_id::text || ':release',
    'Comisión liberada al saldo disponible',
    jsonb_build_object('reason', coalesce(p_reason, 'booking_released'))
  );

  perform private.refresh_venue_billing_status(v_hold.venue_id);
end;
$$;

create function private.capture_booking_commission(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hold public.venue_commission_holds;
  v_account public.venue_billing_accounts;
begin
  select * into v_hold
  from public.venue_commission_holds
  where booking_id = p_booking_id
  for update;

  if v_hold.id is null or v_hold.status <> 'held' then
    return;
  end if;

  update public.venue_billing_accounts
  set reserved_balance_bob = reserved_balance_bob - v_hold.amount_bob
  where venue_id = v_hold.venue_id
  returning * into v_account;

  update public.venue_commission_holds
  set status = 'captured', finalized_at = timezone('utc', now())
  where id = v_hold.id;

  insert into public.venue_wallet_transactions (
    venue_id, booking_id, commission_hold_id, kind, amount_bob,
    available_balance_after_bob, reserved_balance_after_bob,
    reference, description, metadata
  ) values (
    v_hold.venue_id, p_booking_id, v_hold.id, 'commission_capture', v_hold.amount_bob,
    v_account.available_balance_bob, v_account.reserved_balance_bob,
    'booking:' || p_booking_id::text || ':capture',
    'Comisión cobrada por una reserva completada',
    jsonb_build_object('booking_id', p_booking_id)
  );

  perform private.refresh_venue_billing_status(v_hold.venue_id);
end;
$$;

revoke execute on function private.refresh_venue_billing_status(uuid),
  private.initialize_venue_billing_account(uuid),
  private.initialize_approved_venue_billing(),
  private.hold_booking_commission(uuid, uuid, numeric),
  private.release_booking_commission(uuid, text),
  private.capture_booking_commission(uuid)
from public, anon, authenticated;

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
  v_venue_id uuid;
  v_owner_id uuid;
  v_min_advance integer := 60;
  v_commission_percentage numeric(5, 2) := 10;
  v_management_access boolean := false;
begin
  select v.timezone, v.id, v.owner_id
  into v_timezone, v_venue_id, v_owner_id
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

  v_management_access := v_owner_id = (select auth.uid())
    or (select private.current_user_role()) = 'super_admin';

  select coalesce(
    (select (value #>> '{}')::integer from public.platform_settings where key = 'booking_min_advance_minutes'),
    60
  ) into v_min_advance;

  select coalesce(
    (select (value #>> '{}')::numeric from public.platform_settings where key = 'platform_commission_percentage'),
    10
  ) into v_commission_percentage;

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
      on d.court_id = s.court_id and d.duration_minutes = 60
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
    and (
      v_management_access
      or exists (
        select 1
        from public.venue_billing_accounts account
        where account.venue_id = v_venue_id
          and account.status <> 'suspended'
          and account.available_balance_bob >= round(candidate.candidate_price * v_commission_percentage / 100, 2)
      )
    )
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
          or (booking.status = 'pending_payment' and booking.hold_expires_at > now())
        )
    )
  order by candidate.candidate_start;
end;
$$;

comment on function public.get_court_availability(uuid, date)
is 'Returns one-hour availability. Public booking is paused automatically when the venue wallet cannot cover its commission.';

revoke execute on function public.get_court_availability(uuid, date) from public;
grant execute on function public.get_court_availability(uuid, date) to anon, authenticated;

create or replace function public.create_booking_hold(
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
  v_commission_percentage numeric(5, 2) := 10;
  v_commission numeric(10, 2);
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;

  if p_court_id is null or p_starts_at is null or p_duration_minutes <> 60 then
    raise exception 'Invalid booking slot' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_court_id::text, 0));

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

  select coalesce((value #>> '{}')::numeric, 10)
  into v_commission_percentage
  from public.platform_settings
  where key = 'platform_commission_percentage';

  v_commission_percentage := coalesce(v_commission_percentage, 10);
  if v_commission_percentage not between 0 and 100 then
    raise exception 'Invalid booking configuration' using errcode = '22023';
  end if;

  v_commission := round(v_slot.price_bob * v_commission_percentage / 100, 2);
  perform set_config('canchea.booking_status_reason', 'booking_confirmed_without_prepayment', true);

  insert into public.bookings (
    public_code,
    player_id,
    court_id,
    venue_id,
    status,
    starts_at,
    ends_at,
    duration_minutes,
    total_price_bob,
    deposit_amount_bob,
    commission_percentage,
    commission_amount_bob,
    venue_net_amount_bob,
    remaining_balance_bob,
    hold_expires_at,
    confirmed_at,
    payment_status,
    settlement_status
  ) values (
    private.generate_booking_code(),
    v_user_id,
    p_court_id,
    v_venue_id,
    'confirmed',
    v_slot.starts_at,
    v_slot.ends_at,
    60,
    v_slot.price_bob,
    0,
    v_commission_percentage,
    v_commission,
    v_slot.price_bob - v_commission,
    v_slot.price_bob,
    null,
    timezone('utc', now()),
    'unpaid',
    'pending'
  ) returning * into v_booking;

  perform private.hold_booking_commission(v_booking.id, v_venue_id, v_commission);
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

create or replace function public.cancel_my_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings;
  v_threshold_hours integer := 6;
  v_tier text;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id and player_id = v_user_id
  for update;

  if v_booking.id is null or v_booking.status <> 'confirmed' then
    raise exception 'Confirmed booking required' using errcode = '22023';
  end if;
  if v_booking.starts_at <= now() then
    raise exception 'Booking already started' using errcode = '22023';
  end if;

  select coalesce((value #>> '{}')::integer, 6)
  into v_threshold_hours
  from public.platform_settings
  where key = 'cancellation_threshold_hours';

  v_tier := case
    when v_booking.starts_at >= now() + make_interval(hours => coalesce(v_threshold_hours, 6)) then 'early'
    else 'late'
  end;

  perform set_config('canchea.booking_status_reason', 'player_cancellation_' || v_tier, true);

  update public.bookings
  set status = 'cancelled',
      cancelled_by = v_user_id,
      cancellation_policy_tier = v_tier,
      refund_amount_bob = 0,
      penalty_amount_bob = 0,
      settlement_status = 'not_due'
  where id = v_booking.id
  returning * into v_booking;

  perform private.release_booking_commission(v_booking.id, 'player_cancellation_' || v_tier);
  return v_booking;
end;
$$;

revoke execute on function public.cancel_my_booking(uuid) from public, anon;
grant execute on function public.cancel_my_booking(uuid) to authenticated;

create or replace function public.owner_update_booking_status(
  p_booking_id uuid,
  p_action text
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;

  select b.* into v_booking
  from public.bookings b
  join public.venues v on v.id = b.venue_id
  where b.id = p_booking_id and v.owner_id = v_user_id
  for update of b;

  if v_booking.id is null then
    raise exception 'Booking not found' using errcode = '22023';
  end if;

  if p_action = 'start' then
    if v_booking.status <> 'confirmed' or v_booking.starts_at > now() + interval '15 minutes' then
      raise exception 'Booking cannot be started yet' using errcode = '22023';
    end if;
    perform set_config('canchea.booking_status_reason', 'venue_started_service', true);
    update public.bookings set status = 'in_progress'
    where id = v_booking.id returning * into v_booking;
  elsif p_action = 'complete' then
    if v_booking.status <> 'in_progress' or v_booking.ends_at > now() + interval '15 minutes' then
      raise exception 'Booking cannot be completed yet' using errcode = '22023';
    end if;
    perform set_config('canchea.booking_status_reason', 'venue_completed_service', true);
    update public.bookings
    set status = 'completed',
        completed_by = v_user_id,
        payment_status = 'paid',
        settlement_status = 'settled'
    where id = v_booking.id returning * into v_booking;
    perform private.capture_booking_commission(v_booking.id);
  elsif p_action = 'no_show' then
    if v_booking.status not in ('confirmed', 'in_progress') or v_booking.ends_at > now() then
      raise exception 'No-show can only be marked after the booking ends' using errcode = '22023';
    end if;
    perform set_config('canchea.booking_status_reason', 'venue_marked_no_show', true);
    update public.bookings
    set status = 'no_show',
        no_show_at = now(),
        cancelled_by = v_user_id,
        cancellation_policy_tier = 'no_show',
        refund_amount_bob = 0,
        penalty_amount_bob = 0,
        settlement_status = 'not_due'
    where id = v_booking.id returning * into v_booking;
    perform private.release_booking_commission(v_booking.id, 'player_no_show');
  else
    raise exception 'Invalid owner booking action' using errcode = '22023';
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.owner_update_booking_status(uuid, text) from public, anon;
grant execute on function public.owner_update_booking_status(uuid, text) to authenticated;

create function public.admin_credit_venue_wallet(
  p_venue_id uuid,
  p_amount_bob numeric,
  p_reference text,
  p_note text default null
)
returns public.venue_billing_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account public.venue_billing_accounts;
  v_reference text := trim(coalesce(p_reference, ''));
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_user_id is null or (select private.current_user_role()) <> 'super_admin' then
    raise exception 'Super admin role required' using errcode = '42501';
  end if;
  if p_amount_bob is null or p_amount_bob <= 0 or p_amount_bob > 100000 then
    raise exception 'Invalid top-up amount' using errcode = '22023';
  end if;
  if char_length(v_reference) not between 4 and 160 then
    raise exception 'A unique payment reference is required' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 240 then
    raise exception 'Top-up note is too long' using errcode = '22023';
  end if;

  perform private.initialize_venue_billing_account(p_venue_id);

  update public.venue_billing_accounts
  set available_balance_bob = available_balance_bob + round(p_amount_bob, 2)
  where venue_id = p_venue_id
  returning * into v_account;

  insert into public.venue_wallet_transactions (
    venue_id, kind, amount_bob, available_balance_after_bob,
    reserved_balance_after_bob, reference, description, metadata, created_by
  ) values (
    p_venue_id, 'top_up', round(p_amount_bob, 2), v_account.available_balance_bob,
    v_account.reserved_balance_bob, v_reference,
    coalesce(v_note, 'Recarga verificada por CANCHEA'),
    jsonb_build_object('verified_manually', true), v_user_id
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id, 'venue_wallet.credited', 'venue', p_venue_id::text,
    jsonb_build_object('amount_bob', round(p_amount_bob, 2), 'reference', v_reference)
  );

  return private.refresh_venue_billing_status(p_venue_id);
end;
$$;

revoke execute on function public.admin_credit_venue_wallet(uuid, numeric, text, text)
  from public, anon;
grant execute on function public.admin_credit_venue_wallet(uuid, numeric, text, text)
  to authenticated;

comment on table public.venue_billing_accounts
is 'Saldo prepago de cada complejo para cubrir comisiones CANCHEA sin cobrar al jugador.';
comment on table public.venue_commission_holds
is 'Comisiones separadas al confirmar reservas y capturadas únicamente al completar el servicio.';
comment on table public.venue_wallet_transactions
is 'Libro inmutable de créditos, retenciones, liberaciones y cobros del saldo del complejo.';
comment on function public.admin_credit_venue_wallet(uuid, numeric, text, text)
is 'Acredita una recarga manual verificada. Solo puede ejecutarla un superadministrador.';

commit;
