begin;

drop index if exists public.courts_modality_idx;
create index if not exists courts_modality_sport_idx on public.courts (modality_id, sport_id);

commit;
