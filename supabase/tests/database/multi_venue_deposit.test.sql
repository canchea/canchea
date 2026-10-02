-- Prueba transaccional de seña mínima y multi-sucursal.
-- Todo se revierte al final.

begin;

-- Seña mínima: mayor entre el monto base y la comisión, sin superar el precio.
do $$
begin
  if private.booking_deposit_for(200, 50, 20) <> 50 then
    raise exception 'La seña base debe aplicarse cuando cubre la comisión';
  end if;
  if private.booking_deposit_for(600, 50, 60) <> 60 then
    raise exception 'La seña debe subir hasta cubrir la comisión';
  end if;
  if private.booking_deposit_for(30, 50, 3) <> 30 then
    raise exception 'La seña no puede superar el precio del horario';
  end if;
  if public.get_booking_deposit_quote(600) <> private.booking_deposit_for(
    600,
    (select (value #>> '{}')::numeric from public.platform_settings where key = 'booking_deposit_amount'),
    round(600 * (select (value #>> '{}')::numeric from public.platform_settings where key = 'platform_commission_percentage') / 100, 2)
  ) then
    raise exception 'La cotización de seña no coincide con la regla de reserva';
  end if;
end;
$$;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000041'::uuid,
    'authenticated', 'authenticated', 'multi-owner@invalid.local',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"given_name":"Dueño","family_name":"Sucursales"}'::jsonb,
    now(), now(), false, false
  ),
  (
    '00000000-0000-0000-0000-000000000042'::uuid,
    'authenticated', 'authenticated', 'other-owner@invalid.local',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"given_name":"Otra","family_name":"Dueña"}'::jsonb,
    now(), now(), false, false
  );

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000041","role":"authenticated"}', true);

select public.complete_onboarding(
  'venue_owner', 'Dueño', 'Sucursales', '+59170000041',
  'Santa Cruz de la Sierra', true, true
);

-- Dos sucursales nuevas para el mismo propietario.
select public.save_my_venue(
  null,
  'Complejo Sucursal Norte',
  'Sucursal de prueba ubicada al norte con canchas techadas e iluminación.',
  '+59170000041', '+59170000041',
  'Avenida Banzer 100', 'Norte', 'Santa Cruz de la Sierra',
  -17.750000, -63.170000,
  array['estacionamiento'],
  '[
    {"day_of_week":0,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":1,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":2,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":3,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":4,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":5,"is_closed":false,"opens_at":"08:00","closes_at":"22:00"},
    {"day_of_week":6,"is_closed":true,"opens_at":null,"closes_at":null}
  ]'::jsonb
);

select public.save_my_venue(
  null,
  'Complejo Sucursal Sur',
  'Sucursal de prueba ubicada al sur con canchas de césped sintético.',
  '+59170000041', '+59170000041',
  'Avenida Santos Dumont 200', 'Sur', 'Santa Cruz de la Sierra',
  -17.820000, -63.180000,
  array['estacionamiento'],
  '[
    {"day_of_week":0,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":1,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":2,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":3,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":4,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":5,"is_closed":false,"opens_at":"08:00","closes_at":"22:00"},
    {"day_of_week":6,"is_closed":true,"opens_at":null,"closes_at":null}
  ]'::jsonb
);

do $$
begin
  if (select count(*) from public.venues where owner_id = (select auth.uid())) <> 2 then
    raise exception 'El propietario debe poder registrar dos sucursales';
  end if;
end;
$$;

-- Editar una sucursal no debe modificar la otra.
select public.save_my_venue(
  (select id from public.venues where commercial_name = 'Complejo Sucursal Norte'),
  'Complejo Sucursal Norte Renovado',
  'Sucursal de prueba ubicada al norte con canchas techadas e iluminación.',
  '+59170000041', '+59170000041',
  'Avenida Banzer 100', 'Norte', 'Santa Cruz de la Sierra',
  -17.750000, -63.170000,
  array['estacionamiento'],
  '[
    {"day_of_week":0,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":1,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":2,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":3,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":4,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
    {"day_of_week":5,"is_closed":false,"opens_at":"08:00","closes_at":"22:00"},
    {"day_of_week":6,"is_closed":true,"opens_at":null,"closes_at":null}
  ]'::jsonb
);

do $$
begin
  if not exists (select 1 from public.venues where commercial_name = 'Complejo Sucursal Norte Renovado')
     or not exists (select 1 from public.venues where commercial_name = 'Complejo Sucursal Sur') then
    raise exception 'La edición debe afectar sólo a la sucursal indicada';
  end if;
end;
$$;

-- Otro propietario no puede editar sucursales ajenas.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000042","role":"authenticated"}', true);

select public.complete_onboarding(
  'venue_owner', 'Otra', 'Dueña', '+59170000042',
  'Santa Cruz de la Sierra', true, true
);

do $$
declare
  v_target uuid := '00000000-0000-0000-0000-000000000000';
begin
  -- RLS oculta la sucursal ajena; se usa su id conocido desde el contexto anterior.
  v_target := (select id from public.venues where owner_id = '00000000-0000-0000-0000-000000000041'::uuid limit 1);
  if v_target is null then
    v_target := gen_random_uuid();
  end if;

  begin
    perform public.save_my_venue(
      v_target,
      'Intento ajeno',
      'Intento de modificar una sucursal que pertenece a otro propietario.',
      '+59170000042', '+59170000042',
      'Calle Falsa 123', 'Centro', 'Santa Cruz de la Sierra',
      -17.780000, -63.180000,
      array['estacionamiento'],
      '[
        {"day_of_week":0,"is_closed":false,"opens_at":"07:00","closes_at":"23:00"},
        {"day_of_week":1,"is_closed":true,"opens_at":null,"closes_at":null},
        {"day_of_week":2,"is_closed":true,"opens_at":null,"closes_at":null},
        {"day_of_week":3,"is_closed":true,"opens_at":null,"closes_at":null},
        {"day_of_week":4,"is_closed":true,"opens_at":null,"closes_at":null},
        {"day_of_week":5,"is_closed":true,"opens_at":null,"closes_at":null},
        {"day_of_week":6,"is_closed":true,"opens_at":null,"closes_at":null}
      ]'::jsonb
    );
    raise exception 'Un propietario no debe editar sucursales ajenas';
  exception
    when insufficient_privilege then
      null;
  end;
end;
$$;

reset role;

do $$
begin
  if exists (select 1 from public.venues where commercial_name = 'Intento ajeno') then
    raise exception 'Se creó o modificó una sucursal ajena';
  end if;
end;
$$;

rollback;
