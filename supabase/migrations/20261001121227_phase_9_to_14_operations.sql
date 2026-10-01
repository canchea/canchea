begin;

alter type public.ledger_account add value if not exists 'platform_cancellation_revenue';
alter type public.ledger_transaction_kind add value if not exists 'cancellation';
alter type public.ledger_transaction_kind add value if not exists 'refund_processed';
alter type public.ledger_transaction_kind add value if not exists 'settlement';

create type public.refund_status as enum ('pending', 'processed', 'failed', 'cancelled');
create type public.notification_delivery_status as enum ('queued', 'sent', 'failed', 'cancelled');
create type public.complaint_category as enum (
  'court_unavailable',
  'venue_closed',
  'payment_issue',
  'facility_mismatch',
  'cancellation',
  'other'
);
create type public.complaint_status as enum ('open', 'in_review', 'resolved', 'rejected');
create type public.venue_subscription_status as enum ('trial', 'inactive', 'active', 'past_due', 'cancelled');

commit;

begin;

alter table public.venues
  add column rating_average numeric(3, 2) not null default 0,
  add column review_count integer not null default 0,
  add column trial_started_at timestamptz,
  add column trial_ends_at timestamptz,
  add column subscription_status public.venue_subscription_status not null default 'inactive',
  add constraint venues_rating_valid check (
    rating_average between 0 and 5 and review_count >= 0
  ),
  add constraint venues_trial_dates_valid check (
    trial_started_at is null
    or (trial_ends_at is not null and trial_started_at < trial_ends_at)
  );

alter table public.courts
  add column rating_average numeric(3, 2) not null default 0,
  add column review_count integer not null default 0,
  add constraint courts_rating_valid check (
    rating_average between 0 and 5 and review_count >= 0
  );

alter table public.bookings
  add column cancelled_by uuid references public.profiles (id) on delete set null,
  add column cancellation_policy_tier text,
  add column refund_amount_bob numeric(10, 2) not null default 0,
  add column penalty_amount_bob numeric(10, 2) not null default 0,
  add column completed_by uuid references public.profiles (id) on delete set null,
  add column no_show_at timestamptz,
  add constraint bookings_cancellation_policy_tier check (
    cancellation_policy_tier is null
    or cancellation_policy_tier in ('early', 'late', 'no_show', 'venue', 'admin')
  ),
  add constraint bookings_cancellation_amounts_valid check (
    refund_amount_bob >= 0
    and penalty_amount_bob >= 0
    and refund_amount_bob + penalty_amount_bob <= deposit_amount_bob
  );

create index bookings_cancelled_by_idx on public.bookings (cancelled_by)
  where cancelled_by is not null;
create index bookings_completed_by_idx on public.bookings (completed_by)
  where completed_by is not null;

insert into public.platform_settings (key, value, description, is_public) values
  ('cancellation_venue_share_percentage', '50'::jsonb, 'Porcentaje de la penalización que compensa al complejo.', false),
  ('review_window_days', '30'::jsonb, 'Días disponibles para valorar una reserva completada.', true),
  ('complaint_window_days', '7'::jsonb, 'Días disponibles para abrir un reclamo después del servicio.', true),
  ('reminder_hours_before_booking', '24'::jsonb, 'Horas de anticipación para recordatorios de reserva.', false)
on conflict (key) do nothing;

create table public.favorite_venues (
  player_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (player_id, venue_id)
);

create index favorite_venues_venue_idx on public.favorite_venues (venue_id);

create table public.favorite_courts (
  player_id uuid not null references public.profiles (id) on delete cascade,
  court_id uuid not null references public.courts (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (player_id, court_id)
);

create index favorite_courts_court_idx on public.favorite_courts (court_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  action_url text,
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_kind_format check (kind ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  constraint notifications_title_length check (char_length(title) between 3 and 120),
  constraint notifications_body_length check (char_length(body) between 5 and 500),
  constraint notifications_action_internal check (action_url is null or action_url ~ '^/[a-z0-9/_?=&%.-]*$')
);

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel text not null,
  status public.notification_delivery_status not null default 'queued',
  provider text,
  provider_message_id text,
  attempts smallint not null default 0,
  last_error_code text,
  queued_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_deliveries_channel check (channel in ('email', 'whatsapp')),
  constraint notification_deliveries_attempts_valid check (attempts between 0 and 20),
  constraint notification_deliveries_unique_channel unique (notification_id, channel)
);

create index notification_deliveries_status_idx
  on public.notification_deliveries (status, queued_at)
  where status in ('queued', 'failed');

create trigger notification_deliveries_set_updated_at
before update on public.notification_deliveries
for each row execute function private.set_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  payment_order_id uuid not null references public.payment_orders (id) on delete restrict,
  amount_bob numeric(10, 2) not null,
  currency text not null default 'BOB',
  status public.refund_status not null default 'pending',
  reason text not null,
  provider_refund_id text,
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint refunds_amount_positive check (amount_bob > 0),
  constraint refunds_currency_bob check (currency = 'BOB'),
  constraint refunds_reason_length check (char_length(reason) between 3 and 240)
);

create index refunds_payment_order_idx on public.refunds (payment_order_id);
create index refunds_status_requested_idx on public.refunds (status, requested_at desc);

create trigger refunds_set_updated_at
before update on public.refunds
for each row execute function private.set_updated_at();

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  amount_bob numeric(10, 2) not null,
  currency text not null default 'BOB',
  status public.settlement_status not null default 'pending',
  reference text not null unique,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  paid_at timestamptz,
  constraint settlements_period_valid check (period_start <= period_end),
  constraint settlements_amount_positive check (amount_bob > 0),
  constraint settlements_currency_bob check (currency = 'BOB')
);

create index settlements_venue_created_idx on public.settlements (venue_id, created_at desc);

create table public.settlement_items (
  settlement_id uuid not null references public.settlements (id) on delete restrict,
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  amount_bob numeric(10, 2) not null,
  primary key (settlement_id, booking_id),
  constraint settlement_items_amount_positive check (amount_bob > 0)
);

create index settlement_items_booking_idx on public.settlement_items (booking_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  player_id uuid not null references public.profiles (id) on delete restrict,
  venue_id uuid not null references public.venues (id) on delete restrict,
  court_id uuid not null references public.courts (id) on delete restrict,
  rating smallint not null,
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reviews_rating_valid check (rating between 1 and 5),
  constraint reviews_comment_length check (comment is null or char_length(comment) between 3 and 1000),
  constraint reviews_player_booking_unique unique (player_id, booking_id)
);

create index reviews_venue_created_idx on public.reviews (venue_id, created_at desc);
create index reviews_court_created_idx on public.reviews (court_id, created_at desc);

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function private.set_updated_at();

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  player_id uuid not null references public.profiles (id) on delete restrict,
  venue_id uuid not null references public.venues (id) on delete restrict,
  category public.complaint_category not null,
  status public.complaint_status not null default 'open',
  description text not null,
  resolution_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint complaints_description_length check (char_length(description) between 10 and 2000),
  constraint complaints_resolution_length check (resolution_note is null or char_length(resolution_note) between 5 and 2000),
  constraint complaints_booking_player_unique unique (booking_id, player_id)
);

create index complaints_status_created_idx on public.complaints (status, created_at desc);
create index complaints_venue_created_idx on public.complaints (venue_id, created_at desc);

create trigger complaints_set_updated_at
before update on public.complaints
for each row execute function private.set_updated_at();

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_logs_action_format check (action ~ '^[a-z][a-z0-9_.-]{2,99}$'),
  constraint audit_logs_entity_type_format check (entity_type ~ '^[a-z][a-z0-9_]{2,79}$'),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc)
  where actor_id is not null;
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  constraint analytics_events_name_format check (event_name ~ '^[a-z][a-z0-9_]{2,79}$'),
  constraint analytics_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index analytics_events_name_occurred_idx on public.analytics_events (event_name, occurred_at desc);
create index analytics_events_booking_idx on public.analytics_events (booking_id)
  where booking_id is not null;

alter table public.favorite_venues enable row level security;
alter table public.favorite_courts enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.refunds enable row level security;
alter table public.settlements enable row level security;
alter table public.settlement_items enable row level security;
alter table public.reviews enable row level security;
alter table public.complaints enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;

revoke all on table public.favorite_venues, public.favorite_courts,
  public.notifications, public.notification_deliveries, public.refunds,
  public.settlements, public.settlement_items, public.reviews,
  public.complaints, public.audit_logs, public.analytics_events
from anon, authenticated;

grant select on table public.reviews to anon, authenticated;
grant select on table public.favorite_venues, public.favorite_courts,
  public.notifications, public.notification_deliveries, public.refunds,
  public.settlements, public.settlement_items, public.complaints,
  public.audit_logs, public.analytics_events
to authenticated;

create policy "favorite_venues_player_read_own"
on public.favorite_venues for select to authenticated
using (player_id = (select auth.uid()));

create policy "favorite_courts_player_read_own"
on public.favorite_courts for select to authenticated
using (player_id = (select auth.uid()));

create policy "notifications_recipient_read_own"
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy "notification_deliveries_recipient_or_admin_read"
on public.notification_deliveries for select to authenticated
using (
  exists (
    select 1 from public.notifications n
    where n.id = notification_id and n.recipient_id = (select auth.uid())
  )
  or (select private.current_user_role()) = 'super_admin'
);

create policy "refunds_authorized_read"
on public.refunds for select to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
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

create policy "settlements_owner_or_admin_read"
on public.settlements for select to authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id and v.owner_id = (select auth.uid())
  )
  or (select private.current_user_role()) = 'super_admin'
);

create policy "settlement_items_owner_or_admin_read"
on public.settlement_items for select to authenticated
using (
  exists (
    select 1
    from public.settlements s
    join public.venues v on v.id = s.venue_id
    where s.id = settlement_id and v.owner_id = (select auth.uid())
  )
  or (select private.current_user_role()) = 'super_admin'
);

create policy "reviews_public_read_approved"
on public.reviews for select to anon, authenticated
using (
  exists (
    select 1 from public.venues v
    where v.id = venue_id and v.status = 'approved'
  )
);

create policy "complaints_authorized_read"
on public.complaints for select to authenticated
using (
  player_id = (select auth.uid())
  or (select private.current_user_role()) = 'super_admin'
);

create policy "audit_logs_super_admin_read"
on public.audit_logs for select to authenticated
using ((select private.current_user_role()) = 'super_admin');

create policy "analytics_events_super_admin_read"
on public.analytics_events for select to authenticated
using ((select private.current_user_role()) = 'super_admin');

create policy "profiles_super_admin_read_all"
on public.profiles for select to authenticated
using ((select private.current_user_role()) = 'super_admin');

create policy "profiles_venue_owner_read_booked_players"
on public.profiles for select to authenticated
using (
  role = 'player'
  and exists (
    select 1
    from public.bookings b
    join public.venues v on v.id = b.venue_id
    where b.player_id = profiles.id
      and v.owner_id = (select auth.uid())
  )
);

create function private.create_notification(
  p_recipient_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_action_url text,
  p_dedupe_key text,
  p_queue_email boolean default true,
  p_queue_whatsapp boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (
    recipient_id, kind, title, body, action_url, dedupe_key
  ) values (
    p_recipient_id, p_kind, p_title, p_body, p_action_url, p_dedupe_key
  )
  on conflict (dedupe_key) do update
    set dedupe_key = excluded.dedupe_key
  returning id into v_notification_id;

  if p_queue_email then
    insert into public.notification_deliveries (notification_id, channel)
    values (v_notification_id, 'email')
    on conflict (notification_id, channel) do nothing;
  end if;

  if p_queue_whatsapp then
    insert into public.notification_deliveries (notification_id, channel)
    values (v_notification_id, 'whatsapp')
    on conflict (notification_id, channel) do nothing;
  end if;

  return v_notification_id;
end;
$$;

revoke execute on function private.create_notification(uuid, text, text, text, text, text, boolean, boolean)
  from public, anon, authenticated;

create function private.notify_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_player_title text;
  v_player_body text;
  v_owner_title text;
  v_owner_body text;
begin
  if old.status = new.status then
    return new;
  end if;

  select owner_id into v_owner_id
  from public.venues
  where id = new.venue_id;

  if new.status = 'confirmed' then
    v_player_title := 'Reserva confirmada';
    v_player_body := 'Tu reserva ' || new.public_code || ' está confirmada.';
    v_owner_title := 'Nueva reserva confirmada';
    v_owner_body := 'Recibiste la reserva ' || new.public_code || '.';
  elsif new.status = 'in_progress' then
    v_player_title := 'Tu reserva está en curso';
    v_player_body := 'La reserva ' || new.public_code || ' comenzó.';
    v_owner_title := 'Servicio iniciado';
    v_owner_body := 'La reserva ' || new.public_code || ' está en curso.';
  elsif new.status = 'completed' then
    v_player_title := '¿Cómo estuvo el partido?';
    v_player_body := 'La reserva ' || new.public_code || ' finalizó. Ya puedes valorarla.';
    v_owner_title := 'Servicio finalizado';
    v_owner_body := 'La reserva ' || new.public_code || ' fue completada.';
  elsif new.status = 'refunded_partial' then
    v_player_title := 'Cancelación con devolución';
    v_player_body := 'La reserva ' || new.public_code || ' fue cancelada. Reembolso: Bs ' || new.refund_amount_bob::text || '.';
    v_owner_title := 'Reserva cancelada';
    v_owner_body := 'La reserva ' || new.public_code || ' fue cancelada con devolución parcial.';
  elsif new.status = 'cancelled' then
    v_player_title := 'Reserva cancelada';
    v_player_body := 'La reserva ' || new.public_code || ' fue cancelada sin devolución.';
    v_owner_title := 'Reserva cancelada';
    v_owner_body := 'La reserva ' || new.public_code || ' fue cancelada.';
  elsif new.status = 'no_show' then
    v_player_title := 'Reserva marcada como no-show';
    v_player_body := 'La reserva ' || new.public_code || ' fue marcada como inasistencia.';
    v_owner_title := 'No-show registrado';
    v_owner_body := 'La reserva ' || new.public_code || ' fue marcada como no-show.';
  else
    return new;
  end if;

  perform private.create_notification(
    new.player_id,
    'booking.' || new.status::text,
    v_player_title,
    v_player_body,
    '/reservar/' || new.id::text,
    'booking:' || new.id::text || ':player:' || new.status::text,
    true,
    true
  );

  if v_owner_id is not null then
    perform private.create_notification(
      v_owner_id,
      'booking.' || new.status::text,
      v_owner_title,
      v_owner_body,
      '/propietario/reservas',
      'booking:' || new.id::text || ':owner:' || new.status::text,
      true,
      true
    );
  end if;

  return new;
end;
$$;

create trigger bookings_notify_status_change
after update of status on public.bookings
for each row execute function private.notify_booking_status_change();

create function private.track_booking_analytics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.analytics_events (event_name, actor_id, booking_id, venue_id, metadata)
    values ('checkout_started', new.player_id, new.id, new.venue_id, jsonb_build_object('public_code', new.public_code));
  elsif old.status is distinct from new.status then
    insert into public.analytics_events (event_name, actor_id, booking_id, venue_id, metadata)
    values (
      case new.status
        when 'confirmed' then 'booking_confirmed'
        when 'completed' then 'booking_completed'
        when 'cancelled' then 'booking_cancelled'
        when 'refunded_partial' then 'booking_cancelled'
        when 'expired' then 'booking_expired'
        else 'booking_status_changed'
      end,
      new.player_id,
      new.id,
      new.venue_id,
      jsonb_build_object('from_status', old.status, 'to_status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger bookings_track_analytics
after insert or update of status on public.bookings
for each row execute function private.track_booking_analytics();

create function private.start_venue_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trial_months integer := 3;
begin
  if old.status is distinct from new.status and new.status = 'approved' then
    select coalesce((value #>> '{}')::integer, 3)
    into v_trial_months
    from public.platform_settings
    where key = 'trial_months';

    new.trial_started_at := coalesce(new.trial_started_at, now());
    new.trial_ends_at := coalesce(new.trial_ends_at, now() + make_interval(months => v_trial_months));
    new.subscription_status := 'trial';
  end if;
  return new;
end;
$$;

create trigger venues_start_trial
before update of status on public.venues
for each row execute function private.start_venue_trial();

create function private.notify_venue_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_body text;
begin
  if old.status = new.status then return new; end if;

  v_title := case new.status
    when 'approved' then 'Complejo aprobado'
    when 'changes_requested' then 'Cambios solicitados'
    when 'rejected' then 'Registro rechazado'
    else 'Estado del complejo actualizado'
  end;
  v_body := case new.status
    when 'approved' then new.commercial_name || ' ya está visible en CANCHEA.'
    when 'changes_requested' then 'Revisa los cambios solicitados para ' || new.commercial_name || '.'
    when 'rejected' then 'El registro de ' || new.commercial_name || ' fue rechazado.'
    else 'El estado de ' || new.commercial_name || ' cambió a ' || new.status::text || '.'
  end;

  perform private.create_notification(
    new.owner_id,
    'venue.' || new.status::text,
    v_title,
    v_body,
    '/propietario',
    'venue:' || new.id::text || ':' || new.status::text,
    true,
    true
  );

  if (select private.current_user_role()) = 'super_admin' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      (select auth.uid()),
      'venue.status_changed',
      'venue',
      new.id::text,
      jsonb_build_object('from_status', old.status, 'to_status', new.status, 'review_note', new.review_note)
    );
  end if;

  return new;
end;
$$;

create trigger venues_notify_and_audit_status
after update of status on public.venues
for each row execute function private.notify_venue_status_change();

create function private.refresh_review_aggregates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue_id uuid := coalesce(new.venue_id, old.venue_id);
  v_court_id uuid := coalesce(new.court_id, old.court_id);
begin
  update public.venues
  set rating_average = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.venue_id = v_venue_id), 0),
      review_count = (select count(*) from public.reviews r where r.venue_id = v_venue_id)
  where id = v_venue_id;

  update public.courts
  set rating_average = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.court_id = v_court_id), 0),
      review_count = (select count(*) from public.reviews r where r.court_id = v_court_id)
  where id = v_court_id;

  return coalesce(new, old);
end;
$$;

create trigger reviews_refresh_aggregates
after insert or update or delete on public.reviews
for each row execute function private.refresh_review_aggregates();

create function public.toggle_my_venue_favorite(p_venue_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.venues where id = p_venue_id and status = 'approved') then
    raise exception 'Venue not available' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.favorite_venues
    where player_id = v_user_id and venue_id = p_venue_id
  ) then
    delete from public.favorite_venues
    where player_id = v_user_id and venue_id = p_venue_id;
    return false;
  end if;

  insert into public.favorite_venues (player_id, venue_id)
  values (v_user_id, p_venue_id);
  return true;
end;
$$;

revoke execute on function public.toggle_my_venue_favorite(uuid) from public, anon;
grant execute on function public.toggle_my_venue_favorite(uuid) to authenticated;

create function public.toggle_my_court_favorite(p_court_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.courts c
    join public.venues v on v.id = c.venue_id
    where c.id = p_court_id and c.status = 'active' and v.status = 'approved'
  ) then
    raise exception 'Court not available' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.favorite_courts
    where player_id = v_user_id and court_id = p_court_id
  ) then
    delete from public.favorite_courts
    where player_id = v_user_id and court_id = p_court_id;
    return false;
  end if;

  insert into public.favorite_courts (player_id, court_id)
  values (v_user_id, p_court_id);
  return true;
end;
$$;

revoke execute on function public.toggle_my_court_favorite(uuid) from public, anon;
grant execute on function public.toggle_my_court_favorite(uuid) to authenticated;

create function public.mark_my_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification public.notifications;
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and recipient_id = (select auth.uid())
  returning * into v_notification;

  if v_notification.id is null then
    raise exception 'Notification not found' using errcode = '22023';
  end if;
  return v_notification;
end;
$$;

revoke execute on function public.mark_my_notification_read(uuid) from public, anon;
grant execute on function public.mark_my_notification_read(uuid) to authenticated;

create function public.mark_all_my_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.notifications
  set read_at = now()
  where recipient_id = (select auth.uid()) and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.mark_all_my_notifications_read() from public, anon;
grant execute on function public.mark_all_my_notifications_read() to authenticated;

create function public.submit_my_review(
  p_booking_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings;
  v_review public.reviews;
  v_window_days integer := 30;
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;
  if p_rating not between 1 and 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;
  if v_comment is not null and char_length(v_comment) not between 3 and 1000 then
    raise exception 'Invalid review comment' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id and player_id = v_user_id and status = 'completed';

  if v_booking.id is null then
    raise exception 'Completed booking required' using errcode = '42501';
  end if;

  select coalesce((value #>> '{}')::integer, 30)
  into v_window_days
  from public.platform_settings where key = 'review_window_days';

  if v_booking.completed_at < now() - make_interval(days => v_window_days) then
    raise exception 'Review window expired' using errcode = '22023';
  end if;

  insert into public.reviews (booking_id, player_id, venue_id, court_id, rating, comment)
  values (v_booking.id, v_user_id, v_booking.venue_id, v_booking.court_id, p_rating, v_comment)
  returning * into v_review;

  insert into public.analytics_events (event_name, actor_id, booking_id, venue_id, metadata)
  values ('review_submitted', v_user_id, v_booking.id, v_booking.venue_id, jsonb_build_object('rating', p_rating));

  return v_review;
exception
  when unique_violation then
    raise exception 'Booking already reviewed' using errcode = '23505';
end;
$$;

revoke execute on function public.submit_my_review(uuid, smallint, text) from public, anon;
grant execute on function public.submit_my_review(uuid, smallint, text) to authenticated;

create function public.create_my_complaint(
  p_booking_id uuid,
  p_category public.complaint_category,
  p_description text
)
returns public.complaints
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_booking public.bookings;
  v_complaint public.complaints;
  v_window_days integer := 7;
  v_description text := trim(coalesce(p_description, ''));
begin
  if v_user_id is null or (select private.current_user_role()) <> 'player' then
    raise exception 'Player role required' using errcode = '42501';
  end if;
  if p_category is null or char_length(v_description) not between 10 and 2000 then
    raise exception 'Invalid complaint' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id and player_id = v_user_id
    and status in ('confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'refunded_partial');

  if v_booking.id is null then
    raise exception 'Booking not eligible for complaint' using errcode = '42501';
  end if;

  select coalesce((value #>> '{}')::integer, 7)
  into v_window_days
  from public.platform_settings where key = 'complaint_window_days';

  if v_booking.ends_at < now() - make_interval(days => v_window_days) then
    raise exception 'Complaint window expired' using errcode = '22023';
  end if;

  insert into public.complaints (booking_id, player_id, venue_id, category, description)
  values (v_booking.id, v_user_id, v_booking.venue_id, p_category, v_description)
  returning * into v_complaint;

  return v_complaint;
exception
  when unique_violation then
    raise exception 'Complaint already exists for booking' using errcode = '23505';
end;
$$;

revoke execute on function public.create_my_complaint(uuid, public.complaint_category, text)
  from public, anon;
grant execute on function public.create_my_complaint(uuid, public.complaint_category, text)
  to authenticated;

create function private.apply_booking_penalty(
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

revoke execute on function private.apply_booking_penalty(uuid, numeric, numeric, text, uuid)
  from public, anon, authenticated;

create function public.cancel_my_booking(p_booking_id uuid)
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
    if round(v_refund_setting + v_penalty_setting, 2) <> v_booking.deposit_amount_bob then
      raise exception 'Cancellation settings do not match booking deposit' using errcode = '22023';
    end if;
    v_tier := 'early';
    v_refund := v_refund_setting;
    v_penalty := v_penalty_setting;
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

revoke execute on function public.cancel_my_booking(uuid) from public, anon;
grant execute on function public.cancel_my_booking(uuid) to authenticated;

create function public.sync_my_venue_booking_states()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'venue_owner' then
    raise exception 'Venue owner role required' using errcode = '42501';
  end if;
  perform set_config('canchea.booking_status_reason', 'scheduled_start', true);
  update public.bookings b
  set status = 'in_progress'
  where b.status = 'confirmed'
    and b.starts_at <= now()
    and b.ends_at > now()
    and exists (
      select 1 from public.venues v
      where v.id = b.venue_id and v.owner_id = v_user_id
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.sync_my_venue_booking_states() from public, anon;
grant execute on function public.sync_my_venue_booking_states() to authenticated;

create function public.owner_update_booking_status(
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
    set status = 'completed', completed_by = v_user_id
    where id = v_booking.id returning * into v_booking;
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
        penalty_amount_bob = deposit_amount_bob
    where id = v_booking.id returning * into v_booking;

    perform private.apply_booking_penalty(
      v_booking.id, 0, v_booking.deposit_amount_bob, 'no_show', v_user_id
    );
  else
    raise exception 'Invalid owner booking action' using errcode = '22023';
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.owner_update_booking_status(uuid, text) from public, anon;
grant execute on function public.owner_update_booking_status(uuid, text) to authenticated;

create function public.admin_mark_refund_processed(
  p_refund_id uuid,
  p_provider_refund_id text default null
)
returns public.refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_refund public.refunds;
  v_transaction_id uuid;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'super_admin' then
    raise exception 'Super admin role required' using errcode = '42501';
  end if;

  select * into v_refund
  from public.refunds
  where id = p_refund_id
  for update;

  if v_refund.id is null or v_refund.status <> 'pending' then
    raise exception 'Pending refund required' using errcode = '22023';
  end if;

  insert into public.ledger_transactions (
    booking_id, payment_order_id, kind, reference, description, metadata
  ) values (
    v_refund.booking_id,
    v_refund.payment_order_id,
    'refund_processed',
    'refund:' || v_refund.id::text,
    'Reembolso procesado para la reserva',
    jsonb_build_object('refund_id', v_refund.id, 'provider_refund_id', p_provider_refund_id)
  ) returning id into v_transaction_id;

  insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
  values
    (v_transaction_id, 'player_refund_payable', 'debit', v_refund.amount_bob),
    (v_transaction_id, 'platform_cash', 'credit', v_refund.amount_bob);

  update public.refunds
  set status = 'processed',
      provider_refund_id = nullif(trim(coalesce(p_provider_refund_id, '')), ''),
      processed_at = now()
  where id = v_refund.id
  returning * into v_refund;

  update public.bookings
  set payment_status = case
    when v_refund.amount_bob >= deposit_amount_bob then 'refunded'::public.payment_status
    else 'refunded_partial'::public.payment_status
  end
  where id = v_refund.booking_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id, 'refund.processed', 'refund', v_refund.id::text,
    jsonb_build_object('amount_bob', v_refund.amount_bob, 'provider_refund_id', v_refund.provider_refund_id)
  );

  return v_refund;
end;
$$;

revoke execute on function public.admin_mark_refund_processed(uuid, text) from public, anon;
grant execute on function public.admin_mark_refund_processed(uuid, text) to authenticated;

create function public.admin_create_settlement(
  p_venue_id uuid,
  p_period_start date,
  p_period_end date
)
returns public.settlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_total numeric(10, 2);
  v_settlement public.settlements;
  v_item record;
  v_transaction_id uuid;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'super_admin' then
    raise exception 'Super admin role required' using errcode = '42501';
  end if;
  if p_period_start is null or p_period_end is null or p_period_start > p_period_end then
    raise exception 'Invalid settlement period' using errcode = '22023';
  end if;
  if not exists (select 1 from public.venues where id = p_venue_id) then
    raise exception 'Venue not found' using errcode = '22023';
  end if;

  select round(coalesce(sum(outstanding.amount_bob), 0), 2)
  into v_total
  from (
    select b.id,
      sum(case when le.direction = 'credit' then le.amount_bob else -le.amount_bob end) as amount_bob
    from public.bookings b
    join public.ledger_transactions lt on lt.booking_id = b.id
    join public.ledger_entries le on le.transaction_id = lt.id and le.account = 'venue_payable'
    where b.venue_id = p_venue_id
      and b.settlement_status = 'pending'
      and (b.starts_at at time zone 'America/La_Paz')::date between p_period_start and p_period_end
    group by b.id
    having sum(case when le.direction = 'credit' then le.amount_bob else -le.amount_bob end) > 0
  ) outstanding;

  if v_total <= 0 then
    raise exception 'No venue balance available for settlement' using errcode = '22023';
  end if;

  insert into public.settlements (
    venue_id, period_start, period_end, amount_bob, status, reference, created_by, paid_at
  ) values (
    p_venue_id, p_period_start, p_period_end, v_total, 'settled',
    'SET-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    v_user_id, now()
  ) returning * into v_settlement;

  for v_item in
    select b.id as booking_id, po.id as payment_order_id,
      round(sum(case when le.direction = 'credit' then le.amount_bob else -le.amount_bob end), 2) as amount_bob
    from public.bookings b
    join public.payment_orders po on po.booking_id = b.id and po.status in ('paid', 'refunded_partial', 'refunded')
    join public.ledger_transactions lt on lt.booking_id = b.id
    join public.ledger_entries le on le.transaction_id = lt.id and le.account = 'venue_payable'
    where b.venue_id = p_venue_id
      and b.settlement_status = 'pending'
      and (b.starts_at at time zone 'America/La_Paz')::date between p_period_start and p_period_end
    group by b.id, po.id
    having sum(case when le.direction = 'credit' then le.amount_bob else -le.amount_bob end) > 0
  loop
    insert into public.settlement_items (settlement_id, booking_id, amount_bob)
    values (v_settlement.id, v_item.booking_id, v_item.amount_bob);

    insert into public.ledger_transactions (
      booking_id, payment_order_id, kind, reference, description, metadata
    ) values (
      v_item.booking_id,
      v_item.payment_order_id,
      'settlement',
      'settlement:' || v_settlement.id::text || ':' || v_item.booking_id::text,
      'Liquidación al complejo ' || v_settlement.reference,
      jsonb_build_object('settlement_id', v_settlement.id)
    ) returning id into v_transaction_id;

    insert into public.ledger_entries (transaction_id, account, direction, amount_bob)
    values
      (v_transaction_id, 'venue_payable', 'debit', v_item.amount_bob),
      (v_transaction_id, 'platform_cash', 'credit', v_item.amount_bob);

    update public.bookings
    set settlement_status = 'settled'
    where id = v_item.booking_id;
  end loop;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id, 'settlement.created', 'settlement', v_settlement.id::text,
    jsonb_build_object('venue_id', p_venue_id, 'amount_bob', v_total)
  );

  return v_settlement;
end;
$$;

revoke execute on function public.admin_create_settlement(uuid, date, date) from public, anon;
grant execute on function public.admin_create_settlement(uuid, date, date) to authenticated;

create function public.admin_review_complaint(
  p_complaint_id uuid,
  p_status public.complaint_status,
  p_resolution_note text default null
)
returns public.complaints
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_complaint public.complaints;
  v_note text := nullif(trim(coalesce(p_resolution_note, '')), '');
begin
  if v_user_id is null or (select private.current_user_role()) <> 'super_admin' then
    raise exception 'Super admin role required' using errcode = '42501';
  end if;
  if p_status not in ('in_review', 'resolved', 'rejected') then
    raise exception 'Invalid complaint status' using errcode = '22023';
  end if;
  if p_status in ('resolved', 'rejected') and coalesce(char_length(v_note), 0) < 5 then
    raise exception 'Resolution note required' using errcode = '22023';
  end if;

  update public.complaints
  set status = p_status,
      resolution_note = v_note,
      reviewed_by = v_user_id,
      reviewed_at = now()
  where id = p_complaint_id
  returning * into v_complaint;

  if v_complaint.id is null then
    raise exception 'Complaint not found' using errcode = '22023';
  end if;

  perform private.create_notification(
    v_complaint.player_id,
    'complaint.' || p_status::text,
    'Actualización de tu reclamo',
    case p_status
      when 'in_review' then 'Tu reclamo está siendo revisado.'
      when 'resolved' then 'Tu reclamo fue resuelto: ' || v_note
      else 'Tu reclamo fue rechazado: ' || v_note
    end,
    '/jugador/reclamos',
    'complaint:' || v_complaint.id::text || ':' || p_status::text,
    true,
    true
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id, 'complaint.status_changed', 'complaint', v_complaint.id::text,
    jsonb_build_object('status', p_status, 'resolution_note', v_note)
  );

  return v_complaint;
end;
$$;

revoke execute on function public.admin_review_complaint(uuid, public.complaint_status, text)
  from public, anon;
grant execute on function public.admin_review_complaint(uuid, public.complaint_status, text)
  to authenticated;

create function public.admin_update_platform_setting(
  p_key text,
  p_value jsonb
)
returns public.platform_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_numeric numeric;
  v_setting public.platform_settings;
begin
  if v_user_id is null or (select private.current_user_role()) <> 'super_admin' then
    raise exception 'Super admin role required' using errcode = '42501';
  end if;
  if p_key not in (
    'booking_min_advance_minutes', 'booking_hold_minutes', 'booking_deposit_amount',
    'platform_commission_percentage', 'cancellation_threshold_hours',
    'deposit_refund_amount', 'cancellation_penalty_amount',
    'cancellation_venue_share_percentage', 'trial_months',
    'review_window_days', 'complaint_window_days',
    'reminder_hours_before_booking', 'mock_payments_enabled'
  ) then
    raise exception 'Setting cannot be changed here' using errcode = '42501';
  end if;

  if p_key = 'mock_payments_enabled' then
    if jsonb_typeof(p_value) <> 'boolean' then
      raise exception 'Boolean value required' using errcode = '22023';
    end if;
  else
    if jsonb_typeof(p_value) <> 'number' then
      raise exception 'Numeric value required' using errcode = '22023';
    end if;
    v_numeric := (p_value #>> '{}')::numeric;
    if p_key in ('platform_commission_percentage', 'cancellation_venue_share_percentage')
       and v_numeric not between 0 and 100 then
      raise exception 'Percentage out of range' using errcode = '22023';
    end if;
    if p_key not in ('platform_commission_percentage', 'cancellation_venue_share_percentage')
       and v_numeric <= 0 then
      raise exception 'Positive value required' using errcode = '22023';
    end if;
  end if;

  update public.platform_settings
  set value = p_value, updated_by = v_user_id
  where key = p_key
  returning * into v_setting;

  if v_setting.key is null then
    raise exception 'Setting not found' using errcode = '22023';
  end if;

  if p_key in ('booking_deposit_amount', 'deposit_refund_amount', 'cancellation_penalty_amount')
     and (
       select
         (select (value #>> '{}')::numeric from public.platform_settings where key = 'deposit_refund_amount')
         + (select (value #>> '{}')::numeric from public.platform_settings where key = 'cancellation_penalty_amount')
         <> (select (value #>> '{}')::numeric from public.platform_settings where key = 'booking_deposit_amount')
     ) then
    raise exception 'Refund and penalty must equal booking deposit' using errcode = '22023';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_user_id, 'setting.updated', 'platform_setting', p_key, jsonb_build_object('value', p_value));

  return v_setting;
end;
$$;

revoke execute on function public.admin_update_platform_setting(text, jsonb) from public, anon;
grant execute on function public.admin_update_platform_setting(text, jsonb) to authenticated;

create function public.queue_due_booking_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hours integer := 24;
  v_booking record;
  v_count integer := 0;
begin
  select coalesce((value #>> '{}')::integer, 24)
  into v_hours
  from public.platform_settings where key = 'reminder_hours_before_booking';

  for v_booking in
    select b.id, b.player_id, b.public_code, b.starts_at
    from public.bookings b
    where b.status = 'confirmed'
      and b.starts_at > now()
      and b.starts_at <= now() + make_interval(hours => v_hours)
  loop
    perform private.create_notification(
      v_booking.player_id,
      'booking.reminder',
      'Tu reserva se acerca',
      'Recuerda tu reserva ' || v_booking.public_code || '.',
      '/reservar/' || v_booking.id::text,
      'booking:' || v_booking.id::text || ':reminder:' || v_booking.starts_at::date::text,
      true,
      true
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.queue_due_booking_reminders() from public, anon, authenticated;
grant execute on function public.queue_due_booking_reminders() to service_role;

update public.venues
set trial_started_at = coalesce(trial_started_at, approved_at, now()),
    trial_ends_at = coalesce(trial_ends_at, coalesce(approved_at, now()) + interval '3 months'),
    subscription_status = 'trial'
where status = 'approved' and trial_started_at is null;

commit;
