# Admin WhatsApp workspace

Open **WhatsApp** in the admin sidebar (`/admin/whatsapp`). All pages and API operations require ADMIN; STAFF cannot read conversations or send messages. Tokens are server-only.

## Features

- Inbox: search/paginate contacts, open an Indian mobile number, view captured inbound/outbound history, load older messages, and refresh every ten seconds while visible.
- Custom text replies require a captured customer message less than 24 hours old. Outside that window, use an approved utility/marketing template. This is not WhatsApp Web and does not import pre-existing account history.
- Account & templates performs read-only Meta requests for sender, quality, verification, subscribed app count and templates. Text-header/body templates with static buttons are supported. Media-header/dynamic-button/authentication templates are visible but disabled in this composer. The existing QR sender is unchanged.
- Bulk messages lists only CONFIRMED League entries with captured amounts above zero (full and advance payments). Select a page, all matching entries across pages, or individual entries. The server reloads each entry before sending. Recipients are deduplicated per normalized phone. Personalize text and template variables with `{name}` and `{reference}`.
- Entry normalization strips non-digits, takes the last ten digits, validates an Indian mobile prefix, and adds `91` once for the API. Existing booking-QR normalization remains unchanged.
- Record actual obtained utility/marketing permission separately with source/date evidence. Payment does not auto-enroll customers. Consent changes and sends are audited. STOP/UNSUBSCRIBE/CANCEL/END/QUIT continue blocking sends; the panel cannot override opt-outs.
- Messages save correlation before dispatch and use a unique actor/batch/phone key to prevent duplicate identical attempts. Network/timeouts/5xx become `unknown`; no automatic retry. Early delivery/read receipts cannot be downgraded by send responses. Stale sending rows become unknown on history reads.
- Bulk sending is sequential in the open browser, not a scheduled/durable campaign worker. Keep the tab open. Stop/unmount prevents the next send but cannot recall the current request. Individual outcomes appear in the composer and conversations; closing the page loses the local campaign progress list, not stored message history.
- Automatic booking confirmation logs/recovery remain at `/admin/whatsapp/deliveries`; they are separate from manual inbox messages.
- Inbound non-text messages retain their webhook payload/details; downloading/sending attachments, calls, groups, profile editing, historical import, read-marking and template creation are not implemented.

## Database

`supabase/migrations/20261021120000_whatsapp_inbox.sql` was applied to the connected project on October 21, 2026. Remote migration timestamps may differ. Private `whatsapp_contacts` and `whatsapp_chat_messages` use RLS with no client grants/policies; only service role accesses them after admin authorization. Database trigger advances inbound window timestamps monotonically; unique Meta IDs deduplicate webhook retries.

Supabase reports informational “RLS enabled, no policy” notices for these intentionally server-only tables; do not add public policies to silence them. See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy. A separate existing Auth warning concerns leaked-password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Live account preflight — October 21, 2026

Read-only local checks found all five credentials present, sender access working, and the existing image-header booking template approved. **Meta reported `code_verification_status=EXPIRED`, quality GREEN, and zero subscribed apps on the WABA.** These require operator attention in Meta before relying on live messaging/history. No real customer message was sent and no account registration/subscription setting was changed.

1. Deploy the changed Next.js code (database migration is already applied).
2. Review/reverify/register the sender as appropriate in Meta WhatsApp Manager.
3. Configure the existing callback `/api/v1/webhooks/whatsapp` with the matching verify token and app secret. Subscribe the app to the WABA and `messages` webhook field.
4. Ensure the token has WhatsApp messaging/account-management permissions. The Account tab never displays it.
5. Create/approve an appropriate text-only utility/marketing template in Meta, refresh the account tab, and record recipient permission before initiating template messages.
6. With a consenting test number, initiate a customer chat, test reply/status receipts, template sends and STOP. Verify results in Meta as well as the admin screen.

## Validation

```bat
node --test scripts/test-whatsapp-inbox.mjs scripts/test-whatsapp.mjs scripts/test-league-bookings.mjs
node scripts/browser-whatsapp-inbox.mjs
node scripts/verify-whatsapp-inbox.mjs --tables
node scripts/check-whatsapp-config.mjs --meta
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build --webpack
```

Browser tests use isolated React and mocked API data, never real recipients. The read-only preflights never print tokens. The Meta preflight currently exits nonzero because no app is subscribed; mocked tests are not proof of live delivery.