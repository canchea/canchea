-- Ejecuta el worker de notificaciones cada 5 minutos desde la base de datos.
-- El cron de Vercel Hobby sólo permite una ejecución diaria, lo que hacía llegar
-- recordatorios después del partido. pg_cron + pg_net invocan el endpoint
-- protegido con CRON_SECRET sólo cuando existen entregas pendientes.
--
-- Configuración requerida (una vez por entorno, en SQL Editor):
--   select vault.create_secret('https://TU_DOMINIO/api/notifications/process', 'canchea_notifications_url');
--   select vault.create_secret('EL_MISMO_VALOR_DE_CRON_SECRET', 'canchea_cron_secret');
-- Sin esos secretos la tarea no hace nada.

create extension if not exists pg_net with schema extensions;

create or replace function private.dispatch_notification_deliveries()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (
    select 1
    from public.notification_deliveries nd
    where nd.status in ('queued', 'failed')
      and nd.attempts < 5
      and nd.queued_at <= timezone('utc', now())
  ) then
    return;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets
  where name = 'canchea_notifications_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'canchea_cron_secret';

  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 55000
  );
end;
$$;

revoke execute on function private.dispatch_notification_deliveries() from public, anon, authenticated;

comment on function private.dispatch_notification_deliveries() is
  'Invoca /api/notifications/process vía pg_net cuando hay entregas pendientes. Usa secretos de Vault.';

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'canchea-notification-dispatch') then
    perform cron.schedule(
      'canchea-notification-dispatch',
      '*/5 * * * *',
      'select private.dispatch_notification_deliveries();'
    );
  end if;
end;
$$;
