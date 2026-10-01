begin;

create index venues_search_approved_zone_idx
on public.venues (lower(zone), approved_at desc)
where status = 'approved';

create index courts_search_active_sport_idx
on public.courts (sport_id, venue_id)
where status = 'active';

create function public.search_available_courts(
  p_sport_slug text default null,
  p_zone text default null,
  p_date date default null,
  p_time time default null,
  p_min_price_bob numeric default null,
  p_max_price_bob numeric default null,
  p_duration_minutes smallint default null,
  p_sort text default 'recommended',
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_limit integer default 12,
  p_offset integer default 0
)
returns table (
  court_id uuid,
  venue_id uuid,
  venue_slug text,
  venue_name text,
  venue_zone text,
  venue_city text,
  venue_latitude numeric,
  venue_longitude numeric,
  court_name text,
  sport_slug text,
  sport_name text,
  modality_name text,
  surface_name text,
  capacity smallint,
  is_roofed boolean,
  has_lighting boolean,
  slot_date date,
  starts_at timestamptz,
  ends_at timestamptz,
  start_time time,
  duration_minutes smallint,
  price_bob numeric,
  distance_km numeric,
  venue_services text[],
  court_features text[],
  cover_object_path text,
  cover_alt_text text,
  total_count bigint
)
language plpgsql
security invoker
set search_path = ''
stable
as $$
begin
  if p_date is null then
    raise exception 'Search date is required' using errcode = '22023';
  end if;

  if p_sort not in ('recommended', 'price_asc', 'price_desc', 'distance', 'rating', 'popularity', 'newest') then
    raise exception 'Unknown search sort' using errcode = '22023';
  end if;

  if p_duration_minutes is not null and p_duration_minutes not in (30, 60) then
    raise exception 'Unsupported duration' using errcode = '22023';
  end if;

  if p_min_price_bob is not null and p_min_price_bob < 0
     or p_max_price_bob is not null and p_max_price_bob < 0
     or p_min_price_bob is not null and p_max_price_bob is not null and p_min_price_bob > p_max_price_bob then
    raise exception 'Invalid price range' using errcode = '22023';
  end if;

  if (p_latitude is null) <> (p_longitude is null)
     or p_latitude is not null and p_latitude not between -90 and 90
     or p_longitude is not null and p_longitude not between -180 and 180 then
    raise exception 'Invalid search coordinates' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 50 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid pagination' using errcode = '22023';
  end if;

  return query
  with matches as (
    select
      c.id as match_court_id,
      v.id as match_venue_id,
      v.slug as match_venue_slug,
      v.commercial_name as match_venue_name,
      v.zone as match_venue_zone,
      v.city as match_venue_city,
      v.latitude as match_venue_latitude,
      v.longitude as match_venue_longitude,
      v.approved_at as match_approved_at,
      c.name as match_court_name,
      s.slug as match_sport_slug,
      s.name as match_sport_name,
      m.name as match_modality_name,
      surface.name as match_surface_name,
      c.capacity as match_capacity,
      c.is_roofed as match_is_roofed,
      c.has_lighting as match_has_lighting,
      available.slot_date as match_slot_date,
      available.starts_at as match_starts_at,
      available.ends_at as match_ends_at,
      available.start_time as match_start_time,
      available.duration_minutes as match_duration_minutes,
      available.price_bob as match_price_bob,
      case
        when p_latitude is null then null::numeric
        else round((6371 * acos(least(1::double precision, greatest(-1::double precision,
          sin(radians(p_latitude::double precision)) * sin(radians(v.latitude::double precision))
          + cos(radians(p_latitude::double precision)) * cos(radians(v.latitude::double precision))
          * cos(radians(v.longitude::double precision) - radians(p_longitude::double precision))
        ))))::numeric, 1)
      end as match_distance_km,
      array(
        select service.name
        from public.venue_services link
        join public.services service on service.id = link.service_id
        where link.venue_id = v.id and service.is_active
        order by service.sort_order, service.name
        limit 3
      ) as match_venue_services,
      array(
        select feature.name
        from public.court_feature_assignments assignment
        join public.court_features feature on feature.id = assignment.feature_id
        where assignment.court_id = c.id and feature.is_active
        order by feature.sort_order, feature.name
        limit 3
      ) as match_court_features,
      cover.object_path as match_cover_object_path,
      cover.alt_text as match_cover_alt_text
    from public.courts c
    join public.venues v on v.id = c.venue_id
    join public.sports s on s.id = c.sport_id
    join public.sport_modalities m on m.id = c.modality_id
    join public.court_surfaces surface on surface.id = c.surface_id
    cross join lateral (
      select slot.*
      from public.get_court_availability(c.id, p_date) slot
      where (p_time is null or slot.start_time = p_time)
        and (p_duration_minutes is null or slot.duration_minutes = p_duration_minutes)
        and (p_min_price_bob is null or slot.price_bob >= p_min_price_bob)
        and (p_max_price_bob is null or slot.price_bob <= p_max_price_bob)
      order by
        case when p_sort = 'price_asc' then slot.price_bob end asc,
        case when p_sort = 'price_desc' then slot.price_bob end desc,
        slot.starts_at asc,
        slot.duration_minutes desc
      limit 1
    ) available
    left join lateral (
      select photo.object_path, photo.alt_text
      from public.court_photos photo
      where photo.court_id = c.id and photo.kind = 'cover'
      order by photo.sort_order, photo.created_at
      limit 1
    ) cover on true
    where c.status = 'active'
      and v.status = 'approved'
      and s.is_active
      and (nullif(trim(p_sport_slug), '') is null or s.slug = lower(trim(p_sport_slug)))
      and (nullif(trim(p_zone), '') is null or lower(v.zone) = lower(trim(p_zone)))
  ), counted as (
    select matches.*, count(*) over () as match_total_count
    from matches
  )
  select
    counted.match_court_id,
    counted.match_venue_id,
    counted.match_venue_slug,
    counted.match_venue_name,
    counted.match_venue_zone,
    counted.match_venue_city,
    counted.match_venue_latitude,
    counted.match_venue_longitude,
    counted.match_court_name,
    counted.match_sport_slug,
    counted.match_sport_name,
    counted.match_modality_name,
    counted.match_surface_name,
    counted.match_capacity,
    counted.match_is_roofed,
    counted.match_has_lighting,
    counted.match_slot_date,
    counted.match_starts_at,
    counted.match_ends_at,
    counted.match_start_time,
    counted.match_duration_minutes,
    counted.match_price_bob,
    counted.match_distance_km,
    counted.match_venue_services,
    counted.match_court_features,
    counted.match_cover_object_path,
    counted.match_cover_alt_text,
    counted.match_total_count
  from counted
  order by
    case when p_sort = 'price_asc' then counted.match_price_bob end asc,
    case when p_sort = 'price_desc' then counted.match_price_bob end desc,
    case when p_sort = 'distance' then counted.match_distance_km end asc nulls last,
    case when p_sort in ('rating', 'popularity', 'newest') then counted.match_approved_at end desc nulls last,
    case when p_sort = 'recommended' then counted.match_starts_at end asc,
    counted.match_price_bob asc,
    counted.match_court_id
  limit p_limit
  offset p_offset;
end;
$$;

comment on function public.search_available_courts(text, text, date, time, numeric, numeric, smallint, text, numeric, numeric, integer, integer)
is 'Búsqueda pública de canchas con un horario realmente reservable para la fecha y filtros indicados.';

revoke execute on function public.search_available_courts(text, text, date, time, numeric, numeric, smallint, text, numeric, numeric, integer, integer) from public;
grant execute on function public.search_available_courts(text, text, date, time, numeric, numeric, smallint, text, numeric, numeric, integer, integer) to anon, authenticated;

commit;
