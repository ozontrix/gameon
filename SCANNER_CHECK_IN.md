# Reception QR check-in

## Daily operation

Sign in as ADMIN or STAFF and open `/admin/check-in` (Operations → Check-in).
Keep that browser tab/window active. Connect the scanner before **or after**
opening the page. Do not focus a form field: scanning automatically verifies,
records entry and audit, shows green/red/amber feedback, and returns to Ready
after five seconds. The most recent result remains below. While “Verifying…” is
shown, wait before scanning the next customer; scans during an active request
are intentionally ignored, not queued for later admission.

Keyboard scanners cannot report their physical connection to this page. “Scanner
ready” means the listener is ready, not that hardware has been detected. The
page warns when its window loses focus. Browser address bars, other tabs/apps,
and intentionally focused inputs cannot be intercepted. USB HID keyboard mode
does not require WebHID permissions or a camera. Browser/OS shortcuts using
Ctrl/Alt/Meta are deliberately not captured: configure plain text output only.

## ENKART U4 setup / acceptance test

Required output configuration (use the programming sheet supplied with **your**
U4; model-specific setup barcodes have not been verified):

1. USB HID **keyboard** interface, not serial/COM or proprietary SDK mode.
2. Plug in the USB cable or paired 2.4 GHz USB receiver. If the cable is charging
   only, use the receiver/data cable provided by the supplier.
3. Live/instant transmission, not offline inventory/storage upload.
4. Enable QR/2D decoding and phone/display reading if the device exposes it.
5. Add **Enter/CR** after each decoded value. CR+LF double-Enter is tolerated.
6. No prefix, custom suffix, Tab, function-key macros or symbology identifier.
7. Match the scanner keyboard layout to Windows (use the same English layout).
   Use fast/default keyboard transmission; tune timing below if necessary.

First scan a known QR into Notepad: it should type the exact full payload and
move to the next line. Then close Notepad, activate the GameOn check-in page and
scan a **test** confirmed/paid booking inside its entry window. Confirm green
feedback, customer/court/date/time, and the activity log. Wait over 1.2 seconds,
rescan and confirm amber “Already checked in” with the original timestamp.
Test an invalid QR, cancellation, unpaid booking, wrong date, receiver reconnect,
and offline recovery. Physical ENKART hardware acceptance remains required.

No authoritative ENKART U4 manual was located during implementation. Do not use
another manufacturer's configuration barcodes. Request the U4-specific sheet
from ENKART/the supplier if these settings are not clear.

## Payload compatibility

Unchanged customer app/web/WhatsApp QR payloads:

```text
11111111-1111-4111-8111-111111111111
gameon:event:11111111-1111-4111-8111-111111111111
gameon:tournament:11111111-1111-4111-8111-111111111111
```

Only exact UUID/category formats are accepted, case-insensitively, with outer
whitespace trimmed. URLs, arbitrary JSON, invented booking prefixes and short
IDs are **not** QR formats in this project. The existing booking-detail server
action retains its staff-only eight-character reference resolver; the scanner's
manual test takes the full QR payload. No QR generation/mobile changes were made.

A UUID is an opaque, random booking reference, not a signature or expiring
cryptographic token. Changing arbitrary characters normally produces not-found,
but possession of another valid booking UUID remains possession of its pass.
Staff should confirm the displayed customer name. Signed/rotating passes require
a separate coordinated mobile/API rollout; this implementation does not pretend
to prevent sharing/screenshots before first use.

## API and validation

Existing endpoint: `POST /api/v1/admin/bookings/verify-qr`.

```json
{"qrData":"11111111-1111-4111-8111-111111111111","source":"hid","venueId":"22222222-2222-4222-8222-222222222222"}
```

`venueId`/`facilityId` are optional expected-location constraints, never booking
facts. The UI selects the only active venue automatically; multiple venues offer
a reception selector (or all GameOn venues). Staff currently have project-wide
access; there is no per-venue role model to enforce. The server obtains sport,
facility, venue, customer and schedule from the reservation's database relations.

Panel cookies or the existing `Authorization: Bearer …` staff token are accepted.
Legacy `{ "bookingId": "…" }` requests and top-level success details remain
supported. Responses add `status`, `message`, and `booking`. Rejections return
HTTP 400 (401/403 auth, 413 oversized, 415 content type, 429 throttling, 503 unavailable). Invalid JSON/oversized
requests fail before reservation processing. Technical errors are not exposed.
Contact phones are no longer returned by this endpoint (`userPhone: null`).

The server-only service calls `check_in_reservation` with the authenticated actor.
The SQL function is SECURITY DEFINER with an empty search path, explicit schema
references and execute revoked from PUBLIC/anon/authenticated. It rechecks the
current auth.users staff role. Only service_role can call it. No privileged key
is shipped to the browser. Cookie requests require same-origin JSON semantics;
cross-site/origin requests are rejected.

Validation under a reservation row lock covers existence, confirmed state,
payment PAID (including free/complimentary bookings using existing payment state),
cancellation/refund, active venue/facility, current activity publication, expected
venue/court, prior check-in, dates, and entry window in the venue's timezone.
Pending `expires_at` is a checkout hold; it is not treated as confirmed-pass
expiry. Confirmed-pass expiry is the reservation's schedule. Entry opens 30
minutes before start and closes exactly at end; no previous-day early entry.
Multi-day activities admit the entire order/team once, preserving current rules.

Set server environment `CHECK_IN_EARLY_MINUTES=30` (integer 0–240) to change the
early-entry allowance. It cannot be overridden by the browser request.

## Atomic persistence and audit

Migration `supabase/migrations/20261017172209_atomic_reservation_check_in.sql`
was applied to the connected Supabase project on October 17, 2026. No new tables,
customer data backfills or scan columns: reuses bookings.is_scanned/scanned_at,
activity scanned_at, and admin_audit_log. Adds the RPC and a partial audit index.

`booking.scan` audit entries record server timestamp, actor ID/email, category,
reservation ID, status, source, venue/court, prior scan state and entry timestamp.
Raw QR values and contact details are not logged. Valid-format rejected scans
and malformed QR values that reach the operation are audited. Authentication,
transport/schema rejection and throttled requests are not reservation audits.
Audit insert and check-in are in the same transaction; either both commit or
neither does. Concurrent reception clients serialize on the reservation row.
The SQL path also caps each staff user at 120 attempts/minute across instances;
the existing API limiter adds best-effort 180 requests/minute/IP protection.

Frontend lock prevents all overlapping requests, and a 1.2-second same-code
cooldown absorbs repeated transmissions. Later rescans go to the server and
return already_checked_in, never a second successful entry. Network timeouts
are ambiguous: the backend may have committed despite a lost response. The UI
never invents success; rescan to retrieve the original check-in timestamp.

## Timing and keyboard safety

Edit `src/lib/scanner/config.ts` (also supports hook overrides):

| Setting | Default |
| --- | ---: |
| Maximum inter-character gap | 80 ms |
| Maximum average character interval | 35 ms |
| Idle buffer reset | 180 ms |
| Minimum / maximum raw length | 8 / 128 characters |
| Same-code cooldown after completion | 1200 ms |
| Result display | 5000 ms |
| Request timeout | 12000 ms |
| Required prefix / suffix | empty |
| Idle-time completion | false (Enter required) |

Global capture-phase keydown listener buffers printable characters, handles Shift,
discards slow/incomplete/oversized bursts, and finalizes on Enter. Cleanup resets
on blur, visibility change and unmount. Printable characters outside edit fields
are suppressed from the first key on this dedicated station to prevent browser
type-ahead; normal navigational keys remain available. Inputs, textareas, selects,
contenteditable, role=textbox and data-scanner-ignore are excluded. This timing
heuristic cannot distinguish an exceptionally fast human/macro from HID hardware;
all detected data still requires server authorization and validation. Optional
audio is best-effort and requires no button to make verification work.

## Manual and automated tests

Expand **Developer / Manual Test**, paste the full payload, then Verify & check in.
This is a real check-in, not a dry run. The input blurs after submission so the
next hardware scan needs no click. If manually focusing an input again, leave it
before returning to scanner operation. Optional camera scanning remains available.

From the GameOn web project directory:

```text
node --test scripts/test-scanner.mjs
node --test scripts/test-*.mjs
npx tsc --noEmit
npm run build
node scripts/browser-scanner.mjs
```

`scripts/scanner-check-in-database.sql` is a rollback-only integration test for
the SQL editor (postgres role); it creates synthetic fixtures, never uses real
customer bookings. Chrome test runs the actual React station and production CSS
with a local mock API, dispatching keyboard input without a focused field. It
does not bypass real panel auth or perform live admissions.
Run the Chrome HID test on an otherwise idle machine: it measures real keyboard
dispatch timing, and heavy concurrent builds/tests can exceed scanner thresholds.

Implementation validation: 22 scanner/API tests pass; full suite 383/387 passes.
The same four pre-existing failures occur in test-league-coming-soon.mjs (365
baseline tests: 361 pass). TypeScript, targeted ESLint and production build pass.
Rollback-only live database tests also covered court/activity admissions,
duplicates, payment/cancellation/refund/date/location, slot boundaries, current
authorization, rate limiting and transaction rollback. No test fixtures remained.
Explicit simultaneous-database-client admission and injected audit-insert-failure
tests have not been performed; row locks and transactional rollback are verified
by implementation review and the rollback fixture, not those additional scenarios.

Deploy the changed Next.js application; database migration alone does not publish
the UI/API. No new npm dependencies or mobile release is needed. Future gate
controllers should consume confirmed backend results server-side, not infer
permission from green UI; no gate unlocking was added here.