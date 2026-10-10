-- Wallet mutations must only be callable by the trusted backend.
-- Explicitly revoke each API role: revoking PUBLIC alone is insufficient.
revoke all on function public.wallet_adjust(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.wallet_adjust(uuid, integer, text, uuid) to service_role;
alter function public.wallet_adjust(uuid, integer, text, uuid) set search_path = '';

-- wallet_adjust already schema-qualifies its tables and uses pg_catalog builtins.
notify pgrst, 'reload schema';