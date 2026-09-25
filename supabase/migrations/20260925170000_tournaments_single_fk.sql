-- Tournaments: one relationship to court_types, not two (2026-09-25)
--
-- tournaments.court_type_id got both the plain FK Postgres auto-creates for
-- an inline `references` and the explicit composite FK to
-- court_types(id, venue_id). PostgREST refuses to embed court_types under an
-- ambiguous choice between them (PGRST201) — the same bug the court_types
-- migration hit for facilities, fixed the same way: drop the plain FK, keep
-- only the composite one. It already implies court_type_id -> court_types.id
-- on its own, since court_types.id is unique regardless of venue_id.

alter table public.tournaments drop constraint if exists tournaments_court_type_id_fkey;

notify pgrst, 'reload schema';
