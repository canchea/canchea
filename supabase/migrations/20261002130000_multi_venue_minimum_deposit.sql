-- Seña mínima y soporte multi-sucursal.
--
-- 1. La seña online es el mayor entre el monto base configurado y la comisión
--    de CANCHEA, sin superar el precio. Así la comisión siempre queda cubierta
--    por la seña y CANCHEA no necesita cobrarle saldos al complejo. También
--    permite reservar horarios con precio menor al monto base.
-- 2. Un propietario puede administrar varias sucursales (complejos). Las
--    funciones que asumían un único complejo reciben ahora p_venue_id.

-- ---------------------------------------------------------------------------
-- Seña mínima
-- ---------------------------------------------------------------------------

create or replace function private.booking_deposit_for(
  p_price numeric,
  p_base_deposit numeric,
  p_commission numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select least(p_price, greatest(p_base_deposit, p_commission));
$$;

revoke execute on function private.booking_deposit_for(numeric, numeric, numeric) from public, anon, authenticated;

create or replace function public.get_booking_deposit_quote(p_price numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_deposit numeric(10, 2);
  v_commission_percentage numeric(5, 2);
begin
  if p_price is null or p_price <= 0 then
    raise exception 'Invalid price' using errcode = '22023';
  end if;

  select coalesce((value #>> '{}')::numeric, 50) into v_deposit
  from public.platform_settings where key = 'booking_deposit_amount';
  select coalesce((value #>> '{}')::numeric, 10) into v_commission_percentage
  from public.platform_settings where key = 'platform_commission_percentage';

  return private.booking_deposit_for(
    p_price,
    coalesce(v_deposit, 50),
    round(p_price * coalesce(v_commission_percentage, 10) / 100, 2)
  );
end;
$$;

revoke execute on function public.get_booking_deposit_quote(numeric) from public;
grant execute on function public.get_booking_deposit_quote(numeric) to anon, authenticated;

comment on function public.get_booking_deposit_quote(numeric) is
  'Seña que pagará el jugador para un precio dado: mayor entre el monto base y la comisión, sin superar el precio.';

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
     or v_commission_percentage not between 0 and 100 then
    raise exception 'Invalid booking configuration' using errcode = '22023';
  end if;

  v_commission := round(v_slot.price_bob * v_commission_percentage / 100, 2);
  v_deposit := private.booking_deposit_for(v_slot.price_bob, v_deposit, v_commission);
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
  v_refund_setting numeric(10, 2) := 30;
  v_penalty_setting numeric(10, 2) := 20;
  v_refund numeric(10, 2);
  v_penalty numeric(10, 2);
  v_tier text;
  v_new_status public.booking_status;
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

  select coalesce((value #>> '{}')::integer, 6) into v_threshold_hours
  from public.platform_settings where key = 'cancellation_threshold_hours';
  select coalesce((value #>> '{}')::numeric, 30) into v_refund_setting
  from public.platform_settings where key = 'deposit_refund_amount';
  select coalesce((value #>> '{}')::numeric, 20) into v_penalty_setting
  from public.platform_settings where key = 'cancellation_penalty_amount';

  if v_booking.starts_at >= now() + make_interval(hours => v_threshold_hours) then
    -- La seña puede superar el monto base para cubrir la comisión: la penalidad
    -- temprana se mantiene fija y el resto de la seña se devuelve.
    v_tier := 'early';
    v_penalty := least(v_penalty_setting, v_booking.deposit_amount_bob);
    v_refund := v_booking.deposit_amount_bob - v_penalty;
    v_new_status := 'refunded_partial';
  else
    v_tier := 'late';
    v_refund := 0;
    v_penalty := v_booking.deposit_amount_bob;
    v_new_status := 'cancelled';
  end if;

  perform set_config('canchea.booking_status_reason', 'player_cancellation_' || v_tier, true);

  update public.bookings
  set status = v_new_status,
      cancelled_by = v_user_id,
      cancellation_policy_tier = v_tier,
      refund_amount_bob = v_refund,
      penalty_amount_bob = v_penalty,
      payment_status = case when v_refund > 0 then 'refunded_partial'::public.payment_status else payment_status end
  where id = v_booking.id
  returning * into v_booking;

  perform private.apply_booking_penalty(v_booking.id, v_refund, v_penalty, v_tier, v_user_id);
  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Multi-sucursal
-- ---------------------------------------------------------------------------

alter table public.venues drop constraint if exists venues_owner_id_key;
create index if not exists venues_owner_id_idx on public.venues (owner_id, created_at);

drop function if exists public.save_my_venue(text, text, text, text, text, text, text, numeric, numeric, text[], jsonb);
drop function if exists public.register_my_venue_photo(text, public.venue_photo_kind, text);
drop function if exists public.save_my_court(uuid, text, text, text, text, smallint, numeric, numeric, boolean, boolean, smallint[], text[]);

create function public.save_my_venue(
  p_venue_id uuid,
  p_commercial_name text,
  p_description text,
  p_phone_e164 text,
  p_whatsapp_e164 text,
  p_address text,
  p_zone text,
  p_city text,
  p_latitude numeric,
  p_longitude numeric,
  p_service_slugs text[],
  p_hours jsonb
)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_venue public.venues;
  v_venue_id uuid;
  v_slug text;
  v_service_count integer;
  v_requested_service_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_commercial_name, ''))) not between 3 and 120
     or char_length(trim(coalesce(p_description, ''))) not between 30 and 2000
     or char_length(trim(coalesce(p_address, ''))) not between 5 and 240
     or char_length(trim(coalesce(p_zone, ''))) not between 2 and 100
     or char_length(trim(coalesce(p_city, ''))) not between 2 and 100 then
    raise exception 'Invalid venue text fields' using errcode = '22023';
  end if;

  if p_phone_e164 is null or p_phone_e164 !~ '^\+[1-9][0-9]{7,14}$'
     or p_whatsapp_e164 is null or p_whatsapp_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Phones must use E.164 format' using errcode = '22023';
  end if;

  if p_latitude is null or p_latitude not between -90 and 90
     or p_longitude is null or p_longitude not between -180 and 180 then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;

  if coalesce(array_length(p_service_slugs, 1), 0) < 1 then
    raise exception 'At least one service is required' using errcode = '22023';
  end if;

  if jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) <> 7 then
    raise exception 'Seven opening-hour entries are required' using errcode = '22023';
  end if;

  select * into v_venue
  from public.venues
  where id = p_venue_id and owner_id = v_user_id
  for update;

  if p_venue_id is not null and not found then
    raise exception 'Venue not found' using errcode = '42501';
  end if;

  if not found and (select count(*) from public.venues where owner_id = v_user_id) >= 20 then
    raise exception 'Venue limit reached' using errcode = '22023';
  end if;

  if found and v_venue.status not in ('draft', 'rejected', 'changes_requested') then
    raise exception 'Venue cannot be edited in its current status' using errcode = '42501';
  end if;

  if not found then
    v_venue_id := gen_random_uuid();
    v_slug := private.slugify(p_commercial_name) || '-' || left(v_venue_id::text, 8);

    insert into public.venues (
      id, owner_id, commercial_name, slug, description, phone_e164,
      whatsapp_e164, address, zone, city, latitude, longitude
    ) values (
      v_venue_id, v_user_id, trim(p_commercial_name), v_slug, trim(p_description),
      p_phone_e164, p_whatsapp_e164, trim(p_address), trim(p_zone), trim(p_city),
      p_latitude, p_longitude
    ) returning * into v_venue;

    insert into public.venue_status_history (venue_id, from_status, to_status, changed_by)
    values (v_venue.id, null, 'draft', v_user_id);
  else
    update public.venues
    set commercial_name = trim(p_commercial_name),
        description = trim(p_description),
        phone_e164 = p_phone_e164,
        whatsapp_e164 = p_whatsapp_e164,
        address = trim(p_address),
        zone = trim(p_zone),
        city = trim(p_city),
        latitude = p_latitude,
        longitude = p_longitude
    where id = v_venue.id
    returning * into v_venue;
  end if;

  select count(*), count(distinct requested_slug)
  into v_service_count, v_requested_service_count
  from unnest(p_service_slugs) requested_slug
  join public.services s on s.slug = requested_slug and s.is_active;

  if v_service_count <> coalesce(array_length(p_service_slugs, 1), 0)
     or v_requested_service_count <> v_service_count then
    raise exception 'Unknown or duplicate service' using errcode = '22023';
  end if;

  delete from public.venue_services where venue_id = v_venue.id;
  insert into public.venue_services (venue_id, service_id)
  select v_venue.id, s.id
  from public.services s
  where s.slug = any(p_service_slugs) and s.is_active;

  delete from public.venue_opening_hours where venue_id = v_venue.id;
  insert into public.venue_opening_hours (venue_id, day_of_week, opens_at, closes_at, is_closed)
  select
    v_venue.id,
    (item ->> 'day_of_week')::smallint,
    case when (item ->> 'is_closed')::boolean then null else (item ->> 'opens_at')::time end,
    case when (item ->> 'is_closed')::boolean then null else (item ->> 'closes_at')::time end,
    (item ->> 'is_closed')::boolean
  from jsonb_array_elements(p_hours) item;

  return v_venue;
exception
  when unique_violation or check_violation or invalid_text_representation then
    raise exception 'Invalid or duplicated venue data' using errcode = '22023';
end;
$$;

revoke execute on function public.save_my_venue(uuid, text, text, text, text, text, text, text, numeric, numeric, text[], jsonb) from public, anon;
grant execute on function public.save_my_venue(uuid, text, text, text, text, text, text, text, numeric, numeric, text[], jsonb) to authenticated;

create function public.register_my_venue_photo(
  p_venue_id uuid,
  p_object_path text,
  p_kind public.venue_photo_kind,
  p_alt_text text
)
returns public.venue_photos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_venue public.venues;
  v_photo public.venue_photos;
begin
  select * into v_venue
  from public.venues
  where id = p_venue_id and owner_id = v_user_id;

  if v_user_id is null or not found or v_venue.status not in ('draft', 'rejected', 'changes_requested') then
    raise exception 'Editable venue required' using errcode = '42501';
  end if;

  if p_object_path is null
     or split_part(p_object_path, '/', 1) <> v_venue.id::text
     or p_object_path ~ '(^|/)\.\.?(/|$)'
     or char_length(trim(coalesce(p_alt_text, ''))) not between 3 and 160 then
    raise exception 'Invalid photo data' using errcode = '22023';
  end if;

  if p_kind = 'gallery' and (
    select count(*) from public.venue_photos where venue_id = v_venue.id and kind = 'gallery'
  ) >= 10 then
    raise exception 'Gallery limit reached' using errcode = '22023';
  end if;

  insert into public.venue_photos (venue_id, object_path, kind, alt_text, created_by)
  values (v_venue.id, p_object_path, p_kind, trim(p_alt_text), v_user_id)
  returning * into v_photo;

  return v_photo;
end;
$$;

revoke execute on function public.register_my_venue_photo(uuid, text, public.venue_photo_kind, text) from public, anon;
grant execute on function public.register_my_venue_photo(uuid, text, public.venue_photo_kind, text) to authenticated;

create function public.save_my_court(
  p_venue_id uuid,
  p_court_id uuid,
  p_name text,
  p_sport_slug text,
  p_modality_slug text,
  p_surface_slug text,
  p_capacity smallint,
  p_length_m numeric,
  p_width_m numeric,
  p_is_roofed boolean,
  p_has_lighting boolean,
  p_duration_minutes smallint[],
  p_feature_slugs text[]
)
returns public.courts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_venue public.venues;
  v_court public.courts;
  v_court_id uuid;
  v_sport_id bigint;
  v_modality_id bigint;
  v_surface_id bigint;
  v_feature_count integer;
  v_requested_feature_count integer;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;

  select * into v_venue
  from public.venues
  where id = p_venue_id and owner_id = v_user_id and status = 'approved';

  if not found then
    raise exception 'An approved venue is required' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_name, ''))) not between 3 and 100
     or p_capacity is null or p_capacity not between 1 and 100
     or p_length_m is null or p_length_m not between 3 and 200
     or p_width_m is null or p_width_m not between 2 and 150 then
    raise exception 'Invalid court data' using errcode = '22023';
  end if;

  if coalesce(array_length(p_duration_minutes, 1), 0) < 1
     or exists (select 1 from unnest(p_duration_minutes) value where value not in (30, 60))
     or (select count(*) from unnest(p_duration_minutes)) <> (select count(distinct value) from unnest(p_duration_minutes) value) then
    raise exception 'Invalid or duplicate durations' using errcode = '22023';
  end if;

  select id into v_sport_id from public.sports where slug = p_sport_slug and is_active;
  select id into v_modality_id from public.sport_modalities where slug = p_modality_slug and sport_id = v_sport_id and is_active;
  select id into v_surface_id from public.court_surfaces where slug = p_surface_slug and is_active;

  if v_sport_id is null or v_modality_id is null or v_surface_id is null then
    raise exception 'Unknown sport, modality or surface' using errcode = '22023';
  end if;

  select count(*), count(distinct requested_slug)
  into v_feature_count, v_requested_feature_count
  from unnest(coalesce(p_feature_slugs, array[]::text[])) requested_slug
  join public.court_features f on f.slug = requested_slug and f.is_active;

  if v_feature_count <> coalesce(array_length(p_feature_slugs, 1), 0)
     or v_requested_feature_count <> v_feature_count then
    raise exception 'Unknown or duplicate feature' using errcode = '22023';
  end if;

  if p_court_id is null then
    v_court_id := gen_random_uuid();
    insert into public.courts (
      id, venue_id, sport_id, modality_id, surface_id, name, slug, capacity,
      length_m, width_m, is_roofed, has_lighting
    ) values (
      v_court_id, v_venue.id, v_sport_id, v_modality_id, v_surface_id,
      trim(p_name), private.slugify(p_name) || '-' || left(v_court_id::text, 8), p_capacity,
      p_length_m, p_width_m, coalesce(p_is_roofed, false), coalesce(p_has_lighting, false)
    ) returning * into v_court;
  else
    update public.courts
    set sport_id = v_sport_id,
        modality_id = v_modality_id,
        surface_id = v_surface_id,
        name = trim(p_name),
        capacity = p_capacity,
        length_m = p_length_m,
        width_m = p_width_m,
        is_roofed = coalesce(p_is_roofed, false),
        has_lighting = coalesce(p_has_lighting, false)
    where id = p_court_id and venue_id = v_venue.id
    returning * into v_court;

    if not found then
      raise exception 'Court not found' using errcode = '22023';
    end if;
  end if;

  delete from public.court_durations where court_id = v_court.id;
  insert into public.court_durations (court_id, duration_minutes)
  select v_court.id, value from unnest(p_duration_minutes) value;

  delete from public.court_feature_assignments where court_id = v_court.id;
  insert into public.court_feature_assignments (court_id, feature_id)
  select v_court.id, f.id
  from public.court_features f
  where f.slug = any(coalesce(p_feature_slugs, array[]::text[])) and f.is_active;

  return v_court;
exception
  when unique_violation or check_violation or invalid_text_representation then
    raise exception 'Invalid or duplicated court data' using errcode = '22023';
end;
$$;

revoke execute on function public.save_my_court(uuid, uuid, text, text, text, text, smallint, numeric, numeric, boolean, boolean, smallint[], text[]) from public, anon;
grant execute on function public.save_my_court(uuid, uuid, text, text, text, text, smallint, numeric, numeric, boolean, boolean, smallint[], text[]) to authenticated;
