begin;

create or replace function public.simulate_my_mock_payment(
  p_payment_order_id uuid,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_order public.payment_orders;
  v_result jsonb;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;

  if not coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'mock_payments_enabled'),
    false
  ) then
    raise exception 'Mock payments are disabled' using errcode = '42501';
  end if;

  select payment_order.* into v_order
  from public.payment_orders payment_order
  join public.bookings booking on booking.id = payment_order.booking_id
  where payment_order.id = p_payment_order_id
    and payment_order.provider = 'mock'
    and booking.player_id = v_user_id;

  if v_order.id is null or p_idempotency_key is null then
    raise exception 'Payment order not found' using errcode = '22023';
  end if;

  v_result := private.process_payment_event(
    'mock',
    'mock_evt_' || p_idempotency_key::text,
    v_order.provider_order_id,
    'payment.paid',
    v_order.amount_bob,
    v_order.currency,
    jsonb_build_object(
      'source', 'player_test_action',
      'payment_order_id', v_order.id,
      'idempotency_key', p_idempotency_key,
      'real_money', false
    )
  );

  update public.payment_webhook_events
  set signature_valid = false
  where provider = 'mock'
    and provider_event_id = 'mock_evt_' || p_idempotency_key::text;

  return v_result;
end;
$$;

comment on column public.payment_webhook_events.signature_valid is
  'True únicamente cuando la entrega provino de un webhook cuya firma verificó el servidor; false para simulaciones autenticadas.';

commit;
