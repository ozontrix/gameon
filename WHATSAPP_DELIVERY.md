# Booking QR delivery on WhatsApp

## Implemented

- Confirmed court bookings, event orders and tournament registrations enqueue a delivery inside the database transaction when the customer opted in. Pending/unpaid checkout holds do not send a confirmation.
- A private, in-memory PNG is generated for **that reservation**, uploaded to `/{version}/{phone-number-id}/media`, and its returned media ID is used in the image header of `booking_with_qr_new` (`en`). No shared header image is used.
- Named body parameters: `customer_name`, `booking_id`, `sport`, `booking_date`, `booking_time`. The booking reference is the app's existing `#` plus eight UUID characters, not a new sequential GO number.
- Court QR content is the full booking UUID, matching the app. Activity QR content is `gameon:event:<uuid>` or `gameon:tournament:<uuid>`.
- Admin check-in accepts all three categories. Event admission is **one check-in for the entire ticket order**; tournament admission is one check-in for the team. Multi-day re-entry and individual ticket scanning are not implemented.
- Sending runs after the response, with a durable recovery worker every five minutes. A messaging failure does not undo a confirmed reservation.
- Concurrent workers use database leases. Definite retryable failures get up to three automatic attempts. Ambiguous sends (timeout/network/5xx after dispatch) become `unknown`, not blindly resent. This reduces duplicate risk; exactly-once delivery cannot be guaranteed across an external API.
- Signed webhooks track accepted/sent, delivered, read and failed states, including receipts that arrive before the HTTP send response. STOP/UNSUBSCRIBE/CANCEL/END/QUIT suppress future sends to that number, including manual retries.
- Admin panel: `/admin/whatsapp`, with status filters, errors and safe manual retry. `sent` means Meta accepted the message, not that it reached the phone.

## Required production configuration

Use `.env.local` for local backend testing and the hosting provider's **server-only** production environment. `.env.whatsapp.example` contains the non-secret configuration. Never put tokens or secrets into Expo, `EXPO_PUBLIC_*`, `NEXT_PUBLIC_*`, source control or screenshots.

| Setting | Value/action |
| --- | --- |
| `WHATSAPP_API_VERSION` | `v25.0` |
| `WHATSAPP_PHONE_NUMBER_ID` | `1249404248265828` |
| `WHATSAPP_WABA_ID` | `1593995945803140` |
| `WHATSAPP_TEMPLATE_NAME` | `booking_with_qr_new` |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en` |
| `WHATSAPP_DEFAULT_COUNTRY_CODE` | `91` |
| `WHATSAPP_ACCESS_TOKEN` | New production system-user access token with access to the WhatsApp assets |
| `WHATSAPP_APP_SECRET` | Meta app secret, used to verify webhook HMAC signatures |
| `WHATSAPP_VERIFY_TOKEN` | Strong random token; enter the same value in Meta's webhook setup |
| `CRON_SECRET` | Keep the existing backend value; required by the worker |

**Rotate the access token pasted into chat before launch.** It is not copied into committed files. The latest local preflight found the WhatsApp token, phone ID, app secret and verify token missing; live Meta acceptance has not been verified.

## Deployment checklist

1. Deploy backend code with the WhatsApp migrations. The connected database already has the delivery, QR/consent and recovery migrations applied; local filenames use checkout timestamps, while the remote migration ledger uses its application timestamps. Do not blindly reapply the same migrations to this database.
2. Set the production environment above, then redeploy. Do not send real customer messages from local development against the production queue.
3. Configure Meta's callback as `https://gameonmultisports.com/api/v1/webhooks/whatsapp`, use the matching verify token, and subscribe the WABA/app to `messages`. Confirm that the template is approved, uses an IMAGE header, `en`, and the five named body parameters above.
4. Ensure the hosting plan supports the five-minute cron in `vercel.json` and a worker duration up to 300 seconds. If unavailable, schedule an external authenticated GET to `/api/cron/whatsapp-deliveries` with `Authorization: Bearer <CRON_SECRET>`. Do not expose that secret publicly.
5. Build new Android and iOS releases: the previous binaries do not include the opt-in control. Older clients omit consent and therefore will not send WhatsApp messages. Messaging permission is optional and off by default; booking still works without it. India mobile numbers are currently supported.
6. With a consenting test recipient, make one confirmed reservation in each category. Check the QR image and all five fields, then watch `/admin/whatsapp` progress to delivered/read. Scan each image at Admin → Check-in and verify duplicate scans are rejected. Free activity entries should send without a gateway payment; cancelled/abandoned checkout holds must not send.
7. Reply STOP from the test phone and verify a later opted-in reservation is suppressed. There is no automated START re-subscription flow; do not remove an opt-out without obtaining and recording renewed permission.

No real message was sent during this implementation. A successful mocked test or build is not proof that Meta accepted the live credentials or template, or that the mobile app is approved by either store.

## Validation commands

Run from the backend project:

```bat
node --test scripts/test-whatsapp.mjs
node scripts/check-whatsapp-config.mjs --meta
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build --webpack
```

The read-only Meta preflight prints presence/status only, never token values. `--meta` checks sender access, approved image-header template and WABA subscriptions without sending messages. Use an isolated database to exercise a worker locally; the worker sends real messages when production credentials and queued reservations are present.