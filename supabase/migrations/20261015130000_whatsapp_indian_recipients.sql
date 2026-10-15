-- Normalize at log creation, including deliveries that never reach dispatch.
-- Preserve invalid numbers for diagnosis; the sender refuses them.
create or replace function public.normalize_whatsapp_delivery_phone()
returns trigger language plpgsql set search_path='' as $$
declare digits text;
begin
  digits := regexp_replace(coalesce(new.to_phone, ''), '[^0-9]', '', 'g');
  if left(digits, 2) = '00' then digits := substr(digits, 3); end if;
  digits := ltrim(digits, '0');
  if length(digits) = 10 then digits := '91' || digits; end if;
  if digits ~ '^91[0-9]{10}$' then new.to_phone := '+' || digits; end if;
  return new;
end; $$;
revoke all on function public.normalize_whatsapp_delivery_phone() from public, anon, authenticated;

create trigger whatsapp_delivery_normalize_phone
before insert or update of to_phone on public.whatsapp_messages
for each row execute function public.normalize_whatsapp_delivery_phone();

-- Repair existing log addresses only. Do not change statuses or retry/resend.
update public.whatsapp_messages set to_phone = to_phone
where to_phone !~ '^\+91[0-9]{10}$';