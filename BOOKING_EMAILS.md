# Booking confirmation emails

Both Android and iOS use the shared backend confirmation flow. Slot checkout now
passes `contactEmail`; event and tournament checkouts already provide it.
Email is optional. If omitted, the server uses the user's profile/auth email;
phone-only accounts without an email are recorded as skipped, never given a fake
address. Confirmation email is separate from WhatsApp consent.

The database trigger durably queues one email per confirmed slot booking, event
order or tournament registration. Paid holds and failed/refunded orders do not
receive confirmation emails. Free registrations confirm immediately. Captured
payments, wallet-settled slots, desk confirmations and webhook confirmations all
use the same confirmed-status trigger. No historical emails are backfilled.

Emails contain the reference, full ID, activity, date/time/timezone, venue/address,
court/player count, ticket count or team/captain, total, payment status, support
contact and private inline entry QR. Templates include escaped HTML and plain
text; QR images are generated in memory, not on a public third-party service.

Existing Brevo settings are reused: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`. No SMTP credentials belong
in either mobile app. The worker uses `CRON_SECRET` and runs at
`/api/cron/booking-emails` every minute. Hosting must support minute crons or an
external scheduler must call it with `Authorization: Bearer <CRON_SECRET>`.

Confirmation schedules an immediate post-response attempt, with cron recovery.
Safe failures retry up to five attempts with exponential delay. Interrupted SMTP
DATA or an accepted email whose log update failed is marked `unknown` and not
automatically resent: check Brevo transactional logs before manual intervention.
`sent` means accepted by SMTP, not proven inbox receipt. The `booking_emails`
table is service-role-only; it stores status/error classification, not raw secrets.

Deploy the backend after applying
`supabase/migrations/20261015170000_booking_confirmation_emails.sql`; release the
mobile checkout changes for explicitly entered slot emails. Existing apps can
still receive confirmations using the profile email fallback.

Validation: `node --test scripts/test-booking-emails.mjs` and
`node --conditions=react-server scripts/verify-smtp.mjs` (authentication only;
does not send customer emails).