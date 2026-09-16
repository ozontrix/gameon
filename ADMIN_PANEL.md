# GameOn admin panel

The staff and admin back office lives at **`/admin`** in this Next.js app. It
runs on the same Supabase project and booking services as the mobile API, so a
booking made at the front desk and a booking made in the app follow the same
rules (slot availability, holds, double-booking protection).

## First-time setup

1. **Apply the migrations** in `supabase/migrations/` (already applied to the
   GameOn Multisports project on 2026-09-17):
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
2. **Create the first admin.** Everyone after that is added from *Team & roles*.
   ```bash
   node scripts/grant-admin.mjs owner@example.com          # ADMIN
   node scripts/grant-admin.mjs desk@example.com STAFF
   ```
   An existing account keeps its password; a new one gets a one-time password
   printed in the terminal.
3. Sign in at `/admin/login` and change the password under *My account*.

Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(session cookies) and `SUPABASE_SERVICE_ROLE_KEY` (data access). No other
variables are needed for the panel.

## Roles

Roles live in the Supabase user's `app_metadata.role`, which only the service
role can write. Removing the role takes effect on the next page load.

| | Staff | Admin |
|---|:-:|:-:|
| Dashboard, schedule, check-in | ✓ | ✓ |
| Bookings: list, search, filter, CSV export, detail | ✓ | ✓ |
| Front-desk booking (walk-in / phone), record a pay-at-venue payment | ✓ | ✓ |
| Customers and their history | ✓ | ✓ |
| Cancel a booking, refund queue, record a refund | | ✓ |
| Venues & opening hours, courts & pricing, sports, closures | | ✓ |
| Team & roles (add, change role, reset password), activity log | | ✓ |

## What each page does

- **Dashboard** — today's bookings, occupancy, revenue (today / month / last 7
  days), a 14-day paid-revenue chart, and items needing attention.
- **Schedule** — every active court against every slot of a day. Click a free
  slot to book it, a booked slot to open the booking.
- **Check-in** — scans the QR in the customer's app with the device camera
  (Chrome on Android / desktop Chromium), or takes the 8-character booking ID.
  A booking is valid only on its date and only once.
- **Bookings** — filters by date, status, payment, source, venue and court;
  search by booking ID, name or phone; CSV export of the current filter.
  Abandoned app checkouts are hidden unless *Awaiting payment* is selected.
- **New booking** — confirmed immediately. Paid now (cash, UPI, card,
  complimentary) or pay at the venue later. If the phone number matches an app
  account, the booking appears in that customer's app. Slots already under way
  can still be booked for walk-ins.
- **Refunds** — paid bookings that were cancelled, including payments that
  arrived after the customer's slot was taken. The panel **does not move
  money**: refund in the Razorpay dashboard or in cash, then record the reference.
- **Venues & hours / Courts / Sports / Closures** — the catalogue the app and
  slot engine read. Changing hours or prices never alters existing bookings;
  deactivating a venue or court stops new bookings only. Adding a closure warns
  about confirmed bookings that fall inside it.
- **Activity log** — every change made from the panel, with who and when.

## Security model

- `src/proxy.ts` refreshes the Supabase session and sends anyone without a
  staff role to the login page. It is an optimistic check only.
- Every page calls `requireStaff()` / `requireAdmin()` and every server action
  calls `authorize()` (`src/lib/admin/session.ts`), which asks Supabase Auth for
  the user rather than trusting the cookie's JWT.
- Data is read and written with the service-role client after that check.
  Row level security is enabled on every public table; only `profiles` has
  policies (players' own row), so the publishable key in the mobile app cannot
  read bookings, users or the catalogue.
- Writes are recorded in `admin_audit_log`.

## Not in this version

- Customers are not notified (SMS/email/push) when a booking is created,
  cancelled or refunded from the panel.
- Refunds are recorded, not executed through the Razorpay API.
- Rescheduling a booking — cancel and rebook instead.
- Tournament and event management; wallet and promo codes.

## Code map

| Path | Role |
|---|---|
| `src/app/admin/login` | Sign-in page |
| `src/app/admin/(panel)/…` | All panel pages (layout checks the session) |
| `src/lib/admin/actions/` | Server actions: auth, bookings, catalog, team, account |
| `src/lib/admin/queries/` | Read models for the pages |
| `src/lib/admin/session.ts` | Session and role checks |
| `src/components/admin/` | Panel UI kit (forms, dialogs, tables, chart) |
| `scripts/grant-admin.mjs` | Bootstrap the first admin |
