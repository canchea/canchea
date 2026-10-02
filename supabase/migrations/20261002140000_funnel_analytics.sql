-- Analítica del embudo del piloto.
--
-- La parte final del embudo ya se registra con el trigger de reservas
-- (checkout_started, booking_confirmed, booking_expired, booking_cancelled).
-- Esta migración agrega el visitante anónimo para medir la parte superior
-- (search_performed, venue_viewed, slot_selected), que escribe el servidor
-- con la clave de servicio, y un resumen para el super admin.

alter table public.analytics_events add column if not exists visitor_id uuid;

create index if not exists analytics_events_visitor_idx
  on public.analytics_events (visitor_id, occurred_at desc)
  where visitor_id is not null;

create index if not exists analytics_events_occurred_idx
  on public.analytics_events (occurred_at desc);

comment on column public.analytics_events.visitor_id is
  'Identificador anónimo de primera parte (cookie canchea_vid). No contiene datos personales.';

create or replace function public.get_funnel_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
  v_result jsonb;
begin
  if (select private.current_user_role()) is distinct from 'super_admin' then
    raise exception 'Super admin role required' using errcode = '42501';
  end if;

  if p_days is null or p_days not between 1 and 365 then
    raise exception 'Invalid period' using errcode = '22023';
  end if;

  v_since := timezone('utc', now()) - make_interval(days => p_days);

  with events as (
    select *
    from public.analytics_events
    where occurred_at >= v_since
  ),
  funnel as (
    select jsonb_build_object(
      'visitors', (select count(distinct visitor_id) from events),
      'searchers', (select count(distinct visitor_id) from events where event_name = 'search_performed'),
      'venue_viewers', (select count(distinct visitor_id) from events where event_name = 'venue_viewed'),
      'slot_selectors', (select count(distinct visitor_id) from events where event_name = 'slot_selected'),
      'checkout_players', (select count(distinct actor_id) from events where event_name = 'checkout_started'),
      'confirmed_players', (select count(distinct actor_id) from events where event_name = 'booking_confirmed'),
      'searches', (select count(*) from events where event_name = 'search_performed'),
      'venue_views', (select count(*) from events where event_name = 'venue_viewed'),
      'slot_selections', (select count(*) from events where event_name = 'slot_selected'),
      'checkouts', (select count(*) from events where event_name = 'checkout_started'),
      'confirmed', (select count(*) from events where event_name = 'booking_confirmed'),
      'expired', (select count(*) from events where event_name = 'booking_expired'),
      'cancelled', (select count(*) from events where event_name = 'booking_cancelled'),
      'empty_searches', (
        select count(*) from events
        where event_name = 'search_performed' and (metadata ->> 'result_count')::integer = 0
      )
    ) as data
  ),
  sports as (
    select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', total) order by total desc), '[]'::jsonb) as data
    from (
      select coalesce(nullif(metadata ->> 'sport', ''), 'todos') as label, count(*) as total
      from events where event_name = 'search_performed'
      group by 1 order by 2 desc limit 8
    ) s
  ),
  zones as (
    select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', total) order by total desc), '[]'::jsonb) as data
    from (
      select coalesce(nullif(metadata ->> 'zone', ''), 'todas') as label, count(*) as total
      from events where event_name = 'search_performed'
      group by 1 order by 2 desc limit 8
    ) z
  ),
  venues as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'label', v.commercial_name,
      'views', stats.views,
      'confirmed', stats.confirmed
    ) order by stats.views desc), '[]'::jsonb) as data
    from (
      select
        venue_id,
        count(*) filter (where event_name = 'venue_viewed') as views,
        count(*) filter (where event_name = 'booking_confirmed') as confirmed
      from events
      where venue_id is not null
      group by venue_id
      order by 2 desc
      limit 10
    ) stats
    join public.venues v on v.id = stats.venue_id
  ),
  daily as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'day', day,
      'searches', searches,
      'confirmed', confirmed
    ) order by day), '[]'::jsonb) as data
    from (
      select
        (occurred_at at time zone 'America/La_Paz')::date as day,
        count(*) filter (where event_name = 'search_performed') as searches,
        count(*) filter (where event_name = 'booking_confirmed') as confirmed
      from events
      group by 1
    ) d
  )
  select jsonb_build_object(
    'days', p_days,
    'funnel', (select data from funnel),
    'sports', (select data from sports),
    'zones', (select data from zones),
    'venues', (select data from venues),
    'daily', (select data from daily)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_funnel_summary(integer) from public, anon;
grant execute on function public.get_funnel_summary(integer) to authenticated;

comment on function public.get_funnel_summary(integer) is
  'Resumen del embudo búsqueda → reserva confirmada para el super admin.';
