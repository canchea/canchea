-- Prueba transaccional del resumen del embudo. Todo se revierte al final.

begin;

insert into auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values (
  '00000000-0000-0000-0000-000000000051'::uuid,
  'authenticated', 'authenticated', 'funnel-admin@invalid.local',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"given_name":"Admin","family_name":"Embudo"}'::jsonb,
  now(), now(), false, false
);

update public.profiles
set role = 'super_admin',
    phone_e164 = '+59170000051',
    city = 'Santa Cruz de la Sierra',
    terms_accepted_at = now(),
    privacy_accepted_at = now(),
    onboarding_completed_at = now()
where id = '00000000-0000-0000-0000-000000000051'::uuid;

delete from public.analytics_events;

insert into public.analytics_events (event_name, visitor_id, metadata)
values
  ('search_performed', '00000000-0000-4000-8000-000000000001', '{"sport":"futbol","zone":"Norte","result_count":3}'),
  ('search_performed', '00000000-0000-4000-8000-000000000001', '{"sport":"padel","result_count":0}'),
  ('search_performed', '00000000-0000-4000-8000-000000000002', '{"sport":"futbol","result_count":5}'),
  ('slot_selected', '00000000-0000-4000-8000-000000000002', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000051","role":"authenticated"}', true);

do $$
declare
  v_summary jsonb := public.get_funnel_summary(30);
begin
  if (v_summary #>> '{funnel,visitors}')::integer <> 2
     or (v_summary #>> '{funnel,searchers}')::integer <> 2
     or (v_summary #>> '{funnel,searches}')::integer <> 3
     or (v_summary #>> '{funnel,empty_searches}')::integer <> 1
     or (v_summary #>> '{funnel,slot_selectors}')::integer <> 1 then
    raise exception 'Resumen del embudo inesperado: %', v_summary -> 'funnel';
  end if;

  if (v_summary #>> '{sports,0,label}') <> 'futbol' or (v_summary #>> '{sports,0,count}')::integer <> 2 then
    raise exception 'Ranking de deportes inesperado: %', v_summary -> 'sports';
  end if;
end;
$$;

-- Un usuario sin rol de super admin no puede leer el resumen.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  perform public.get_funnel_summary(30);
  raise exception 'Un visitante anónimo no debe leer la analítica';
exception
  when insufficient_privilege then
    null;
end;
$$;

reset role;
rollback;
