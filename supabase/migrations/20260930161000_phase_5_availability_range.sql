begin;

create function public.get_court_availability_range(
  p_court_id uuid,
  p_start_date date,
  p_days integer default 7
)
returns table (
  court_id uuid,
  slot_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  start_time time,
  duration_minutes smallint,
  price_bob numeric
)
language plpgsql
security invoker
set search_path = ''
stable
as $$
begin
  if p_start_date is null or p_days is null or p_days < 1 or p_days > 31 then
    raise exception 'Availability range must contain between 1 and 31 days' using errcode = '22023';
  end if;

  return query
  select availability.*
  from generate_series(0, p_days - 1) as offset_day
  cross join lateral public.get_court_availability(
    p_court_id,
    p_start_date + offset_day
  ) as availability
  order by availability.starts_at, availability.duration_minutes;
end;
$$;

revoke execute on function public.get_court_availability_range(uuid, date, integer) from public;
grant execute on function public.get_court_availability_range(uuid, date, integer) to anon, authenticated;

commit;
