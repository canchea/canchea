-- Verifica la política global de reservas nuevas en bloques exactos de una hora.

begin;

do $$
declare
  v_definition text;
begin
  select pg_get_constraintdef(oid) into v_definition
  from pg_constraint
  where conrelid = 'public.court_durations'::regclass
    and conname = 'court_durations_supported';

  if v_definition not like '%duration_minutes = 60%' then
    raise exception 'Las canchas deben admitir solamente bloques de 60 minutos';
  end if;

  select pg_get_constraintdef(oid) into v_definition
  from pg_constraint
  where conrelid = 'public.court_weekly_schedules'::regclass
    and conname = 'court_weekly_schedules_valid_minutes';

  if v_definition not like '%opens_minute % 60%' or v_definition not like '%closes_minute % 60%' then
    raise exception 'Los horarios semanales deben alinearse a horas completas';
  end if;

  select pg_get_constraintdef(oid) into v_definition
  from pg_constraint
  where conrelid = 'public.court_pricing_rules'::regclass
    and conname = 'court_pricing_rules_duration';

  if v_definition not like '%duration_minutes = 60%' then
    raise exception 'Las reglas de precio deben ser únicamente por hora';
  end if;

  -- Este constraint permanece compatible con el historial previo de 30 minutos.
  select pg_get_constraintdef(oid) into v_definition
  from pg_constraint
  where conrelid = 'public.bookings'::regclass
    and conname = 'bookings_duration_supported';

  if v_definition not like '%30%' or v_definition not like '%60%' then
    raise exception 'El historial debe conservar compatibilidad con reservas antiguas';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.bookings (duration_minutes, starts_at)
    values (30, '2030-01-01 20:00:00+00');
    raise exception 'Una reserva nueva de 30 minutos no debe permitirse';
  exception
    when sqlstate '22023' then
      null;
  end;

  begin
    insert into public.bookings (duration_minutes, starts_at)
    values (60, '2030-01-01 20:30:00+00');
    raise exception 'Una reserva nueva debe comenzar en una hora exacta';
  exception
    when sqlstate '22023' then
      null;
  end;
end;
$$;

do $$
declare
  v_definition text := pg_get_functiondef('public.get_court_availability(uuid,date)'::regprocedure);
begin
  if lower(v_definition) not like '%generate_series(%60)%'
     or lower(v_definition) not like '%60::smallint as candidate_duration%' then
    raise exception 'La disponibilidad debe generarse en bloques de una hora';
  end if;
end;
$$;

rollback;
