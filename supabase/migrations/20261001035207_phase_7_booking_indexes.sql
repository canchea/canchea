begin;

create index bookings_court_venue_idx on public.bookings (court_id, venue_id);

commit;
