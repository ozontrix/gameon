-- WhatsApp Cloud API delivery log and cached header-image media ids.
-- Server-only: every write goes through the API using the service role, and the
-- status webhook is the only other writer.

create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  -- Makes a send idempotent: a second confirmation of the same booking reuses
  -- this row instead of sending the customer a duplicate message.
  dedupe_key text not null unique,
  category text not null check (category in ('booking', 'event', 'tournament')),
  reference_id uuid not null,
  user_id uuid references public.profiles(id) on delete set null,
  to_phone text not null,
  template_name text not null,
  language text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  wa_message_id text,
  media_id text,
  attempts integer not null default 0,
  error_code text,
  error_message text,
  -- The exact template payload sent, for support and replay.
  payload jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz
);

create index whatsapp_messages_recent on public.whatsapp_messages (created_at desc);
create index whatsapp_messages_status on public.whatsapp_messages (status, created_at desc);
create index whatsapp_messages_reference on public.whatsapp_messages (category, reference_id);
-- The webhook resolves a delivery by Meta's own message id.
create unique index whatsapp_messages_wa_id on public.whatsapp_messages (wa_message_id)
  where wa_message_id is not null;

comment on table public.whatsapp_messages is
  'One row per WhatsApp template delivery, keyed by dedupe_key so a booking confirmation is never sent twice. Status is advanced by the Cloud API webhook.';

-- Uploaded media ids are valid for 30 days, so a header image is uploaded once
-- and reused instead of re-uploading the same image for every message.
create table public.whatsapp_media (
  purpose text primary key,
  media_id text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles(id) on delete set null
);

comment on table public.whatsapp_media is
  'Cached Cloud API media ids (e.g. the template header image), refreshed before Meta expires them.';

alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_media enable row level security;
revoke all on public.whatsapp_messages from anon, authenticated;
revoke all on public.whatsapp_media from anon, authenticated;
grant all on public.whatsapp_messages to service_role;
grant all on public.whatsapp_media to service_role;

notify pgrst, 'reload schema';
