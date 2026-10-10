-- Capacity triggers already schema-qualify their table references.
alter function public.enforce_event_capacity() set search_path = '';
alter function public.enforce_tournament_capacity() set search_path = '';