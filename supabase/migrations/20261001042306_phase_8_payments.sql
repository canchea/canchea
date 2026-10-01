begin;

create type public.payment_status as enum (
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded_partial',
  'refunded'
);

create type public.settlement_status as enum (
  'not_due',
  'pending',
  'settled',
  'reversed'
);

create type public.payment_order_status as enum (
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled',
  'refunded_partial',
  'refunded'
);

create type public.payment_event_status as enum (
  'received',
  'processed',
  'ignored',
  'failed'
);

create type public.ledger_transaction_kind as enum (
  'deposit_payment',
  'refund',
  'settlement',
  'adjustment'
);

create type public.ledger_account as enum (
  'platform_cash',
  'platform_commission_revenue',
  'commission_receivable',
  'venue_payable',
  'player_refund_payable'
);

create type public.ledger_direction as enum ('debit', 'credit');

alter table public.bookings
  add column payment_status public.payment_status not null default 'unpaid',
  add column settlement_status public.settlement_status not null default 'not_due',
  add column deposit_paid_at timestamptz;

comment on column public.bookings.payment_status is 'Estado del cobro de la seña, separado del estado operativo de la reserva.';
comment on column public.bookings.settlement_status is 'Estado de la liquidación financiera entre CANCHEA y el complejo.';

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  provider text not null,
  provider_order_id text not null,
  idempotency_key uuid not null unique,
  status public.payment_order_status not null default 'pending',
  amount_bob numeric(10, 2) not null,
  currency text not null default 'BOB',
  checkout_url text,
  qr_payload text,
  provider_metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_orders_provider_format check (provider ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint payment_orders_provider_order_id_length check (char_length(provider_order_id) between 8 and 160),
  constraint payment_orders_amount_positive check (amount_bob > 0),
  constraint payment_orders_currency_bob check (currency = 'BOB'),
  constraint payment_orders_provider_metadata_object check (jsonb_typeof(provider_metadata) = 'object'),
  constraint payment_orders_provider_reference_unique unique (provider, provider_order_id)
);

comment on table public.payment_orders is 'Intentos de cobro de la seña. El proveedor mock se usa únicamente para desarrollo y pruebas.';
comment on column public.payment_orders.qr_payload is 'Payload que un proveedor QR real podrá firmar o codificar; el mock no representa una solicitud de pago real.';

create unique index payment_orders_one_pending_per_booking_idx
  on public.payment_orders (booking_id)
  where status = 'pending';
create unique index payment_orders_one_success_per_booking_idx
  on public.payment_orders (booking_id)
  where status in ('paid', 'refunded_partial', 'refunded');
create index payment_orders_booking_created_idx
  on public.payment_orders (booking_id, created_at desc);
create index payment_orders_status_expires_idx
  on public.payment_orders (status, expires_at)
  where status = 'pending';

create trigger payment_orders_set_updated_at
before update on public.payment_orders
for each row execute function private.set_updated_at();

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  status public.payment_event_status not null default 'received',
  signature_valid boolean not null default false,
  payment_order_id uuid references public.payment_orders (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  payload jsonb not null,
  error_code text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  constraint payment_webhook_events_provider_format check (provider ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint payment_webhook_events_event_id_length check (char_length(provider_event_id) between 8 and 180),
  constraint payment_webhook_events_event_type_format check (event_type ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  constraint payment_webhook_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint payment_webhook_events_provider_event_unique unique (provider, provider_event_id)
);

comment on table public.payment_webhook_events is 'Bandeja idempotente y auditable de notificaciones de proveedores de pago.';

create index payment_webhook_events_order_idx on public.payment_webhook_events (payment_order_id)
  where payment_order_id is not null;
create index payment_webhook_events_booking_idx on public.payment_webhook_events (booking_id)
  where booking_id is not null;
create index payment_webhook_events_status_received_idx on public.payment_webhook_events (status, received_at desc);

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  payment_order_id uuid references public.payment_orders (id) on delete restrict,
  kind public.ledger_transaction_kind not null,
  reference text not null unique,
  description text not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ledger_transactions_reference_length check (char_length(reference) between 8 and 180),
  constraint ledger_transactions_description_length check (char_length(description) between 5 and 240),
  constraint ledger_transactions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index ledger_transactions_order_kind_idx
  on public.ledger_transactions (payment_order_id, kind)
  where payment_order_id is not null;
create index ledger_transactions_booking_occurred_idx
  on public.ledger_transactions (booking_id, occurred_at desc);

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.ledger_transactions (id) on delete restrict,
  account public.ledger_account not null,
  direction public.ledger_direction not null,
  amount_bob numeric(10, 2) not null,
  currency text not null default 'BOB',
  created_at timestamptz not null default timezone('utc', now()),
  constraint ledger_entries_amount_positive check (amount_bob > 0),
  constraint ledger_entries_currency_bob check (currency = 'BOB'),
  constraint ledger_entries_unique_posting unique (transaction_id, account, direction)
);

comment on table public.ledger_entries is 'Asientos de doble partida. Cada transacción se valida para que débitos y créditos coincidan.';

create index ledger_entries_transaction_idx on public.ledger_entries (transaction_id);

insert into public.platform_settings (key, value, description, is_public)
values (
  'mock_payments_enabled',
  'true'::jsonb,
  'Habilita pagos simulados únicamente durante desarrollo y pruebas.',
  true
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    is_public = excluded.is_public;

alter table public.payment_orders enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;

revoke all on table public.payment_orders, public.payment_webhook_events,
  public.ledger_transactions, public.ledger_entries from anon, authenticated;
grant select on table public.payment_orders, public.payment_webhook_events,
  public.ledger_transactions, public.ledger_entries to authenticated;

create policy "payment_orders_authenticated_read_authorized"
on public.payment_orders for select to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = payment_orders.booking_id
      and (
        b.player_id = (select auth.uid())
        or exists (
          select 1 from public.venues v
          where v.id = b.venue_id and v.owner_id = (select auth.uid())
        )
        or (select private.current_user_role()) = 'super_admin'
      )
  )
);

create policy "payment_webhook_events_super_admin_read"
on public.payment_webhook_events for select to authenticated
using ((select private.current_user_role()) = 'super_admin');

create policy "ledger_transactions_business_read"
on public.ledger_transactions for select to authenticated
using (
  (select private.current_user_role()) = 'super_admin'
  or exists (
    select 1
    from public.bookings b
    join public.venues v on v.id = b.venue_id
    where b.id = ledger_transactions.booking_id
      and v.owner_id = (select auth.uid())
  )
);

create policy "ledger_entries_business_read"
on public.ledger_entries for select to authenticated
using (
  exists (
    select 1
    from public.ledger_transactions transaction_record
    join public.bookings b on b.id = transaction_record.booking_id
    join public.venues v on v.id = b.venue_id
    where transaction_record.id = ledger_entries.transaction_id
      and (
        v.owner_id = (select auth.uid())
        or (select private.current_user_role()) = 'super_admin'
      )
  )
);

create function private.process_payment_event(
  p_provider text,
  p_provider_event_id text,
  p_provider_order_id text,
  p_event_type text,
  p_amount_bob numeric,
  p_currency text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_existing_event public.payment_webhook_events;
  v_order public.payment_orders;
  v_booking public.bookings;
  v_transaction_id uuid;
  v_commission_collected numeric(10, 2);
  v_commission_receivable numeric(10, 2);
  v_venue_payable numeric(10, 2);
  v_debits numeric(10, 2);
  v_credits numeric(10, 2);
begin
  if p_provider is null or p_provider_event_id is null or p_provider_order_id is null
     or p_event_type is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid payment event' using errcode = '22023';
  end if;

  insert into public.payment_webhook_events (
    provider, provider_event_id, event_type, signature_valid, payload
  ) values (
    p_provider, p_provider_event_id, p_event_type, true, p_payload
  )
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select * into v_existing_event
    from public.payment_webhook_events
    where provider = p_provider and provider_event_id = p_provider_event_id;

    return jsonb_build_object(
      'event_status', 'duplicate',
      'payment_order_id', v_existing_event.payment_order_id,
      'booking_id', v_existing_event.booking_id
    );
  end if;

  select * into v_order
  from public.payment_orders
  where provider = p_provider and provider_order_id = p_provider_order_id
  for update;

  if v_order.id is null then
    update public.payment_webhook_events
    set status = 'failed', error_code = 'ORDER_NOT_FOUND', processed_at = now()
    where id = v_event_id;
    return jsonb_build_object('event_status', 'failed', 'error_code', 'ORDER_NOT_FOUND');
  end if;

  update public.payment_webhook_events
  set payment_order_id = v_order.id, booking_id = v_order.booking_id
  where id = v_event_id;

  select * into v_booking
  from public.bookings
  where id = v_order.booking_id
  for update;

  if p_event_type = 'payment.failed' then
    if v_order.status = 'pending' then
      update public.payment_orders
      set status = 'failed', failed_at = now()
      where id = v_order.id;

      update public.bookings
      set payment_status = 'failed'
      where id = v_booking.id and status = 'pending_payment';
    end if;

    update public.payment_webhook_events
    set status = 'processed', processed_at = now()
    where id = v_event_id;

    return jsonb_build_object(
      'event_status', 'processed',
      'payment_order_id', v_order.id,
      'booking_id', v_booking.id,
      'payment_status', 'failed'
    );
  end if;

  if p_event_type <> 'payment.paid' then
    update public.payment_webhook_events
    set status = 'ignored', error_code = 'UNSUPPORTED_EVENT', processed_at = now()
    where id = v_event_id;
    return jsonb_build_object('event_status', 'ignored', 'error_code', 'UNSUPPORTED_EVENT');
  end if;

  if p_amount_bob is distinct from v_order.amount_bob or p_currency is distinct from v_order.currency then
    update public.payment_webhook_events
    set status = 'failed', error_code = 'AMOUNT_OR_CURRENCY_MISMATCH', processed_at = now()
    where id = v_event_id;
    return jsonb_build_object('event_status', 'failed', 'error_code', 'AMOUNT_OR_CURRENCY_MISMATCH');
  end if;

  if v_order.status = 'paid' and v_booking.payment_status = 'paid' then
    update public.payment_webhook_events
    set status = 'ignored', processed_at = now()
    where id = v_event_id;
    return jsonb_build_object(
      'event_status', 'ignored',
      'payment_order_id', v_order.id,
      'booking_id', v_booking.id,
      'payment_status', 'paid'
    );
  end if;

  if v_booking.status <> 'pending_payment'
     or v_booking.hold_expires_at <= now()
     or v_order.expires_at <= now() then
    perform set_config('canchea.booking_status_reason', 'payment_after_hold_expired', true);

    update public.payment_orders
    set status = 'expired', failed_at = now()
    where id = v_order.id and status <> 'paid';

    update public.bookings
    set status = case when status = 'pending_payment' then 'expired'::public.booking_status else status end,
        payment_status = case when payment_status <> 'paid' then 'failed'::public.payment_status else payment_status end
    where id = v_booking.id;

    update public.payment_webhook_events
    set status = 'failed', error_code = 'HOLD_EXPIRED', processed_at = now()
    where id = v_event_id;

    return jsonb_build_object('event_status', 'failed', 'error_code', 'HOLD_EXPIRED');
  end if;

  v_commission_collected := least(v_booking.deposit_amount_bob, v_booking.commission_amount_bob);
  v_commission_receivable := v_booking.commission_amount_bob - v_commission_collected;
  v_venue_payable := v_booking.deposit_amount_bob - v_commission_collected;

  perform set_config('canchea.booking_status_reason', 'payment_confirmed', true);

  update public.payment_orders
  set status = 'paid', paid_at = now(), failed_at = null
  where id = v_order.id;

  update public.bookings
  set status = 'confirmed',
      payment_status = 'paid',
      settlement_status = case
        when v_venue_payable > 0 or v_commission_receivable > 0 then 'pending'::public.settlement_status
        else 'not_due'::public.settlement_status
      end,
      deposit_paid_at = now()
  where id = v_booking.id;

  insert into public.ledger_transactions (
    booking_id, payment_order_id, kind, reference, description, metadata
  ) values (
    v_booking.id,
    v_order.id,
    'deposit_payment',
    'payment:' || v_order.id::text,
    'Cobro de seña de la reserva ' || v_booking.public_code,
    jsonb_build_object(
      'deposit_amount_bob', v_booking.deposit_amount_bob,
      'commission_amount_bob', v_booking.commission_amount_bob,
      'commission_collected_bob', v_commission_collected,
      'commission_receivable_bob', v_commission_receivable,
      'venue_payable_bob', v_venue_payable
    )
  )
  returning id into v_transaction_id;

  insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
  values (v_transaction_id, 'platform_cash', 'debit', v_booking.deposit_amount_bob);

  if v_commission_receivable > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'commission_receivable', 'debit', v_commission_receivable);
  end if;

  if v_booking.commission_amount_bob > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'platform_commission_revenue', 'credit', v_booking.commission_amount_bob);
  end if;

  if v_venue_payable > 0 then
    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values (v_transaction_id, 'venue_payable', 'credit', v_venue_payable);
  end if;

  select
    coalesce(sum(amount_bob) filter (where direction = 'debit'), 0),
    coalesce(sum(amount_bob) filter (where direction = 'credit'), 0)
  into v_debits, v_credits
  from public.ledger_entries
  where transaction_id = v_transaction_id;

  if v_debits <> v_credits then
    raise exception 'Unbalanced ledger transaction' using errcode = '23514';
  end if;

  update public.payment_webhook_events
  set status = 'processed', processed_at = now()
  where id = v_event_id;

  return jsonb_build_object(
    'event_status', 'processed',
    'payment_order_id', v_order.id,
    'booking_id', v_booking.id,
    'payment_status', 'paid',
    'booking_status', 'confirmed',
    'ledger_transaction_id', v_transaction_id
  );
end;
$$;

revoke execute on function private.process_payment_event(text, text, text, text, numeric, text, jsonb)
  from public, anon, authenticated;

create function public.create_my_mock_payment_order(
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

revoke execute on function public.create_my_mock_payment_order(uuid, uuid) from public, anon;
grant execute on function public.create_my_mock_payment_order(uuid, uuid) to authenticated;

create function public.get_my_payment_order(p_booking_id uuid)
returns public.payment_orders
language sql
security definer
set search_path = ''
stable
as $$
  select payment_order.*
  from public.payment_orders payment_order
  join public.bookings booking on booking.id = payment_order.booking_id
  where payment_order.booking_id = p_booking_id
    and booking.player_id = (select auth.uid())
  order by payment_order.created_at desc
  limit 1
$$;

revoke execute on function public.get_my_payment_order(uuid) from public, anon;
grant execute on function public.get_my_payment_order(uuid) to authenticated;

create function public.simulate_my_mock_payment(
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

revoke execute on function public.simulate_my_mock_payment(uuid, uuid) from public, anon;
grant execute on function public.simulate_my_mock_payment(uuid, uuid) to authenticated;

create function public.process_payment_webhook(
  p_provider text,
  p_provider_event_id text,
  p_provider_order_id text,
  p_event_type text,
  p_amount_bob numeric,
  p_currency text,
  p_payload jsonb
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.process_payment_event(
    p_provider,
    p_provider_event_id,
    p_provider_order_id,
    p_event_type,
    p_amount_bob,
    p_currency,
    p_payload
  )
$$;

revoke execute on function public.process_payment_webhook(text, text, text, text, numeric, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.process_payment_webhook(text, text, text, text, numeric, text, jsonb)
  to service_role;

create or replace function public.get_my_booking_checkout(p_booking_id uuid)
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

  update public.payment_orders payment_order
  set status = 'expired', failed_at = now()
  from public.bookings booking
  where payment_order.booking_id = booking.id
    and booking.id = p_booking_id
    and booking.player_id = v_user_id
    and booking.status = 'pending_payment'
    and booking.hold_expires_at <= now()
    and payment_order.status = 'pending';

  update public.bookings
  set status = 'expired', payment_status = case when payment_status = 'paid' then payment_status else 'failed' end
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

create or replace function public.release_my_booking_hold(p_booking_id uuid)
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

  update public.payment_orders payment_order
  set status = 'cancelled', failed_at = now()
  from public.bookings booking
  where payment_order.booking_id = booking.id
    and booking.id = p_booking_id
    and booking.player_id = v_user_id
    and payment_order.status = 'pending';

  update public.bookings
  set status = 'expired',
      payment_status = case when payment_status = 'paid' then payment_status else 'failed' end
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

commit;
