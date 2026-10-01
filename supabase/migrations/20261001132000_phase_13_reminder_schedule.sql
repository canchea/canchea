create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'canchea-booking-reminders') then
    perform cron.schedule(
      'canchea-booking-reminders',
      '*/15 * * * *',
      'select public.queue_due_booking_reminders();'
    );
  end if;
end;
$$;
