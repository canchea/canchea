do $$
declare
  function_definition text;
  previous_sort text := 'case when p_sort in (''rating'', ''popularity'', ''newest'') then counted.match_approved_at end desc nulls last,';
  organic_sort text := 'case when p_sort = ''rating'' then (select venue.rating_average from public.venues venue where venue.id = counted.match_venue_id) end desc nulls last,
    case when p_sort = ''popularity'' then (select count(*) from public.bookings booking where booking.venue_id = counted.match_venue_id and booking.status in (''confirmed'', ''in_progress'', ''completed'', ''no_show'')) end desc nulls last,
    case when p_sort = ''newest'' then counted.match_approved_at end desc nulls last,';
begin
  select pg_get_functiondef(
    'public.search_available_courts(text,text,date,time without time zone,numeric,numeric,smallint,text,numeric,numeric,integer,integer)'::regprocedure
  ) into function_definition;

  if position(previous_sort in function_definition) = 0 then
    raise exception 'Expected search ranking clause was not found';
  end if;

  execute replace(function_definition, previous_sort, organic_sort);
end;
$$;

comment on function public.search_available_courts(text, text, date, time, numeric, numeric, smallint, text, numeric, numeric, integer, integer)
is 'Búsqueda pública reservable con rankings orgánicos por calificación, volumen real y fecha de aprobación.';
