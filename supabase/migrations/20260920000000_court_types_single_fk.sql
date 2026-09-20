-- One foreign key between facilities and court_types (2026-09-20)
--
-- 20260919210000_court_types left two: the plain court_type_id -> court_types(id)
-- and the composite (court_type_id, venue_id) -> court_types(id, venue_id). The
-- Data API cannot embed across two relationships between the same tables, so
-- every facilities <-> court_types join failed with PGRST201.
--
-- The composite key alone is enough once venue_id is NOT NULL: a Postgres
-- foreign key is skipped when any of its columns is null, so without that a
-- court with no venue could point at a type that does not exist. With it, the
-- composite key guarantees both that the type exists and that it is at the
-- court's own venue.

do $$
declare orphans integer;
begin
  select count(*) into orphans from public.facilities where venue_id is null;
  if orphans > 0 then
    raise exception 'Cannot continue: % facilities have no venue', orphans;
  end if;
end $$;

alter table public.facilities alter column venue_id set not null;

alter table public.facilities drop constraint if exists facilities_court_type_id_fkey;

notify pgrst, 'reload schema';
