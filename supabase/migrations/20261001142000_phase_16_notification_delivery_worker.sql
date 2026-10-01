create or replace function public.claim_notification_deliveries(
  p_channels text[],
  p_limit integer default 20
)
returns table (
  delivery_id uuid,
  channel text,
  recipient_email text,
  recipient_phone text,
  title text,
  body text,
  action_url text
)
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    select nd.id
    from public.notification_deliveries nd
    where nd.status in ('queued', 'failed')
      and nd.channel = any(p_channels)
      and nd.attempts < 5
      and nd.queued_at <= timezone('utc', now())
    order by nd.queued_at, nd.id
    limit least(greatest(p_limit, 1), 50)
    for update skip locked
  ), claimed as (
    update public.notification_deliveries nd
    set attempts = nd.attempts + 1,
        status = 'queued',
        queued_at = timezone('utc', now()) + interval '10 minutes',
        last_error_code = null,
        updated_at = timezone('utc', now())
    from candidates c
    where nd.id = c.id
    returning nd.id, nd.notification_id, nd.channel
  )
  select
    c.id,
    c.channel,
    u.email::text,
    p.phone_e164,
    n.title,
    n.body,
    n.action_url
  from claimed c
  join public.notifications n on n.id = c.notification_id
  join public.profiles p on p.id = n.recipient_id
  left join auth.users u on u.id = n.recipient_id;
$$;

create or replace function public.complete_notification_delivery(
  p_delivery_id uuid,
  p_success boolean,
  p_provider text,
  p_provider_message_id text default null,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.notification_deliveries
  set status = case when p_success then 'sent'::public.notification_delivery_status else 'failed'::public.notification_delivery_status end,
      provider = left(p_provider, 80),
      provider_message_id = case when p_success then left(p_provider_message_id, 240) else null end,
      last_error_code = case when p_success then null else left(coalesce(p_error_code, 'PROVIDER_ERROR'), 80) end,
      sent_at = case when p_success then timezone('utc', now()) else null end,
      queued_at = case when p_success then queued_at else timezone('utc', now()) + interval '15 minutes' end,
      updated_at = timezone('utc', now())
  where id = p_delivery_id
    and status = 'queued'
    and attempts between 1 and 5;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke execute on function public.claim_notification_deliveries(text[], integer) from public, anon, authenticated;
revoke execute on function public.complete_notification_delivery(uuid, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(text[], integer) to service_role;
grant execute on function public.complete_notification_delivery(uuid, boolean, text, text, text) to service_role;

comment on function public.claim_notification_deliveries(text[], integer) is
  'Claims queued external notifications with a ten-minute lease. Service role only.';
comment on function public.complete_notification_delivery(uuid, boolean, text, text, text) is
  'Completes a claimed external notification or schedules a bounded retry. Service role only.';
