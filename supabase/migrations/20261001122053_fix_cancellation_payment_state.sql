begin;

create or replace function private.apply_booking_penalty(
  p_booking_id uuid,
  p_refund_amount numeric,
  p_penalty_amount numeric,
  p_policy_tier text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_order public.payment_orders;
  v_transaction_id uuid;
  v_venue_share_percentage numeric(5, 2) := 50;
  v_venue_share numeric(10, 2);
  v_platform_share numeric(10, 2);
  v_commission_collected numeric(10, 2);
  v_commission_receivable numeric(10, 2);
  v_original_venue_payable numeric(10, 2);
  v_venue_debit numeric(10, 2);
  v_venue_credit numeric(10, 2);
  v_debits numeric(10, 2);
  v_credits numeric(10, 2);
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  select * into v_order
  from public.payment_orders
  where booking_id = p_booking_id and status in ('paid', 'refunded_partial', 'refunded')
  order by paid_at desc nulls last
  limit 1
  for update;

  if v_booking.id is null or v_order.id is null
     or v_booking.payment_status not in ('paid', 'refunded_partial') then
    raise exception 'Paid booking required' using errcode = '22023';
  end if;
  if p_refund_amount < 0 or p_penalty_amount < 0
     or round(p_refund_amount + p_penalty_amount, 2) <> v_booking.deposit_amount_bob then
    raise exception 'Cancellation amounts do not match deposit' using errcode = '22023';
  end if;

  select coalesce((value #>> '{}')::numeric, 50)
  into v_venue_share_percentage
  from public.platform_settings
  where key = 'cancellation_venue_share_percentage';

  if v_venue_share_percentage not between 0 and 100 then
    raise exception 'Invalid cancellation venue share setting' using errcode = '22023';
  end if;

  v_venue_share := round(p_penalty_amount * v_venue_share_percentage / 100, 2);
  v_platform_share := p_penalty_amount - v_venue_share;
  v_commission_collected := least(v_booking.deposit_amount_bob, v_booking.commission_amount_bob);
  v_commission_receivable := v_booking.commission_amount_bob - v_commission_collected;
  v_original_venue_payable := v_booking.deposit_amount_bob - v_commission_collected;
  v_venue_debit := greatest(v_original_venue_payable - v_venue_share, 0);
  v_venue_credit := greatest(v_venue_share - v_original_venue_payable, 0);

  insert into public.ledger_transactions (
    booking_id, payment_order_id, kind, reference, description, metadata
  ) values (
    v_booking.id,
    v_order.id,
    'cancellation',
    'cancellation:' || v_booking.id::text,
    'Aplicación de política ' || p_policy_tier || ' para ' || v_booking.public_code,
    jsonb_build_object(
      'policy_tier', p_policy_tier,
      'refund_amount_bob', p_refund_amount,
      'penalty_amount_bob', p_penalty_amount,
      'platform_share_bob', v_platform_share,
      'venue_share_bob', v_venue_share,
      'actor_id', p_actor_id
    )
  ) returning id into v_transaction_id;

  if v_booking.commission_amount_bob > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'platform_commission_revenue', 'debit', v_booking.commission_amount_bob);
  end if;

  if v_commission_receivable > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'commission_receivable', 'credit', v_commission_receivable);
  end if;

  if v_venue_debit > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'venue_payable', 'debit', v_venue_debit);
  end if;

  if v_venue_credit > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'venue_payable', 'credit', v_venue_credit);
  end if;

  if v_platform_share > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'platform_cancellation_revenue', 'credit', v_platform_share);
  end if;

  if p_refund_amount > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'player_refund_payable', 'credit', p_refund_amount);

    insert into public.refunds (
      booking_id, payment_order_id, amount_bob, reason, requested_by
    ) values (
      v_booking.id, v_order.id, p_refund_amount,
      'Política de cancelación ' || p_policy_tier,
      p_actor_id
    );
  end if;

  select
    coalesce(sum(amount_bob) filter (where direction = 'debit'), 0),
    coalesce(sum(amount_bob) filter (where direction = 'credit'), 0)
  into v_debits, v_credits
  from public.ledger_entries
  where transaction_id = v_transaction_id;

  if v_debits <> v_credits then
    raise exception 'Unbalanced cancellation ledger transaction' using errcode = '23514';
  end if;

  update public.bookings
  set settlement_status = case
    when v_venue_share > 0 then 'pending'::public.settlement_status
    else 'not_due'::public.settlement_status
  end
  where id = v_booking.id;
end;
$$;

commit;
