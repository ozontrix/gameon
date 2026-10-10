# Production hardening — implementation status

Updated: October 7, 2026. This is a completed first implementation batch, not a declaration that the app is ready to launch.

## Implemented

- Live Supabase `wallet_adjust` is restricted to the trusted backend. Anonymous and ordinary authenticated users cannot execute it. Its search path is fixed.
- Court, event and tournament payment confirmation fetches the Razorpay payment and validates capture status, payment ID, order ID, amount, INR currency and absence of a gateway refund before mutating a purchase. Conflicting recorded payment IDs are rejected.
- Court wallet debit and confirmation run inside a row-locked database operation. Retries do not debit twice. Wallet-only confirmation checks expiry and ownership in the same operation.
- Captured court payments that lose capacity or lack the required Points are recorded as cancelled/paid with the gateway remainder as the refund obligation. They are not reported as confirmed. Automatic gateway refunds are NOT implemented.
- Player cancellation and its Points refund now commit or roll back together. Scanned/started bookings cannot be cancelled by this operation.
- Referral reward credit and its paid flag are atomic; confirmation retries can retry failed referral credit.
- Court check-in update requires the booking still be confirmed, preventing a cancellation/check-in race from admitting a cancelled booking.
- Private event/tournament drafts do not resolve through public detail services.
- Displayed event/tournament capacity excludes expired pending holds. Database triggers still count pending holds until cleanup; new purchase creation releases them and the cron now clears all three purchase types.
- Hold-release database failures are surfaced in event/tournament purchase creation.
- Database payment-method constraint now accepts WALLET. The previously existing wallet-only flow used this value despite the database disallowing it.
- Both capacity trigger functions have fixed search paths.

## Deployment status

Four additive/hardening migrations were applied through the Supabase connector and are saved under `supabase/migrations/2026100715*`, `2026100716*`, `2026100717*` and `2026100718*`.

Backend source changes are local, not deployed. The existing deployed backend still uses the old multi-write financial flows until these changes are deployed. The new functions require server-side Razorpay validation; they are deliberately inaccessible to public API roles.

No Expo source was changed in this batch. No native app build or store submission was performed.

## Validation

- Final backend regression run: **190 tests passed, 0 failed**, including payment hardening, draft visibility, expiry cleanup, profiles, transactions, website deletion requests and League flows.
- Backend TypeScript passed; changed service/payment-route/cron/test files passed targeted ESLint and `git diff --check`.
- A live database test ran in a transaction ending with ROLLBACK. It verified wallet-only confirmation, one debit on duplicate confirmation, atomic cancellation/refund, rejection of duplicate cancellation, expired hold rejection without a debit, captured-payment insufficient-Points exception/replay, and rollback of debit/ledger writes when a slot is lost. Fixture writes did not persist.
- Live permissions were queried: wallet and all three new financial RPCs deny anon/authenticated and allow service_role.
- Production build attempt exceeded the command runner's 30-second timeout. A completed production build is NOT verified.
- Real concurrent database sessions, real gateway payments/refunds and real-device checkout are NOT verified by mocked tests or the rollback-only test.

## Remaining launch blockers / next batches

1. Durable webhook intake/retry and captured-payment reconciliation; automated or fully audited manual refund processing across courts/events/tournaments.
2. Wallet reservation at hold creation (this batch makes fulfillment atomic but does not reserve Points across simultaneous holds). Final cancellation/refund policy approval, including fractional rupee-to-integer-Points rounding.
3. Phone-session renewal/revocation and native iOS phone-auth code are implemented in the next batch below. Coordinated deployment, production iOS provider setup/device validation and email recovery/deep-link validation remain.
4. Discoverable in-app account deletion with actual verified deletion/anonymization processing and accurate privacy copy.
5. Persisted feedback and admin inbox; booking ID-based details and correct list pagination; working ticket navigation/statuses; free-entry confirmation.
6. Event/tournament cancellation/refund/admission operations and prevention of late fulfillment for organizer-cancelled products. Full admin financial exception workflow.
7. Shared rate limiting, cache isolation, API recovery/timeouts, production configuration checks, monitoring, notification delivery decisions, operational runbooks and production content.
8. Enable leaked-password protection in Supabase Auth if supported by the project plan. Keep deliberate server-only RLS tables closed; do not add permissive policies just to clear advisory information notices.
9. Completed production build, full lint baseline, staging concurrency/fault tests, signed iOS/Android device acceptance, backup restoration and rollback rehearsal.

Go-live remains blocked until these items are implemented or explicitly scoped out and validated.

## Authentication implementation batch — October 7, 2026

- Applied `20261007190000_phone_sessions.sql`: server-only sessions and hashed rotating renewal credentials, replay revocation, live account/role validation and logout revocation.
- Added API exchange/refresh/logout support with 15-minute API-scoped access tokens and fixed 30-day sessions. Removed fabricated Supabase refresh tokens from mobile phone login. Old custom phone sessions are rejected at backend cutover.
- Mobile restores and renews phone sessions separately from Supabase email login, single-flights renewal, handles revocation and persists offline logout retries.
- Replaced temporary iOS JS/WebView OTP with native Firebase; added iOS plist/bundle configuration, background mode and native build plugin.
- Backend/mobile code remains local, not deployed. Account deletion is NOT implemented in this batch.
- Final authentication-batch validation: full backend suite **200 passed, zero failures** (including ten authentication tests); both projects passed TypeScript, targeted ESLint and whitespace checks. Expo public-config resolution passed. Live phone RPC privileges deny anon/authenticated and allow service_role.
- Native iOS compilation, real SMS/APNs, TestFlight/Android device tests and deployed endpoint checks remain unverified. Renewal credentials still use existing unencrypted storage; secure native storage remains required for final launch review.
- Required release setup, limitations and tests are detailed in `c:\Users\mchan\Documents\Development\gameon-management\gameon-multisports\docs\PHONE-SESSION-RELEASE.md`.

## Final security advisor check

- Wallet execution and mutable-function-search-path warnings no longer appear in the security advisor results.
- Leaked-password protection remains disabled. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- 34 RLS-enabled tables have no policies (informational notices). Preserve intentional server-only access and review table-by-table rather than adding broad access. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy