begin;

create or replace function public.create_my_mock_payment_order(
  p_booking_id uuid,
  p_idempotency_key uuid
)
returns public.payment_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings;
  v_order public.payment_orders;
  v_provider_order_id text;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;

  if p_booking_id is null or p_idempotency_key is null then
    raise exception 'Invalid payment order request' using errcode = '22023';
  end if;

  if not coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'mock_payments_enabled'),
    false
  ) then
    raise exception 'Mock payments are disabled' using errcode = '42501';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id and player_id = v_user_id
  for update;

  if v_booking.id is null then
    raise exception 'Booking not found' using errcode = '22023';
  end if;

  if v_booking.status <> 'pending_payment' or v_booking.hold_expires_at <= now() then
    if v_booking.status = 'pending_payment' then
      perform set_config('canchea.booking_status_reason', 'hold_expired_before_payment', true);
      update public.bookings
      set status = 'expired', payment_status = 'failed'
      where id = v_booking.id;
      update public.payment_orders
      set status = 'expired', failed_at = now()
      where booking_id = v_booking.id and status = 'pending';
    end if;
    return null;
  end if;

  select * into v_order
  from public.payment_orders
  where booking_id = v_booking.id and status = 'pending'
  order by created_at desc
  limit 1;

  if v_order.id is not null then
    return v_order;
  end if;

  v_provider_order_id := 'mock_ord_' || encode(extensions.gen_random_bytes(12), 'hex');

  insert into public.payment_orders (
    booking_id,
    provider,
    provider_order_id,
    idempotency_key,
    amount_bob,
    currency,
    checkout_url,
    qr_payload,
    provider_metadata,
    expires_at
  ) values (
    v_booking.id,
    'mock',
    v_provider_order_id,
    p_idempotency_key,
    v_booking.deposit_amount_bob,
    'BOB',
    'canchea-mock://checkout/' || v_provider_order_id,
    'CANCHEA|MOCK|NO_PAGAR|' || v_booking.public_code || '|BOB|' || to_char(v_booking.deposit_amount_bob, 'FM999999990.00') || '|' || v_provider_order_id,
    jsonb_build_object('environment', 'development', 'real_money', false),
    v_booking.hold_expires_at
  ) returning * into v_order;

  update public.bookings
  set payment_status = 'pending'
  where id = v_booking.id;

  return v_order;
end;
$$;

commit;
