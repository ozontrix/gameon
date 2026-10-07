# Free open play campaign

- Landing page: `/open-play-registrations`
- Admin: **Events & tournaments → Open Play Registrations**, `/admin/open-play-registrations`
- Public submission API: `POST /api/v1/public/open-play/registrations`
- Event: **Sunday, October 18, 2026**, Sector 70, Gurugram.
- Public paid court session dates begin **October 19, 2026**. Both slot availability and booking creation enforce this. Staff complimentary/front-desk flows and existing bookings are unchanged.
- League scheduling remains **October 24–25, 2026**.

## Registration

Choose one of cricket, football, badminton or pickleball. Name, Indian mobile number, email and city are required and always visible. Email is normalized to lowercase, and city must contain at least two characters. Event contact consent is required; future marketing consent is separate, optional and unchecked.

Server validation, same-origin checks, a honeypot, bounded requests and the existing in-memory rate limiter protect the public form. Rate limits are per running instance, not distributed across Vercel instances; configure platform-level abuse protection before high-volume campaigns if necessary.

Phone formats normalize to ten digits. A unique `(event_date, phone, sport)` database constraint makes retries safe. A duplicate submission does not overwrite contact data or reveal an existing registration ID. A person can register for multiple sports, separately. Shared family phone numbers in the same sport count as a single registration; contact the team for additional family attendees.

Registrations are expressions of interest, not court reservations or guaranteed playing times. No payment or login is needed. Exact timings, equipment, pizza and coffee arrangements are not invented. Dandiya is the interpretation of “Dania night” and is a subtle mention.

After a successful save the visitor gets a confirmation, directions, an all-day calendar download and a share invitation. A GameOn Multi Sports HTML and plain-text confirmation email is sent to the saved email using the existing `SMTP_USER` and `SMTP_APP_PASSWORD` Gmail transport, with replies to `info@gameonmultisports.com`. SMTP acceptance is tracked, not guaranteed inbox delivery. No SMS is automatically sent. Registration closes at midnight after October 18 in Asia/Kolkata.

Email failure never loses a saved registration. The success screen distinguishes email sent from unavailable. Delivery states and errors are visible in admin and CSV, and admins can retry failed, pending, skipped or stale sending attempts. An atomic ten-minute lease prevents concurrent duplicate sends; SMTP acceptance followed by a process crash can still cause a later retry to send twice. Public duplicate submissions never resend to a new address or overwrite existing contact details.

## Database and admin

Migrations: `supabase/migrations/20261007120000_open_play_registrations.sql` and `supabase/migrations/20261007140000_open_play_confirmation_email.sql` (also applied to the connected project during implementation). Required-contact constraints enforce new/updated rows without inventing missing details in historical registrations. Older entries are marked `SKIPPED`, not automatically emailed. RLS is enabled; `anon` and `authenticated` have no table privileges. Only the server service-role client writes; admin authorization is checked before reads, email retries or CSV export.

The admin screen provides per-sport counts, search, filtering, pagination, consent flags and campaign information. CSV export paginates beyond Supabase's default result limit and escapes spreadsheet formulas. Records are not exposed by a public GET endpoint.

## Meta ads

Use the landing page URL with non-sensitive campaign labels, for example:

`/open-play-registrations?utm_source=instagram&utm_medium=paid_social&utm_campaign=open_play_oct18&utm_content=cricket`

Five bounded UTM labels are saved for campaign reporting. Do not put personal details in UTM labels. Full URLs, referrers and `fbclid` are not stored.

Existing consent-gated Meta Pixel sends `ViewContent` for this landing page. A `Lead` is sent only after a **new** registration is saved, with zero value, sport identifiers, an opaque deduplication event ID, and no contact details. Duplicate retries, failed saves and denied tracking consent never send a Lead. The optional future-offers checkbox is not Pixel consent.

A dedicated 1200×630 social graphic is generated at `/open-play-registrations/social-preview`. Original SVG artwork and a calendar invite live in `public/open-play/`.

## Verification

`node --test scripts/test-open-play.mjs`

`node scripts/smoke-open-play.mjs` (requires a production build; tests only rejected public submissions, never inserts live records).

`node scripts/browser-open-play.mjs` (uses installed Chrome and browser-intercepted mock responses; checks desktop/mobile layout, form interaction, success, retries and errors without live registration writes).