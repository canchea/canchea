-- Prueba transaccional del alta, envío, aprobación y visibilidad pública.
-- Todo se revierte al final.

begin;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000031'::uuid,
    'authenticated', 'authenticated', 'fase3-owner@invalid.local',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"given_name":"Dueña","family_name":"Prueba"}'::jsonb,
    now(), now(), false, false
  ),
  (
    '00000000-0000-0000-0000-000000000032'::uuid,
    'authenticated', 'authenticated', 'fase3-admin@invalid.local',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"given_name":"Admin","family_name":"Prueba"}'::jsonb,
    now(), now(), false, false
  );

update public.profiles
set role = 'super_admin',
    phone_e164 = '+59170000032',
    city = 'Santa Cruz de la Sierra',
    terms_accepted_at = now(),
    privacy_accepted_at = now(),
    onboarding_completed_at = now()
where id = '00000000-0000-0000-0000-000000000032'::uuid;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}', true);

select public.complete_onboarding(
  'venue_owner', 'Dueña', 'Prueba', '+59170000031',
  'Santa Cruz de la Sierra', true, true
);

select public.save_my_venue(
  null,
  'Complejo Fase Tres',
  'Complejo deportivo de prueba con espacios seguros y buena iluminación.',
  '+59170000031',
  '+59170000031',
  'Avenida de Prueba 123',
  'Equipetrol',
  'Santa Cruz de la Sierra',
  -17.783300,
  -63.182100,
  array['estacionamiento', 'iluminacion'],
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

select public.register_my_venue_photo(
  (select id from public.venues where owner_id = (select auth.uid())),
  (select id::text || '/logo/test.png' from public.venues where owner_id = (select auth.uid())),
  'logo',
  'Logo del complejo de prueba'
);
select public.register_my_venue_photo(
  (select id from public.venues where owner_id = (select auth.uid())),
  (select id::text || '/cover/test.jpg' from public.venues where owner_id = (select auth.uid())),
  'cover',
  'Portada del complejo de prueba'
);

select public.submit_my_venue((select id from public.venues where owner_id = (select auth.uid())));

do $$
begin
  if not exists (
    select 1 from public.venues
    where owner_id = (select auth.uid()) and status = 'pending_approval'
  ) then
    raise exception 'El complejo no quedó pendiente de aprobación';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000032","role":"authenticated"}', true);

select public.review_venue(
  (select id from public.venues where commercial_name = 'Complejo Fase Tres'),
  'approve',
  null
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  if (select count(*) from public.venues where commercial_name = 'Complejo Fase Tres') <> 1 then
    raise exception 'El complejo aprobado no es visible públicamente';
  end if;
end;
$$;

reset role;
rollback;
