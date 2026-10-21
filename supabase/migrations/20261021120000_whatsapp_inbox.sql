-- Private Cloud API inbox. All access goes through authenticated admin handlers.
create table public.whatsapp_contacts (
  phone text primary key check (phone ~ '^91[0-9]{10}$'),
  name text not null default '',
  last_message_at timestamptz not null default now(),
  last_inbound_at timestamptz,
  utility_consent_at timestamptz,
  marketing_consent_at timestamptz,
  consent_evidence text,
  consent_recorded_by uuid
);
create table public.whatsapp_chat_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null references public.whatsapp_contacts(phone),
  direction text not null check (direction in ('inbound','outbound')),
  body text not null,
  message_type text not null default 'text',
  payload jsonb not null default '{}'::jsonb,
  wa_message_id text unique,
  request_key text unique,
  actor_id uuid,
  status text not null default 'received' check (status in ('received','sending','sent','delivered','read','failed','unknown')),
  error_message text,
  created_at timestamptz not null default now()
);
create index whatsapp_chat_phone_created on public.whatsapp_chat_messages(phone,created_at desc,id desc);
create index whatsapp_contacts_recent on public.whatsapp_contacts(last_message_at desc,phone);
alter table public.whatsapp_contacts enable row level security;
alter table public.whatsapp_chat_messages enable row level security;
revoke all on public.whatsapp_contacts,public.whatsapp_chat_messages from public,anon,authenticated;
grant all on public.whatsapp_contacts,public.whatsapp_chat_messages to service_role;

create function public.whatsapp_touch_contact() returns trigger language plpgsql set search_path = '' as $$
begin
  update public.whatsapp_contacts set
    last_message_at = greatest(last_message_at,new.created_at),
    last_inbound_at = case when new.direction='inbound' then greatest(last_inbound_at,new.created_at) else last_inbound_at end
  where phone=new.phone;
  return new;
end;
$$;
create trigger whatsapp_chat_touch after insert on public.whatsapp_chat_messages for each row execute function public.whatsapp_touch_contact();
revoke all on function public.whatsapp_touch_contact() from public,anon,authenticated;

-- Receipts may arrive before the send response; correlation is saved before dispatch.
create function public.whatsapp_chat_receipt(p_message_id text,p_status text,p_correlation text default null,p_error text default null)
returns void language plpgsql set search_path = '' as $$
begin
  if p_status not in ('sent','delivered','read','failed') then return; end if;
  update public.whatsapp_chat_messages set wa_message_id=p_message_id,status=p_status,error_message=p_error
  where direction='outbound' and (wa_message_id=p_message_id or ('chat:'||id::text)=p_correlation)
    and (wa_message_id is null or wa_message_id=p_message_id)
    and case p_status
      when 'read' then true
      when 'delivered' then status <> 'read'
      when 'failed' then status not in ('read','delivered')
      else status in ('sending','unknown','sent') end;
end;
$$;
revoke all on function public.whatsapp_chat_receipt(text,text,text,text) from public,anon,authenticated;
grant execute on function public.whatsapp_chat_receipt(text,text,text,text) to service_role;