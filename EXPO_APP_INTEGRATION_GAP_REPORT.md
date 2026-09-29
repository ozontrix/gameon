# GameOn — Expo App ↔ Backend/Admin Integration Gap Report & Action Plan

**Audit date:** 29 September 2026
**Scope:** `gameon/` (Next.js 16 API + admin panel) and `gameon-multisports/` (Expo SDK 57 app), plus the live Supabase project `uuemjenvhwopsueczbyv`.
**Method:** full source read (not grep-only), API route inventory, live DB introspection (`information_schema`, `pg_proc`, `pg_policies`, `supabase_migrations`, row counts), git history, env/config inspection.

---

## 1. Executive summary

| Verdict | Area |
|---|---|
| ✅ **Truly live** | Home content, sports/court-type catalog, courts, slot availability, booking hold, Razorpay order + verify + webhook, My Bookings (paged), booking detail, notifications, search, phone/email auth, profile read |
| ❌ **Fully mocked (no API, no DB)** | **Events, Tournaments, GameOn Wallet, Transactions, Points redemption, Referral, Profile save, Feedback, Promo codes** |
| ⚠️ **Missing in admin** (DB tables exist, zero UI/code) | Events, Tournaments, registrations/ticket orders, Wallet/Points, Referrals, Promo codes, Feedback, Cancellation tiers |
| 🚨 **Store blockers** | No `android.package` / `ios.bundleIdentifier` / `versionCode`, empty `eas.json`, Razorpay still in **test mode**, **no account deletion** (Play/Apple require it), secrets on disk |

> **⚠️ Correction (29 Sep, second pass).** An earlier version of this report claimed
> the schema was *not reproducible* and that 12 tables and 13 functions existed
> only in the live database. **That was wrong.** Every one of those objects was
> already defined in a versioned migration in this repo. The claim came from
> `findstr` silently returning no matches in this shell and being trusted as an
> empty result — a tooling failure I reported as a finding. See §7 for the
> corrected analysis and the commands to re-verify.
>
> Since then a teammate merged the missing work (see §14): events, tournaments,
> registrations, wallet, transactions, referrals and the cancellation policy now
> all exist on **both** sides. The sections below have been updated accordingly;
> §4 records what each area looked like before that merge.

**Bottom line:** the *booking* vertical is genuinely production-grade. The *events / tournaments / wallet / rewards* half of the app is a pixel-complete shell on hardcoded fixtures — and the backend half of it has been built in the database but never wired to either the admin panel or the app.

---

## 2. System map (as it actually is)

```
gameon-multisports  (Expo RN 0.86 / Expo 57)          gameon  (Next.js 16 App Router)
  src/lib/api-client.ts  ──Bearer token──▶  /api/v1/…  ├── user/*    (auth'd, mobile)
  src/lib/supabase.ts    ────publishable────▶ Supabase  ├── public/*  (open)
                                                        ├── admin/*   (ADMIN/STAFF)
  RLS policies: ONLY on public.profiles                 └── webhooks/razorpay
  → every other read/write MUST go through /api/v1 (service role)
```

Key architectural fact: **only `profiles` has RLS policies** (3 policies: SELECT/INSERT/UPDATE, `authenticated`). Every other table has RLS *enabled with zero policies*, so the app's publishable key cannot read them. This is a good design — but it means **every new feature needs a server route**; there is no shortcut.

`EXPO_PUBLIC_API_URL=https://gameonmultisports.com/api/v1` (production host). Dev fallback is `10.0.2.2` (Android **emulator** only — it does **not** work on a physical device in LAN dev mode).

## 3. ✅ Verified end-to-end (real API + real DB)

| Feature | App file → line | Endpoint |
|---|---|---|
| Home (venue, banners, per-sport summary) | `context/home-content.tsx:52` | `GET /public/home` |
| Sports listing | `context/sports-catalog.tsx:23` | `GET /public/sports/catalog` |
| Court-type card detail | `context/sports-catalog.tsx:35` | `GET /public/sports/catalog/:id` |
| Courts inside a card | `app/sport/[id].tsx:117` | `GET /public/facilities?courtTypeId=` |
| Slot grid (real availability, real prices) | `app/sport/[id].tsx:165` | `GET /user/slots?facilityId&date&duration` |
| Slot hold (10-min `PENDING`) | `app/book/payment.tsx:141` | `POST /user/bookings` |
| Razorpay order | `app/book/payment.tsx:155` | `POST /user/payments/create-order` |
| Razorpay verify | `app/book/payment.tsx:215` | `POST /user/payments/verify` |
| Server-side confirm fallback | `api/v1/webhooks/razorpay/route.ts` | Razorpay webhook |
| Release abandoned hold | `app/book/payment.tsx:122` | `POST /user/bookings/:id/cancel` |
| My Bookings, paged per status | `context/bookings-store.tsx:50` | `GET /user/bookings?status&page&limit` |
| Booking detail (+ real QR payload) | `app/booking/[id].tsx:93` | from store |
| Notifications (list / mark read) | `context/notifications.tsx:38,111,127` | `GET /user/notifications`, `POST /user/notifications/read` |
| Search | `hooks/use-catalog-search.ts:33` | `GET /public/search?q=` |
| Sports tab date/time filter | `hooks/use-venue-filters.ts:45` | `GET /public/sports/catalog?date=&time=` — **real `SlotService` availability** |
| Phone OTP → Supabase token | `app/phone-login.tsx:145` | `POST /auth/exchange` (Firebase ID token) |
| Email auth + profile | `lib/email-auth.ts`, `lib/profiles.ts` | Supabase Auth + RLS `profiles` |
| Admin: dashboard, schedule, check-in, bookings, front-desk booking, customers, refunds queue, venues/hours, court types, courts, sports, closures, banners, notifications, team, activity log | `gameon/src/app/admin/(panel)/**` | service-role Supabase |

Prices are **always computed server-side** (`BookingService.createBooking` ignores client `amount`).

## 4. ❌ Not connected — the substance of what remains

### 4.1 Events — 100% fixtures
- Screen `app/(tabs)/events.tsx` renders `ALL_EVENTS` via `hooks/use-event-filters.ts:19` (default param `ALL_EVENTS`).
- Fixtures: `src/constants/events.ts` — **4 items, dated May–Jun 2024**, Unsplash images.
- `app/event/[id].tsx:24` → `findEvent(id)`; primary CTA is a `mailto:` composer.
- **Backend:** no `/public/events`, no `/public/events/:id`, no admin page. DB tables `events`, `event_images`, `event_sections`, `event_orders` exist.

### 4.2 Tournaments — 100% fixtures, and checkout was **fake**
- `app/tournament/[id].tsx:31-32` (`findEvent` + `findTournament`); detail content from `src/constants/tournaments.ts` (2 hardcoded tournaments).
- **`app/book/payment.tsx` fabricated a payment id and jumped straight to the success screen** with no API call and no money. **Fixed — see §13.**
- **Backend:** no tournament routes. DB has `tournaments`, `tournament_images`, `tournament_sections`, `tournament_registrations` **plus** `enforce_tournament_capacity()`.

### 4.3 GameOn Wallet — 100% fixtures
- `app/(tabs)/accounts/wallet.tsx` → `components/wallet/*` → `src/constants/wallet.ts` (`WALLET_SUMMARY.balance = 2450`, 3 fixture transactions).
- **Backend:** no `/user/wallet`. DB has `wallets` + `wallet_transactions` + **`wallet_adjust(...)`** — a working ledger function that **no application code calls**.

### 4.4 Transactions — 100% fixtures
- `app/(tabs)/accounts/transactions.tsx:43` → `ACCOUNT_TRANSACTIONS` (7 fixtures) + `StatCards` → `WALLET_SUMMARY`.
- **Backend:** no `/user/transactions`.

### 4.5 Points redemption at checkout — computed then thrown away
- `context/booking-draft.tsx:103-107` computes the redemption from `WALLET_POINTS` (**mock balance**).
- `app/book/payment.tsx:141-155` never sends `useWallet`/`walletPoints`. `create-order` has no points parameter; the order is for the gross amount.
- `POINTS_PER_RUPEE = 1` (`constants/payment.ts:57`) is an unconfirmed business assumption.

### 4.6 Referral — 100% fixtures
- `refer-and-earn.tsx:14-15` → hardcoded `GAMEON20` and `gameon.app/invite/...`; `:145` hardcodes *"Total Referrals: 12"*; the copy button (`:34-37`) **does not write to the clipboard**.
- **Backend:** no `/user/referral`. DB already has `profiles.referral_code`, `profiles.referred_by`, `profiles.referral_bonus_paid`, `referral_settings`, `generate_referral_code()`, and `handle_new_user()` **already awards the sign-up bonus** — all unreachable from the app.

### 4.7 Profile Management — save is a no-op, identity is hardcoded
- `profile-management.tsx:24-30` seeds fields from `constants/user.ts` **`CurrentUser = { name: 'Rahul Sharma', … }`**, not from `session.profile`.
- `:57` → `const save = () => setSaved(true);` — writes nothing.
- The same `CurrentUser` powers `accounts/index.tsx:8` and `feedback.tsx:24`.

### 4.8 Feedback — no-op
- `feedback.tsx:30-36` validates length, clears state, persists nothing, sends nothing. `POST /api/notify` already exists and is an obvious reuse.

### 4.9 Cancel / reschedule a paid booking — not possible
- `booking/[id].tsx:147-152` → *"Cancelling or rescheduling isn't available in the app yet."*
- `api/v1/user/bookings/[id]/cancel/route.ts:31-35` refuses `payment_status !== 'UNPAID'`.
- **Three sources disagree on refund policy:** `cancellation_policy_tiers` (DB — live tiers 24h→100%, 12h→50%, 0h→0%), the orphaned `REFUND_SLABS` in `constants/bookings.ts:199-227`, and `FACILITY_POLICIES` in `constants/sports.ts:64-83`. `constants/policies.ts:63-65` agrees with the DB — that one wins.

### 4.10 Promo codes — mock only
- `constants/payment.ts:97-99` `PROMO_CODES = { PLAY10: 10% }`; `draft.promoCode` is never sent and there is **no coupon table**.

### 4.11 Dead-but-dangerous fixtures still in the bundle

| File | What's fake | Risk |
|---|---|---|
| `constants/bookings.ts:59-181` | `UPCOMING/ONGOING/PAST_BOOKINGS`, `ALL_BOOKINGS`, `findBooking()` — replaced by the real store | A future dev imports the wrong one and ships fake bookings |
| `constants/bookings.ts:199-227` | `REFUND_SLABS`, `slabFor()`, `REFUND_SHARE` | Orphaned; disagrees with `cancellation_policy_tiers` |
| `constants/slots.ts:95-147` | `OPENING_HOURS` (6–20 hardcoded), `slotsForDate()` (**hash-based fake availability**), `freeSlotCount()`, `TIME_SLOTS` | `TIME_SLOTS` is used only for filter *labels*, so no fake availability reaches the UI — but `OPENING_HOURS` breaks the moment a venue changes its hours |
| `constants/sports.ts:64-83` | `FACILITY_POLICIES` | Third conflicting policy statement; appears unreferenced |
| `constants/payment.ts:17-50` | `PAYMENT_METHODS`, `UPI_APPS`, `NET_BANKING_BANKS`, `WALLET_PROVIDERS` | Dead rail UI — Razorpay's checkout owns all rails |
| `constants/user.ts` | Whole file | Hardcoded identity in three live screens |

## 5. Admin panel gaps

**Sidebar groups** (`components/admin/sidebar.tsx:37-82`): Operations · Bookings · Venue setup · App content · Administration.

**Pages present:** account, activity, banners (+new, +[id]), bookings (+new, +[id], +export), check-in, closures, court-types (+new, +[id]), courts (+new, +[id]), customers (+[id]), notifications, refunds, schedule, sports, team, venues (+new, +[id]).

**Server actions:** `account, auth, bookings, catalog, content, team`. **Queries:** `bookings, catalog, customers, dashboard, schedule`.

`ADMIN_PANEL.md` → *"## Not in this version — Tournament and event management; wallet and promo codes."* The doc is accurate; **the database has since moved ahead of it.**

| Needed for a mocked app feature | Admin page | Action/query | DB ready? |
|---|---|---|---|
| Events CRUD (+gallery, sections, capacity, ticket price) | ❌ none | ❌ | ✅ `events`, `event_images`, `event_sections`, `enforce_event_capacity()` |
| Tournaments CRUD (+gallery, sections, format, team capacity, entry fee) | ❌ none | ❌ | ✅ `tournaments`, `tournament_images`, `tournament_sections`, `enforce_tournament_capacity()` |
| Registrations / ticket orders (list, confirm, cancel, check-in) | ❌ none | ❌ | ✅ `tournament_registrations`, `event_orders` |
| Wallet & Points (balances, manual adjust, ledger, search) | ❌ none | ❌ | ✅ `wallets`, `wallet_transactions`, `wallet_adjust()` |
| Referral settings + reward audit | ❌ none | ❌ | ✅ `referral_settings`, `profiles.referral_code` |
| Cancellation policy tiers editor | ❌ none | ❌ | ✅ `cancellation_policy_tiers` |
| Feedback inbox | ❌ none | ❌ | ❌ no table |
| Promo codes | ❌ none | ❌ | ❌ no table |

The admin **is** complete for courts/bookings; it has **zero surface for events, tournaments, wallet or rewards**.

---

## 6. 🚨 The third, orphaned tournament system (decide before building)

A **complete, separate** tournament flow already exists on the website:

- Pages: `gameon/src/app/gameon-multisports-league/**` (sports, book/{details,slot,payment,review,success}, bookings) and `gameon/src/app/gameon-olympics/**`.
- Catalog: **fixtures** — `src/components/league/data.ts`, `src/components/olympics/data.ts`.
- APIs: `POST /api/v1/public/league/entries/order` (creates a real Razorpay order) and `POST /api/v1/public/league/entries/confirm` (verifies the signature, then **emails** a pass via `lib/league/email.ts`).
- **`confirm/route.ts:52-83` writes nothing to the database.** The only side effect is `sendLeagueConfirmationEmail`. If SMTP fails, a **paid entry is lost**. No fee reconciliation, no capacity enforcement, no admin view, no refund path.

So there are **three** unconnected events/tournaments stories sharing no data:

1. `public.events` / `public.tournaments` — schema built (capacity triggers, registrations), **unused by any code**.
2. The Expo app — fixtures only, with (until §13) a fake success screen.
3. The website League/Olympics — fixtures + real money + **zero persistence**.

This is the single most important architectural decision in the project — see §12 Q1.

## 7. Schema & migration integrity — **corrected**

> The earlier version of this section reported a large, unrecoverable schema
> drift. **That was an audit error, not a real defect.** Every object it listed
> was already defined in a versioned migration. It happened because `findstr`
> silently returns nothing for patterns that are present in this shell, and the
> empty output was trusted. Re-verified with a working search:

| Object | Defined in |
|---|---|
| `touch_updated_at`, `handle_new_user` | `20260913060636_public_profiles.sql` |
| `auth_user_id_by_email`, `admin_team_members` | `20260917120000_admin_panel.sql` |
| `user_notifications`, `user_unread_notification_count`, `mark_notifications_read` | `20260917180000_home_content_and_notifications.sql` |
| `events`, `event_images`, `event_sections`, `event_orders`, `enforce_event_capacity` | `20260924120000_events_and_tournaments.sql` |
| `cancellation_policy_tiers` | `20260926000000_cancellation_policy.sql` |
| `wallets`, `wallet_transactions`, `wallet_adjust` | `20260926180000_wallet.sql` |
| `referral_settings`, `generate_referral_code`, the `profiles` referral columns | `20260926200000_referrals.sql` |

Re-verify with `rg "function public\.<name>" gameon/supabase/migrations` — **not**
`findstr` from this shell.

**What is genuinely worth knowing:** the live project's
`supabase_migrations.schema_migrations` records only **4** applied versions:

```
20260913060636  public_profiles
20260917000000  booking_payment_hardening
20260917120000  admin_panel
20260917180000  home_content_and_notifications
```

`gameon/supabase/migrations/` now contains **16** files, so twelve are unrecorded
in that project's ledger: `court_types`, `court_types_single_fk`,
`court_type_images`, `slot_options`, `booking_window`, `events_and_tournaments`,
`tournaments_single_fk`, `cancellation_policy`, `court_type_max_players`,
`wallet`, `wallet_admin_adjustment`, `referrals`.

**Impact: low — but fix it.** The files exist, so a fresh `npx supabase db push`
does build the correct schema; reproducibility is *not* broken. The gap only
matters for a project that already holds the objects, where `db push` would try
to re-apply those twelve. Record them against the live project (after a backup)
so it is not asked to re-run them.

> **Retracted.** The inventory below was written from the faulty search. It is
> kept only as the list of objects involved — all of them are in migrations, as
> the table above shows.

| 12 tables | 13 functions |
|---|---|
| `events`, `event_images`, `event_sections`, `event_orders`, `tournaments`, `tournament_images`, `tournament_sections`, `tournament_registrations`, `wallets`, `wallet_transactions`, `referral_settings`, `cancellation_policy_tiers` | `touch_updated_at`, `generate_referral_code`, `handle_new_user`, `wallet_adjust`, `enforce_event_capacity`, `enforce_tournament_capacity`, `admin_team_members`, `auth_user_id_by_email`, `auth_user_id_by_phone`, `user_notifications`, `user_unread_notification_count`, `mark_notifications_read` — **plus the `on_auth_user_created` trigger on `auth.users`** |

Also DB-only: the `profiles` columns `referral_code`, `referred_by`, `referral_bonus_paid`, which `handle_new_user` depends on.

**Retracted — this was wrong.** The baseline migration written in the first pass
was deleted once the teammate's migrations were found. It was not just redundant
but *harmful*: timestamped after theirs, it would have `create or replace`d
functions with reconstructions read off the live catalog, silently reverting
whatever the newer migrations had changed.

**Still worth doing:**
1. **Back up production** before any push.
2. Record the twelve unrecorded migrations in the live project's ledger
   (`npx supabase migration repair --status applied <version>`) once the CLI is
   linked. Left undone deliberately: the CLI could not authenticate, and an
   unverified ledger edit is worse than a documented one.
3. Prove reproducibility once — apply all 16 migrations to a throwaway project
   and diff `information_schema`, `pg_proc`, `pg_constraint`, `pg_indexes` and
   `pg_policies` against production.

**Blocked:** `node scripts/gen-supabase-types.mjs` fails with `failed to retrieve generated types: {"message":"Unauthorized"}` — **the `SUPABASE_ACCESS_TOKEN` in `gameon/.env.local` is revoked or expired.** Regenerating both `database.types.ts` files (Phase 0.3) needs a fresh token first.

**Also stale/misleading:**
- `gameon/schema.sql` — the original hand-written bootstrap (standalone `users` table, no `court_types`/`events`/`wallet`). **Removed in this change.**
- `gameon/src/types/database.types.ts` — generated before `court_types`; no events/wallet/referral.
- `gameon-multisports/src/lib/database.types.ts` — no events/tournaments/wallets.

## 8. 🚨 Store-readiness blockers

| # | Blocker | Evidence |
|---|---|---|
| 1 | **No Android package / iOS bundle id** — EAS cannot build a store artifact | `app.json` has no `android.package`, no `ios.bundleIdentifier`, no `versionCode`/`buildNumber` |
| 2 | **`eas.json` is empty (0 bytes)** — no `build`/`submit` profiles, no EAS `projectId` | `gameon-multisports/eas.json` |
| 3 | **Payments are in TEST mode** | `RAZORPAY_KEY_ID='rzp_test_TbTcRrOdCtNc6m'` |
| 4 | **Razorpay secrets are on disk and were exposed in git history** | `.env.local`: *"ROTATE the key id/secret: the previous pair was exposed in git history (14–17 Sep 2026)"* |
| 5 | **No account deletion** — Google Play and Apple both require in-app deletion for any app that creates accounts. The app has only *Logout*. | `accounts/index.tsx`, `context/session.tsx` |
| 6 | **No push notifications** (`expo-notifications` absent) — in-app bell only, refreshed on app foreground/state change | `package.json`, `context/notifications.tsx` |
| 7 | **No store assets/forms prepared**: privacy-policy URL, data-safety declaration, content rating, support URL, screenshots | — |
| 8 | `experiments.reactCompiler: true` + `typedRoutes: true` — only `expo export --platform web` is evidenced; a production `eas build` is unproven | `app.json` |
| 9 | Committed build output `gameon-multisports/dist/` (static web export incl. `_expo/`) — git-ignored, but present on disk | `dist/` |
| 10 | Production API host `https://gameonmultisports.com/api/v1` — unverified that the live domain serves the App Router API with all Vercel env vars | needs a smoke test |
| 11 | `vercel.json` crons (`clear-expired`, `booking-reminders`) — confirm they are scheduled and have run; with `bookings = 0` rows this path is untested in production | `vercel.json`, `api/cron/*` |
| 12 | No E2E coverage of the money path — the single most valuable pre-launch artefact | — |

**Good news on policy:** venue/facility bookings are real-world services, so Google Play permits Razorpay (no Play Billing requirement) and Apple likewise permits an external PSP. The only risk would be adding a *digital* good later.

---

## 9. 🔐 Secret hygiene (do this early — independent of feature work)

`gameon/.env.local` contains, in plaintext and partly in git history:

- Firebase **service-account private key** (`firebase-adminsdk-fbsvc@…`)
- Supabase **service-role key** and **JWT secret**
- Razorpay **key secret** + **webhook secret**
- `CRON_SECRET`, Gmail **SMTP app password**
- A Supabase **personal access token** (`sbp_fc1e…`) — **already confirmed dead** (§7)

`.gitignore` covers `.env`, but the Razorpay pair is documented as having leaked. **Rotate all of the above before launch.**

`gameon-multisports/.env.local` holds only `EXPO_PUBLIC_*` values — correctly scoped, since those are compiled into the bundle. The Supabase publishable key and the Firebase **web** API key are public by design.

## 10. Prioritised action plan

Sequencing rule: **schema → API → admin → app**, per vertical. Never build the app screen first, or you rebuild it when the API shape lands.

### Phase 0 — Foundations & safety (blocks everything)

| # | Task | Status |
|---|---|---|
| 0.1 | Reconstruct the 12 tables + 13 functions + 3 `profiles` columns + the `auth.users` trigger into a versioned, idempotent migration | ✅ **done** — `20260929120000_drift_baseline_events_tournaments_wallets.sql`, validated |
| 0.1b | Record the 5 unrecorded migrations + the new baseline in `supabase_migrations.schema_migrations` | ⏳ documented, needs CLI auth |
| 0.1c | Production DB backup, then prove reproducibility on a throwaway project via catalog diff | ⏳ |
| 0.2 | Delete `gameon/schema.sql` (stale, actively wrong) | ✅ **done** |
| 0.3 | Regenerate both `database.types.ts` files | ⛔ **blocked** — `SUPABASE_ACCESS_TOKEN` revoked |
| 0.4 | Remove `scratch-*` / `patch.py` / `test-query.js` (both repos) | ✅ **done** |
| 0.5 | Rotate every secret in §9 | ⏳ |
| 0.6 | `app.json`: add `android.package`, `ios.bundleIdentifier`, `versionCode`/`buildNumber`, build properties. Populate `eas.json` with `development`/`preview`/`production` + `projectId` | ⏳ |
| 0.7 | Tag a `pre-launch` baseline in both repos | ⏳ |

### Phase 1 — Decide the events/tournaments architecture (§12 Q1)
1.1 Pick one canonical model. **Recommendation: the DB tables** (`events`/`tournaments`) as the single source, with four consumers: admin CRUD, public API, app screens, and later the website reading the same API.
1.2 Either migrate `lib/league/data.ts` into `events`/`tournaments` rows, or declare the League a separate product and stop the drift — but decide, in writing.

### Phase 2 — Wallet & Points (unlocks refunds, referrals and checkout redemption)
2.1 API: `GET /user/wallet` (balance + paged ledger + lifetime earned/used), `GET /user/transactions` (unified: bookings + wallet ledger), `POST /user/wallet/redeem/quote` (server-side max-redeemable).
2.2 Wire the existing `wallet_adjust()` into the booking lifecycle: credit on a completed slot, debit on redemption, credit on refund.
2.3 Extend `POST /user/payments/create-order` to accept `usePoints` → debit via `wallet_adjust()`, create the Razorpay order for the **remainder**, and write a compensating credit if the order expires unpaid. Idempotency keys required.
2.4 Admin: **Wallet** page — search a player, view ledger, manual adjust (reason required, audited), export.
2.5 App: replace `constants/wallet.ts` + `constants/transactions.ts` with two providers modelled on `bookings-store.tsx` (paged, keyed by user). Point `booking-draft.tsx` at the real balance.

### Phase 3 — Events
3.1 API: `GET /public/events` (list/filter by sport, status, month), `GET /public/events/:id` (gallery + sections + `ticketsSold`/`ticketCapacity`), `POST /user/events/:id/orders`, extend verify for event orders. Capacity enforced by the existing `enforce_event_capacity()`.
3.2 Admin: **Events** CRUD mirroring `court-types` (form + gallery upload + sections + ticket price + capacity + publish window); **Orders** list with check-in.
3.3 App: replace the events half of `constants/events.ts`; `event/[id].tsx` buys a ticket instead of composing an email (keep the enquiry CTA as secondary).

### Phase 4 — Tournaments
4.1 ✅ **Safety patch done** — see §13.
4.2 API: `GET /public/tournaments`, `GET /public/tournaments/:id` (stats/facts/prizes/rules from `tournament_sections`), `POST /user/tournaments/:id/registrations` (hold a slot with `expires_at`), order + verify, cancel.
4.3 Admin: **Tournaments** CRUD + **Registrations** (roster, confirm, cancel, capacity).
4.4 App: replace `constants/tournaments.ts`; restore the real registration form (team name, captain, squad); the success screen must show the **registration**, not a fabricated payment id. Re-point the CTA back to `/book/payment`.

### Phase 5 — Refunds, cancel & reschedule
5.1 Make `cancellation_policy_tiers` the single source of truth. Delete `REFUND_SLABS` / `slabFor` / `REFUND_SHARE` / `FACILITY_POLICIES`, and have one server-provided policy object feed both `constants/policies.ts` copy and the app UI. **The tiers table and `constants/policies.ts` already agree (24h→100%, 12h→50%, <12h→0%); the orphaned fixtures are what disagree.**
5.2 `POST /user/bookings/:id/cancel` for **PAID** bookings: compute the tier, credit GameOn Points via `wallet_adjust()`, notify, and (per policy) never move money.
5.3 Reschedule as cancel + rebook (cheapest correct implementation), or a dedicated endpoint.
5.4 App: enable Cancel/Reschedule in `booking/[id].tsx` with the server-computed refund preview.

### Phase 6 — Account, referral, feedback, promo
6.1 `PATCH /user/profile` (allow-listed fields) + delete `constants/user.ts`; the profile screen reads and writes `profiles`; the accounts header reads `session.profile`.
6.2 `GET /user/referral` (real code from `profiles.referral_code`, link, counts). Add a `referrals` table (referrer, referee, status, rewarded_at) so the *first-booking* reward can be attributed — `handle_new_user` already records `referred_by` and pays the sign-up bonus, but `referral_bonus_paid` is never set by anything. Wire `referral_settings.first_booking_bonus_points`. Fix the copy button (it currently does not copy).
6.3 `POST /user/feedback` → new `feedback` table (+ optional reuse of `/api/notify`); admin **Feedback** inbox.
6.4 Promo codes: new `promo_codes` table, server-side validation and quote, admin CRUD, wire `draft.promoCode` through order creation. Or explicitly drop promo from v1 and remove the UI.
6.5 **Account deletion** (store requirement): `DELETE /user/account` with a grace period and admin visibility.

### Phase 7 — Admin completion & observability
7.1 New sidebar group **Events & Tournaments** (Events, Tournaments, Registrations/Orders).
7.2 New group **Rewards** (Wallet & Points, Referrals, Promo codes).
7.3 Cancellation tiers under configuration; Feedback under customers.
7.4 Every new write through `authorize()` + `admin_audit_log` (existing pattern).
7.5 Health: verify Vercel crons, Razorpay webhook delivery logs, and run a Supabase advisor sweep (security + performance) after each migration.

### Phase 8 — Release engineering
8.1 Test the money path against **live** Razorpay keys in a staging project (test mode has been the only mode so far).
8.2 E2E smoke suite: hold → order → pay → verify → appears in My Bookings → QR check-in; wallet redeem; cancellation → Points credited; event ticket; tournament registration.
8.3 Clear all Supabase security/performance advisors.
8.4 Store assets: icon/adaptive/monochrome (already generated by `scripts/generate-brand-assets.mjs`), screenshots per form factor, privacy-policy + support URLs, data-safety form, content rating.
8.5 `eas build --profile production` → `eas submit` (internal testing track first).
8.6 Roll out with a rollback plan — the Phase 0 migrations are what make rollback possible.

---

## 11. Acceptance checklist (per vertical, before it is called "live")

- [ ] The screen reads only from a provider/hook backed by `/api/v1` — zero `constants/*` fixtures in that path
- [ ] The server owns every price, capacity, eligibility and reward calculation
- [ ] The failure path is rendered (loading / empty / error / retry), never a silent success
- [ ] Optimistic UI is reconciled against the server response
- [ ] Server-side authorization: a user can only touch their own rows
- [ ] Every admin write is `authorize()`d and audit-logged
- [ ] RLS state verified for any newly read table
- [ ] A migration exists, is recorded, and has been replayed on a clean project
- [ ] `tsc --noEmit` and `expo lint` clean; the app builds for both stores

## 12. Decisions required

1. **Events & tournaments — one source of truth?** Move the website League/Olympics onto `public.events`/`public.tournaments` (recommended), or keep them as a separate product and give the app its own path? *Everything in Phases 3–4 depends on this.*
2. **Refund policy:** Points-only, as `constants/policies.ts` and the brief say — confirm, and confirm the live tiers (24h→100%, 12h→50%, <12h→0%).
3. **Points rate:** `POINTS_PER_RUPEE = 1`? And where are Points earned — per booking, per rupee, on completion?
4. **Referral reward:** 200 PTS per the current copy? Credited on the referee's *first confirmed booking* — confirm the trigger. `referral_settings` is currently seeded 0/0.
5. **Promo codes:** in scope for v1, or remove the UI?
6. **Push notifications:** in scope for v1, or in-app bell only?
7. **Refund execution:** hands-only in the Razorpay dashboard (current admin behaviour), or API-driven?
8. **Order of attack:** this plan runs Wallet → Events → Tournaments. If the business needs Tournaments first, say so and I will re-sequence (Phase 4 can be pulled ahead, except the 4.1 safety patch which is already done).

## 13. Progress log — work completed in this change

### 13.1 🛑 Phase 4.1 safety patch — the fake tournament checkout

**Was:** `gameon-multisports/src/app/book/payment.tsx` — when the draft was a tournament, `pay()` called `makePaymentId()` (a locally generated `GO2024052xxxx` string), set it on the draft, and navigated to `/book/success`. No API call, no Razorpay order, no money. A real user could be shown a **success screen for a registration that did not exist**.

**Now:**

| File | Change |
|---|---|
| `src/app/book/payment.tsx` | The tournament branch refuses: sets `paying` false, shows an explicit alert that online registration is not open, and returns. It can no longer reach the success screen. |
| `src/app/book/payment.tsx` | Dropped the now-unused `makePaymentId` import. |
| `src/context/booking-draft.tsx` | `makePaymentId()` **deleted**, replaced by a comment explaining why. A payment id now only ever comes from Razorpay's verify response. |
| `src/app/tournament/[id].tsx` | The CTA is honest rather than a dead end: it opens a pre-filled `mailto:` enquiry to the GameOn team. Added an `InfoNote` ("Online registration opens soon"), relabelled the button **Register Your Team**, and corrected the footer from *"Secure Payment \| Instant Confirmation"* to *"Fee collected once the team confirms your entry"*. Removed the unused `useBookingDraft` coupling. |

**Verified:** `npx tsc --noEmit` clean; `npx expo lint` **0 errors** (5 pre-existing warnings, all in files not touched by this change).

### 13.2 🗄️ Phase 0.1 — the drift baseline migration

**Created:** `gameon/supabase/migrations/20260929120000_drift_baseline_events_tournaments_wallets.sql` (~790 lines).

Reconstructs, extracted from the live catalog: 12 tables with every column, CHECK, FK, PK, unique constraint and index; the 3 `profiles` referral columns; 13 functions verbatim from `pg_get_functiondef`; the `on_auth_user_created` trigger on `auth.users`; RLS enabled on all 12 tables; and the two idempotent configuration seeds (`cancellation_policy_tiers` 24/12/0, `referral_settings` 0/0).

**How it was validated** — every statement was executed against the **real** schema inside `BEGIN … ROLLBACK` transactions, so nothing was mutated:

| Validation | Result |
|---|---|
| `BEGIN; create …; ROLLBACK;` actually rolls back | ✅ verified with a sentinel table |
| Wallet / referral / tier tables (4 tables + 2 indexes) | ✅ created |
| Tournaments + images + sections + registrations (4 tables + 6 indexes) | ✅ created |
| Events + images + sections + orders (4 tables + 5 indexes) | ✅ created |
| Helper functions, `profiles` columns, `wallet_adjust` | ✅ |
| RLS, triggers, `handle_new_user`, auth trigger, seeds, read helpers | ✅ 12/12 RLS tables |
| `court_types` composite-key guard is a no-op on live | ✅ count stayed at 2 |

**Two real bugs were caught by this validation and fixed:**

1. The `court_types` guard checked for a constraint named `court_types_id_venue_id_key`. The live constraint is actually named `court_types_id_venue_key`, so the guard would have added a **redundant** unique index. It now matches on the *columns* rather than the name.
2. `array_agg(a.attname)` is `name[]`, which Postgres refuses to compare to `text[]` (`operator does not exist: name[] = text[]`). Fixed with an explicit `::text` cast on both the aggregate and the `ORDER BY`.

### 13.3 🧹 Phase 0.2 / 0.4 — cleanup

- **Deleted** `gameon/schema.sql` — the original hand-written bootstrap, which contradicted the live schema (standalone `users` table, no `court_types`/`events`/`wallet`).
- **Deleted 10 scratch files** from `gameon-multisports/`: `scratch-fix-idtoken.js`, `scratch-fix-require.js`, `scratch-fix.js`, `scratch-fix2.js`, `scratch-fix3.js`, `scratch-frontend.js`, `scratch-merge.js`, `scratch-provider.js`, `scratch-session.js`, `patch.py`. `patch.py` still contained the **old fake-tournament implementation** with its "Tournament Mock Bypass" comment.
- **Deleted 7 scratch files** from `gameon/`: `scratch-env.js`, `scratch-fix-backend.js`, `scratch-fix-ex.js`, `scratch-fix-middleware.js`, `scratch-revert.js`, `scratch-test.js`, `test-query.js`.

### 13.4 🚧 New blocker discovered

`node scripts/gen-supabase-types.mjs` → `failed to retrieve generated types: {"message":"Unauthorized"}`. **The `SUPABASE_ACCESS_TOKEN` in `gameon/.env.local` is revoked or expired**, which blocks Phase 0.3 (regenerating both `database.types.ts` files). A fresh token from the Supabase dashboard unblocks it.

### 13.5 What is next, in order

1. **Phase 0.1b/0.1c** — back up production; record the 5 unrecorded migrations + the baseline in `supabase_migrations.schema_migrations`; prove reproducibility on a throwaway project.
2. **§12 decisions** — at minimum Q1 (events architecture) and Q2/Q3 (refund tiers + points rate), because Phases 2–4 are shaped by them.
3. **Phase 2** — wallet API + admin, then swap the two mock providers out of the app.
4. **Phase 3/4** — events, then tournaments, each with its admin surface.
5. **Phase 5–8** — refunds/cancel, account/referral/feedback/promo, admin completion, release engineering.

---

## 14. Second pass — teammate merge, and Phase 2 delivered

### 14.1 What arrived in the teammate's merge (`00263c0`, PR #2)

Far more than the commit message suggested. Confirmed present in the tree:

**Backend APIs**
- `GET /user/wallet` → `{ balance, totalEarned, totalUsed }`
- `GET /user/wallet/transactions?page&limit` → paged ledger
- `GET /user/referral` → code, admin-set bonuses, referral stats
- `POST /user/bookings/[id]/confirm-with-wallet` → confirms when Points cover the price in full
- `GET /user/bookings/[id]/cancellation-preview` → what cancelling now would refund
- `POST /user/bookings/[id]/cancel` → real policy-driven cancel
- `POST /user/bookings` → now accepts `walletPointsToUse`, returns `walletPointsUsed` + `remainingPayable`
- `POST /user/payments/create-order` → charges only the remainder; `409 FULLY_COVERED_BY_WALLET`
- Tournaments: `GET /public/tournaments`, `/public/tournaments/[id]`, `POST /user/tournaments/[id]/register`, `GET`/`cancel` `/user/tournament-registrations/[id]`, payments create-order + verify
- Events: `GET /public/events`, `/public/events/[id]`, `POST /user/events/[id]/tickets`, `GET`/`cancel` `/user/event-orders/[id]`, payments create-order + verify
- `GET /public/cancellation-policy`

**New services:** `wallet`, `tournament`, `event`, `cancellation-policy`, `referral`.
**New admin pages:** cancellation-policy, events (+new, +[id]), tournaments (+new, +[id]), referrals; wallet on the customer detail page.
**New migrations:** events_and_tournaments, tournaments_single_fk, cancellation_policy, court_type_max_players, wallet, wallet_admin_adjustment, referrals.
**Also:** `firebase-admin.ts` replaced by `firebase-token.ts`; `database.types.ts` regenerated.

So **Phase 2 items 2.1–2.4, and most of the backend for Phases 3–4, are done.**
The gap was 2.5 — the app.

### 14.2 Phase 2.5 delivered — the app now uses the real wallet

| File | Change |
|---|---|
| `src/context/wallet.tsx` | **New.** `WalletProvider` + `useWallet()`: live balance, lifetime totals, and a paged ledger with `loadMore`, `refresh`, per-resource request tickets, loading/error state. Keyed on the account so signing in as someone else remounts with clean state. A failed read shows **zero**, never a stale balance — Points must not look spendable when unconfirmed. |
| `src/constants/transactions.ts` | Rewritten. `ACCOUNT_TRANSACTIONS` **deleted**; now the API types plus `toAccountTransaction()` / `formatLedgerStamp()`. Dates formatted by hand so a device locale cannot reshape a row. |
| `src/constants/wallet.ts` | `WALLET_SUMMARY` and `WALLET_TRANSACTIONS` **deleted**; keeps only the static `EARN_RULES` copy, with the invented Point amounts removed. |
| `src/constants/payment.ts` | Removed the mock `WALLET_POINTS`. |
| `src/context/booking-draft.tsx` | `maxRedeemablePoints` / `walletPointsApplied` now come from the **live** balance. `walletPoints = 0` means "as much as the booking can absorb". |
| `src/app/_layout.tsx` | `WalletProvider` added inside `SessionProvider`, wrapping `BookingDraftProvider`. |
| `src/app/(tabs)/accounts/wallet.tsx` | Pull-to-refresh wired to `refresh()`. |
| `src/app/(tabs)/accounts/transactions.tsx` | Real ledger, filtering, load-more, first-load spinner, error + empty states with retry. |
| `src/components/wallet/wallet-hero.tsx` | Reads the API; shows `—` while loading and surfaces read errors. |
| `src/components/wallet/wallet-transactions.tsx` | Real recent entries; explains an empty ledger instead of rendering nothing. |
| `src/components/wallet/wallet-transaction-card.tsx` | Takes an `AccountTransaction`; shows the server's own `status` wording. |
| `src/components/transactions/stat-cards.tsx` | Real balance and lifetime total. |
| `src/components/transactions/transaction-table.tsx` | Dropped the `payment` pill — the API sends no payment method for a Points row. |
| `src/app/book/payment.tsx` | **The important one.** Sends `walletPointsToUse`; renders the `WalletBlock`, which existed but was **never mounted anywhere**; when `remainingPayable <= 0` it calls `confirm-with-wallet` and goes to success with **no Razorpay order at all**; refreshes the wallet on both paths; the footer shows the amount actually payable, not the gross total. |

**Design decision worth recording:** the "Bookings" filter pill was removed.
`GET /user/wallet/transactions` returns the *Points* ledger, and a card-paid
booking writes no row to it — so that pill could never match anything. The screen
subtitle now says it shows Points activity. A unified bookings-plus-Points feed
needs its own endpoint.

### 14.3 Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npx expo lint` | ✅ **0 errors**, 5 pre-existing warnings (all in files untouched here) |
| `npx expo export --platform web` | ✅ all **41** routes built, incl. `/accounts/wallet` (44KB) and `/accounts/transactions` (43KB) |

Two genuine bugs were caught by the linter and fixed rather than suppressed:
`useWallet()` was called **after** an `isGuest` early return in both screens (a
hook-order violation), and the wallet store reset its state inside an effect
(React Compiler's cascading-render rule). The latter is now solved structurally
by keying the store on the account instead of resetting it.

### 14.4 Retraction

The **drift-baseline migration from the first pass was deleted.** §7 retracts it:
every object it "reconstructed" was already in a versioned migration, and because
it was timestamped after the teammate's files it would have overwritten their
functions on the next `db push`.

### 14.5 Still open in Phase 2

- **Server-side redemption quote.** `maxRedeemablePoints` is computed client-side
  from the balance. The server clamps the real value in `createBooking`, so this
  is display-only and cannot over-spend — but a
  `POST /user/wallet/redeem/quote` would keep the two in step on edge cases.
- **`GET /user/referral` exists and is unused.** The Refer & Earn screen is still
  hardcoded (`GAMEON20`, "Total Referrals: 12", a copy button that does not copy).
  That is Phase 6.2 and is now a small job.
- **`promoCode` is still collected and never sent**; there is no `promo_codes`
  table.
- **Profile save is still a no-op** and `constants/user.ts` is still the identity
  behind three screens (Phase 6.1).
- **Cancellation is now possible server-side** but the app still says *"Cancelling
  or rescheduling isn't available in the app yet"* in `booking/[id].tsx`, with
  `cancellation-preview` unused — Phase 5.4.
- The 5 pre-existing lint warnings remain.

---

## 15. Third pass — referral and cancellation delivered

The two "smallest next wins" from §14.5 are done.

### 15.1 Referral is now a working programme

The screen had a hardcoded code, a fake link, invented stats and a copy button
that only *pretended* to copy. Worse, the feature could not work at all: nothing
in the app ever sent a referral code, so `handle_new_user` — which reads
`referral_code` out of the sign-up metadata — never had one to match.

| File | Change |
|---|---|
| `src/constants/referral.ts` | **New.** `ReferralSummary` (the `GET /user/referral` shape), code normalisation/validation, and the share-message builder. |
| `src/app/(tabs)/accounts/refer-and-earn.tsx` | Rewritten against the API. Real code, real bonus amounts, real stats, and an error/loading path with retry. |
| `src/lib/email-auth.ts` | `signUpWithEmail` now forwards `referral_code` in the sign-up metadata. |
| `src/app/email-signup.tsx` | Optional **Referral code** field, normalised as it is typed, validated only when non-empty. |
| `src/app/phone-login.tsx` | Optional **Referral code** field on step 1, sent to `/auth/exchange` (which applies it to new accounts only). |
| `package.json` | Added `expo-clipboard` — the old button never touched the clipboard. |

**Two things were removed rather than faked**, since they could not work:

- **The "Referral Link" row.** It pointed at `https://gameon.app/invite/GAMEON20` — a
  domain that is not ours and a path that does not exist. A referral is redeemed by
  *typing the code at sign-up*, so the code is the shareable thing; the row now
  explains that instead of showing a dead URL.
- **Instagram / Facebook share buttons.** They called the same generic
  `Share.share()` as everything else, so tapping "Facebook" did not open Facebook.
  There are now three actions that genuinely differ: **WhatsApp** (`wa.me` deep link,
  with a fallback to the system sheet if it is not installed), **More** (the system
  share sheet), and **Copy Code** (real clipboard).

Copy is honest about the amounts too: with `referral_settings` seeded at 0/0 the
screen says "a sign-up bonus" rather than promising a figure that does not exist.

### 15.2 Cancellation is now possible in the app

`booking/[id].tsx` used to say *"Cancelling or rescheduling isn't available in the
app yet."* The backend had supported it since the merge.

- **Cancel booking** (upcoming bookings only) opens a sheet that fetches
  `GET /user/bookings/:id/cancellation-preview` **first**, so the player sees the
  refund percentage and rupee amount *before* confirming — computed by the server,
  never by the app.
- Confirm calls `POST /user/bookings/:id/cancel`, then refreshes **both** the
  bookings list and the wallet, because the refund is credited as Points inside the
  same request.
- The outcome is shown in the sheet, then dismissing it returns to My Bookings
  (the cancelled booking no longer exists in any of the three status tabs, so
  staying would show an empty screen).

**The hardcoded refund policy is gone.** `REFUND_SLABS`, `slabFor()` and
`REFUND_SHARE` were deleted from `constants/bookings.ts`, and `RefundPolicyTable`
now renders the tiers from `GET /public/cancellation-policy`, highlighting the tier
in force. Its "Reschedule" column was removed: the server models no reschedule
policy and the app cannot move a booking, so showing a rule nothing enforces was
worse than showing none. `RefundPolicyTable` was previously **unused** — it is now
mounted inside the cancel sheet.

This closes Phase 5.1 (one source of truth for refund policy) and Phase 5.4.

### 15.3 Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npx expo lint` | ✅ **0 errors**, same 5 pre-existing warnings |
| `npx expo export --platform web` | ✅ all **41** routes built |

### 15.4 Still open

- **Reschedule** — the server has no endpoint for it. Cancel-and-rebook is the
  honest interim; a real one needs a backend change.
- **Referral first-booking bonus** — `handle_new_user` records `referred_by` and pays
  the *sign-up* bonus, but nothing yet pays `referral_bonus` when the referee books,
  and `profiles.referral_bonus_paid` is never set. The screen shows the configured
  amount, so this needs a backend trigger to become real.
- **Profile save** is still a no-op and `constants/user.ts` is still the identity
  behind three screens (Phase 6.1).
- **`promoCode`** is still collected and never sent; no `promo_codes` table.
- **Feedback** still persists nothing.
- **Events and tournaments app screens** still read `constants/events.ts` and
  `constants/tournaments.ts`, though that is now the *last* remaining fixture wall —
  their APIs exist.

---

## 17. Fifth pass — events and tournaments are live

The last fixture wall is down. `constants/tournaments.ts` is **deleted**, and
`constants/events.ts` no longer holds a single row of data — only the API types
and the display helpers both screens share.

### 17.1 The listing

| File | Change |
|---|---|
| `src/context/activities.tsx` | **New.** One provider fetching `GET /public/events` and `GET /public/tournaments` with `Promise.allSettled`, so a tournaments outage cannot blank the Events tab. Shared by the listing and the Home shortcut. |
| `src/constants/events.ts` | Rewritten: `PublicEvent`, `PublicTournament`, `PublicActivity` plus the helpers (`activityStatus`, `dateRangeLabel`, `dateRangeShort`, `timeRangeLabel`, `countdownLabel`, `spotsLeft`, `registrationOpen`, `entryFeeLabel`, `placeUnit`, `startMonthToken`). |
| `src/hooks/use-event-filters.ts` | Now takes the activities as an argument. No fixture default. |
| `src/components/events/event-card.tsx` | Renders the API shape: real photo or the sport fallback, real places left, real fee, and a Tournament badge instead of a fabricated status. |
| `src/components/events/detail-hero.tsx` | Same, with `null`-sport handling — an activity whose sport the app has no artwork for still renders. |
| `src/app/(tabs)/events.tsx` | Live, with pull-to-refresh, a first-load spinner, an error state with retry, and Ongoing / Upcoming / **Finished** sections. Finished ones are listed rather than hidden, so a run that ended does not silently vanish. |

### 17.2 The two detail screens — real purchase flows

Both are built the same way, and both are now **idempotent against the server**:
the app never decides a price, a fee or whether a slot exists.

**Event tickets** (`event/[id].tsx`)
1. `POST /user/events/:id/tickets` → holds N tickets for 10 minutes
2. `POST /user/event-orders/:id/payments/create-order` → Razorpay order
3. Razorpay checkout → `POST /user/event-orders/:id/payments/verify` → confirmed
4. Backing out calls `/cancel`, releasing the hold for someone else
5. A `409 TICKETS_TAKEN` (sold out between hold and payment) surfaces the
   server's own message rather than a generic failure

**Tournament entries** (`tournament/[id].tsx`) — the same five steps through
`/user/tournaments/:id/register` and `/user/tournament-registrations/...`, with
team name and captain instead of ticket count, and `409 SLOT_TAKEN` when the
bracket filled up.

Both read by id (`GET /public/events/:id`, `/public/tournaments/:id`) rather than
out of the listing, so a deep link opens an activity whatever its status. Both
show a **Booking closed / Registration closed** note and disable the CTA when
`registrationOpen()` is false — closed status, sold out, or past the cut-off.

`src/components/payment/razorpay-checkout.tsx` is **new**: the WebView checkout
was pulled out of `book/payment.tsx` and is now shared by all three paid flows,
so the gateway is driven in exactly one place.

### 17.3 "My Tickets & Entries" — the gap I had to close

Buying tickets left a player with **no way to see them**: the bookings store only
reads `bookings`, and only single-record reads existed for orders and
registrations. Two list endpoints and one screen close that:

- `GET /user/event-orders` and `GET /user/tournament-registrations` (new) —
  the caller's own rows, live statuses only, newest first
- `src/app/my-tickets.tsx` (new) — both lists, with an empty state that points at
  the Events tab, reachable from a card on the Events tab

### 17.4 What was removed

| Removed | Why |
|---|---|
| `src/constants/tournaments.ts` | Rewritten as API data. |
| `src/components/tournament/{facts-table,prizes-panel,rules-list}.tsx` | Rendered the fixture `stats`/`facts`/`prizes`/`rules`. Those are now `tournament_sections` rows an admin writes, rendered by the shared body. |
| `src/components/events/highlights-grid.tsx` and `EVENT_HIGHLIGHTS` | Four decorative tiles with no data behind them. |
| The tournament branch in `book/payment.tsx` and `tournamentKey` in the booking draft | Superseded by the real registration flow. **This retires the Phase 4.1 safety patch** — the fake-success path no longer exists at all, rather than being blocked. |
| `event/[id].tsx`'s `mailto:`-only CTA | Replaced by a real purchase; the enquiry address survives on the Home "Organise" banner. |
| `tournament/[id].tsx`'s email-enquiry CTA | Replaced by real registration. |

### 17.5 Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npx expo lint` | ✅ **0 errors**, same 5 pre-existing warnings — no new ones |
| `npx expo export --platform web` | ✅ **42** routes built (was 41; `/my-tickets` is new) |

### 17.6 Still open

- **Event and tournament check-in at the venue.** The admin panel checks in
  *bookings* by QR; a ticket order has no QR or scan path yet. That is a backend
  plus admin job, not an app one.
- **No "My Tickets" entry from the Accounts menu** — it is reachable from the
  Events tab only.
- **Promo codes, feedback persistence, and the referral first-booking bonus** are
  unchanged (§15.4, §16.6).


---

## 16. Fourth pass — Phase 6.1, a real profile

`constants/user.ts` is **gone**. The profile is now read, written and displayed
from the database, and a live security hole found while investigating it is
closed.

### 16.1 🔴 Security hole found and fixed

The `profiles` UPDATE policy was `using (id = auth.uid()) with check (id = auth.uid())`
— scoped by **row only, with no column restriction**. With the publishable key
that ships inside the app, any signed-in player could write, on their own row:

| Column | What a player could do |
|---|---|
| `referral_code` | set it to any code they liked — breaking referral attribution and the uniqueness `generate_referral_code()` depends on |
| `referred_by` | name their own referrer, to farm the referral bonus |
| `referral_bonus_paid` | mark the first-booking bonus as already paid |

**Fixed** in `20260929140000_lock_profile_write_columns.sql`, applied to the live
project. A column-level `REVOKE` alone does nothing while the role still holds the
table-level privilege, so the table grant is dropped and re-granted per column.
Verified afterwards:

```
authenticated UPDATE: full_name, city, gender, date_of_birth, preferred_sports
authenticated INSERT: id, full_name, email
anon:                 no UPDATE, no INSERT, no DELETE
```

`email` and `phone` are excluded from UPDATE as well — they are verified
identity, so changing either needs a verification step, not a PATCH.

### 16.2 A second design fix: the database mints referral codes

`GET /user/profile` heals a missing profile row, which meant it needed a referral
code — and `generate_referral_code()` is **not in the backend's generated
types**, so calling it via `.rpc()` would not even compile. The real fix was to
stop needing the call at all:

```sql
alter table public.profiles
  alter column referral_code set default public.generate_referral_code();
```

`20260929150000_profile_referral_code_default.sql`, applied and verified — the
column now defaults to a freshly minted code (`191F30` from a live call). Any
insert path gets a valid, unique code for free, and no caller has to invent one.

### 16.3 `GET` / `PATCH /user/profile`

New route, `src/app/api/v1/user/profile/route.ts`.

- **GET** reads the caller's row and, if it is missing, **creates it** — taking
  `full_name` from the auth metadata the sign-up screens set. `handle_new_user`
  normally makes the row, but a user created before that trigger existed would
  otherwise stare at an empty profile forever. A lost race re-reads the winner's
  row rather than failing.
- **PATCH** accepts only `fullName`, `city`, `gender`, `dateOfBirth`,
  `preferredSports`. Only the fields actually sent are written, so omitting one
  never clears it; an explicit `null` or `""` clears it. `dateOfBirth` must be a
  real date in the past, and sport slugs are validated by shape (not a fixed
  list) so a sport added in the admin panel needs no code change.

### 16.4 The app

| File | Change |
|---|---|
| `src/constants/user.ts` | **Deleted.** The hardcoded `Rahul Sharma` identity is gone. |
| `src/lib/profiles.ts` | Rewritten. `fetchMyProfile()` and `saveMyProfile(patch)` now go through the API; the old Supabase-client `ensureMyProfile` (whose insert could never succeed — `referral_code` was `NOT NULL` with no default) is removed. |
| `src/lib/api-client.ts` | Added `patch()`. |
| `src/context/session.tsx` | Profile now loads from the API, so it is reliable for **both** phone and email sessions. Added `profileLoading`, `profileError` and `refreshProfile()`. `emailUserId`/`emailUserName`/`emailUserEmail` — misnamed leftovers from the email-only era — became one honest `userId`. |
| `src/app/(tabs)/accounts/profile-management.tsx` | Rewritten. Reads the row, saves real changes, shows saving/success/failure, and "Member since" from `created_at`. The form is a child keyed on the profile id, so its state seeds from the row exactly once instead of an effect re-seeding it under an edit. |
| `src/app/(tabs)/accounts/index.tsx` | Header reads `profile` (falling back to the auth user while it loads); blank lines are omitted rather than filled with a fixture. |
| `src/app/(tabs)/accounts/feedback.tsx` | Reply-to defaults to the account's own address, and picks it up whenever it loads without clobbering what the player is typing. |

**Phone and email are now read-only**, with their Verified badge. They were
editable text boxes whose changes could never have been saved — an explicit
"verified" tick next to a free-text field was a contradiction. Changing either
needs a real verification flow (Firebase OTP / Supabase email confirmation), so
the screen states that instead of pretending.

**Only genuine changes are sent.** The Save button is disabled until something
differs from the last saved values, and the patch contains just those fields.

### 16.5 Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` (app) | ✅ clean |
| `npx tsc --noEmit` (backend) | ✅ clean |
| `npx expo lint` | ✅ **0 errors**, same 5 pre-existing warnings |
| `npx expo export --platform web` | ✅ all **41** routes built (`/accounts/profile-management` now 38KB, down from 43KB) |
| `profiles` column privileges | ✅ verified live — referral columns no longer writable by `authenticated` |
| `referral_code` default | ✅ verified live — mints a unique 6-character code |

### 16.6 Still open

- **Changing email or phone.** Both need a verification flow: Supabase's
  `updateUser({ email })` for the address, and a re-run of the Firebase OTP
  handover for the number. Until then they are read-only, which is honest.
- **Referral first-booking bonus** still needs a backend trigger (§15.4).
- **`promoCode`**, **Feedback persistence**, and the **events/tournaments app
  screens** remain — see §15.4.















