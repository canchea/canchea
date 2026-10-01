-- Prueba transaccional reproducible para perfiles, onboarding y permisos RLS.
-- Todo se revierte al final: no deja usuarios ni perfiles de prueba.

begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'fase2-test@invalid.local',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"given_name":"Ana","family_name":"Prueba"}'::jsonb,
  now(),
  now(),
  false,
  false
);

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000001'::uuid
      and first_name = 'Ana'
      and last_name = 'Prueba'
  ) then
    raise exception 'El trigger no creó el perfil esperado';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  perform public.complete_onboarding(
    'super_admin'::public.app_role,
    'Ana',
    'Prueba',
    '+59170000000',
    'Santa Cruz de la Sierra',
    true,
    true
  );
  raise exception 'El onboarding no debe permitir super_admin';
exception
  when sqlstate '22023' then null;
end;
$$;

select public.complete_onboarding(
  'player'::public.app_role,
  'Ana',
  'Prueba',
  '+59170000000',
  'Santa Cruz de la Sierra',
  true,
  true
);

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'player'::public.app_role
      and onboarding_completed_at is not null
  ) then
    raise exception 'El onboarding válido no guardó el perfil esperado';
  end if;
end;
$$;

do $$
begin
  update public.profiles
  set role = 'venue_owner'::public.app_role
  where id = (select auth.uid());
  raise exception 'La actualización directa del rol debió fallar';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;
rollback;
