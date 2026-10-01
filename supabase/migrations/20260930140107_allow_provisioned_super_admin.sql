begin;

create or replace function private.assign_super_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set
    role = 'super_admin'::public.app_role,
    onboarding_completed_at = case
      when first_name is not null
       and last_name is not null
       and phone_e164 is not null
       and city is not null
       and terms_accepted_at is not null
       and privacy_accepted_at is not null
      then coalesce(onboarding_completed_at, timezone('utc', now()))
      else onboarding_completed_at
    end
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function private.assign_super_admin(uuid) from public, anon, authenticated;
grant execute on function private.assign_super_admin(uuid) to service_role;

commit;
