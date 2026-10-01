begin;

create type public.app_role as enum (
  'player',
  'venue_owner',
  'super_admin'
);

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role,
  first_name text,
  last_name text,
  phone_e164 text,
  city text,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_first_name_length check (first_name is null or char_length(first_name) between 2 and 80),
  constraint profiles_last_name_length check (last_name is null or char_length(last_name) between 2 and 80),
  constraint profiles_phone_e164_format check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint profiles_city_length check (city is null or char_length(city) between 2 and 100),
  constraint profiles_completed_data check (
    onboarding_completed_at is null
    or (
      role is not null
      and first_name is not null
      and last_name is not null
      and phone_e164 is not null
      and city is not null
      and terms_accepted_at is not null
      and privacy_accepted_at is not null
    )
  )
);

comment on table public.profiles is 'Datos privados y rol principal de cada cuenta autenticada.';
comment on column public.profiles.role is 'Rol autorizado. Nunca se deriva de raw_user_meta_data.';
comment on column public.profiles.phone_e164 is 'Teléfono normalizado en formato E.164, por ejemplo +59170000000.';

create index profiles_role_idx on public.profiles (role) where role is not null;

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (first_name, last_name, phone_e164, city, updated_at)
  on table public.profiles to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own_contact_data"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'given_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'family_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create function public.complete_onboarding(
  p_role public.app_role,
  p_first_name text,
  p_last_name text,
  p_phone_e164 text,
  p_city text,
  p_accept_terms boolean,
  p_accept_privacy boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing_role public.app_role;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_role is null or p_role not in ('player'::public.app_role, 'venue_owner'::public.app_role) then
    raise exception 'Only player or venue_owner can be selected during onboarding'
      using errcode = '22023';
  end if;

  if not coalesce(p_accept_terms, false) or not coalesce(p_accept_privacy, false) then
    raise exception 'Terms and privacy acceptance are required'
      using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_first_name, ''))) not between 2 and 80
     or char_length(trim(coalesce(p_last_name, ''))) not between 2 and 80 then
    raise exception 'First and last name are required' using errcode = '22023';
  end if;

  if p_phone_e164 is null or p_phone_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Phone must use E.164 format' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_city, ''))) not between 2 and 100 then
    raise exception 'City is required' using errcode = '22023';
  end if;

  select role
  into v_existing_role
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_existing_role is not null and v_existing_role <> p_role then
    raise exception 'The primary account role cannot be changed from onboarding'
      using errcode = '42501';
  end if;

  update public.profiles
  set
    role = coalesce(role, p_role),
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    phone_e164 = p_phone_e164,
    city = trim(p_city),
    terms_accepted_at = coalesce(terms_accepted_at, timezone('utc', now())),
    privacy_accepted_at = coalesce(privacy_accepted_at, timezone('utc', now())),
    onboarding_completed_at = coalesce(onboarding_completed_at, timezone('utc', now()))
  where id = v_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke execute on function public.complete_onboarding(
  public.app_role,
  text,
  text,
  text,
  text,
  boolean,
  boolean
) from public, anon;

grant execute on function public.complete_onboarding(
  public.app_role,
  text,
  text,
  text,
  text,
  boolean,
  boolean
) to authenticated;

create function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
$$;

revoke execute on function private.current_user_role() from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.current_user_role() to authenticated, service_role;

create function private.assign_super_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    role = 'super_admin'::public.app_role,
    onboarding_completed_at = coalesce(onboarding_completed_at, timezone('utc', now()))
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function private.assign_super_admin(uuid) from public, anon, authenticated;
grant execute on function private.assign_super_admin(uuid) to service_role;

commit;
