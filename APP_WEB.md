# GameOn mobile web app

The app build of GameOn lives at **`/app`** in this Next.js site. It is a port of
the Expo app (`gameon-multisports/`) to the browser: the same three ways in, the
same five tabs, the same dark palette, the same spacing scale and the same motion
timings, driven by the API that already exists in `src/app/api/v1/`.

Nothing about it is a second backend. Phone OTP, email sign-in, guest browsing,
bookings, notifications and the profile read all go through the routes the handset
build uses.

## Routes

| Route | Screen | Reached from |
|---|---|---|
| `/app` | Sign in — phone, email, or guest, plus a direct "Create an account" | direct |
| `/app/phone-login` | 10 digits + referral code, then the 6-digit SMS code | "Continue with Phone" |
| `/app/email-login` | Email sign-in | "Continue with Email" |
| `/app/email-signup` | Create an account — the same form with a name and a referral code | "Create an account", or the email screen's "New to GameOn?" |
| `/app/home` | Dashboard: hero, next booking, sports, promo, events, features | first tab |
| `/app/sports` | Every bookable card, filtered server-side | second tab |
| `/app/bookings` | The player's own bookings, upcoming/ongoing/past | third tab |
| `/app/events` | Events and tournaments, one segmented control | fourth tab |
| `/app/accounts` | Profile, shortcuts, legal links, sign out | fifth tab |
| `/app/notifications` | Grouped by recency, filter pills, mark-all-read | the header bell |
| `/app/sport/[id]` | Sport detail: gallery, courts, date & time, booking details | a Sports card |
| `/app/book/payment` | Checkout: summary, GameOn Points, Razorpay | "Continue to Pay" |
| `/app/book/success` | Confirmation, re-read from the server | the gateway's callback |
| `/app/event/[id]` | Event detail: hero, facts, ticket purchase | an Events card |
| `/app/tournament/[id]` | Tournament detail: hero, facts, team registration | a Tournaments card |
| `/app/my-tickets` | Event tickets and tournament entries, in two lists | the Events tab card, or Accounts → My Tickets |
| `/app/booking/[id]` | Booking detail: check-in QR, court facts, invoice, cancel with refund | a booking card |
| `/app/accounts/wallet` | GameOn Wallet: Points balance, lifetime totals, recent ledger | Accounts → GameOn Wallet |
| `/app/accounts/transactions` | The wider history, filtered — payments and Points activity | Accounts → Transactions |
| `/app/accounts/profile-management` | Name, contacts, photo, date of birth, gender, city, preferred sports | Accounts → Profile Management |
| `/app/accounts/refer-and-earn` | The referral code, both bonus amounts, share targets, stats | Accounts → Refer and Earn |
| `/app/accounts/policies` | The five facility policies, each opening to its clauses | Accounts → Policies |
| `/app/accounts/privacy` | The privacy policy, in the app's own wording | Accounts → Privacy |
| `/app/accounts/terms` | Terms & Conditions, with the acknowledgement checkbox | Accounts → Terms and Conditions |
| `/app/accounts/feedback` | Rating, topic, message and reply address → `POST /public/feedback` | Accounts → Feedback |
| `/app/accounts/delete-account` | The deletion request, typed `DELETE`, with a reference back | Accounts → Delete Account |

`(tabs)` is a Next.js route group, so the five tab screens share one layout and
the tab bar is mounted once — the same thing a native tab navigator does. The
group name never appears in a URL.

## How the screens stay in step with the handset app

| Concern | Where it lives | Mirrors |
|---|---|---|
| Colours, type, spacing, radii, shadows | `src/lib/mobile/theme.ts` | `constants/theme.ts` — values copied, not re-derived |
| Motion durations, curves, travel | `src/lib/mobile/constants/motion.ts` | `constants/motion.ts` — curves as CSS `cubic-bezier`, springs as their timed equivalents |
| App facts (city, currency, points unit) | `src/lib/mobile/constants/config.ts` | `constants/config.ts` |
| Sports, slot options, catalogue types | `src/lib/mobile/constants/sports.ts` | `constants/sports.ts` |
| Booking and refund-tier types | `src/lib/mobile/constants/bookings.ts` | `constants/bookings.ts` (fixtures deliberately not ported) |
| Notification vocabulary | `src/lib/mobile/constants/notifications.ts` | `constants/notifications.ts` |
| API client | `src/lib/mobile/api-client.ts` | `lib/api-client.ts` |
| Who is signed in, and their profile | `src/components/mobile/session-provider.tsx` | `context/session.tsx` |
| Home banners and sports | `src/components/mobile/home-content-provider.tsx` | `context/home-content.tsx` |
| Notifications and the bell count | `src/components/mobile/notifications-provider.tsx` | `context/notifications.tsx` |
| Bookings, a status at a time | `src/components/mobile/bookings-store.tsx` | `context/bookings-store.tsx` |
| The bookable catalogue | `src/components/mobile/sports-catalog-provider.tsx` | `context/sports-catalog.tsx` |
| The booking being assembled, and GameOn Points | `src/components/mobile/booking-draft-provider.tsx`, `wallet-provider.tsx` | `context/booking-draft.tsx`, `context/wallet.tsx` |
| Slot dates, lengths and prices | `src/lib/mobile/constants/slots.ts` | `constants/slots.ts` — no `slotsForDate()`: availability is the server's and nothing here invents any |
| Points rate and trust marks | `src/lib/mobile/constants/payment.ts` | `constants/payment.ts` |
| The booking steps | `src/components/mobile/booking/*` | `components/booking/*` |
| Checkout pieces | `src/components/mobile/payment/*` | `components/payment/*` |
| Events, tournaments and their date/countdown helpers | `src/lib/mobile/constants/events.ts` | `constants/events.ts` |
| Event and tournament pieces | `src/components/mobile/events/*` | `components/events/*` |
| The kit | `src/components/mobile/ui/*` | `components/ui/*` |
| Home sections | `src/components/mobile/home/*` | `components/home/*` |
| Auth pieces and the OTP field | `src/components/mobile/auth/*` | `components/auth/*` (email sign-in and sign-up share one screen; the handset's two routes are kept as two URLs) |
| The auth chrome | inside the auth screens | the handset's own: no app header, but a round washed-out back button, the brand mark and a `STEP n OF 2` label |

### Five web-specific decisions

1. **Glyphs are the same glyphs.** The handset app draws icons with
   `@expo/vector-icons` (Ionicons for chrome, MaterialCommunityIcons for subject
   matter). A browser has no icon font, so `ui/icons.tsx` loads the *same two
   sets* as path data — `ionicons/icons` (SVG data URIs) and `@mdi/js` (path
   strings) — and inlines them. `Ion`/`Mdi` take the app's own glyph names, and
   `sport-icons.tsx` `TAB_ICONS` is the app's tab mapping verbatim.

2. **The bottom bar is made of real links.** In expo-router the tabs are
   `TabTrigger`s; here they are `<Link>`s to real URLs, so every tab is
   reloadable, shareable, and behaves with the browser's back button.

3. **The frame is a centred handset.** `.mobile-viewport` / `.mobile-frame` in
   `src/app/app/mobile.css` render the layout as a phone-shaped column on a
   desktop browser instead of stretching it across the window. Bottom sheets
   portal into `#gameon-sheet-root` inside that frame, so a sheet belongs to the
   phone column rather than to the browser window.

`mobile.css` holds only what inline styles cannot express: `:active`,
`:focus-within`, `::placeholder`, keyframes, the safe-area frame and scrollbar
suppression. Colours there are the literal values from `theme.ts`, because a
stylesheet cannot import them.

4. **A login screen renders its form, not a spinner.** The app gates its auth
   screens on the stored session, and the handset holds the whole screen back while
   it reads it. A browser cannot read that session before its scripts run, so
   holding the *content* back means the server sends a spinner where the login form
   should be, and the form then appears only if the client bundle arrives and
   executes — on a stale build, a blocked script or a slow connection the screen
   looks **deleted** rather than slow. The auth screens therefore render their form
   as the first paint, and the session only decides whether to redirect; the tab
   screens still hold back behind `useAccountGate`, and that wait is bounded
   (`RESTORE_PATIENCE_MS`) so a stalled client cannot trap the shell either.
   `/app/email-login` and `/app/email-signup` are two routes over one component
   (`components/mobile/auth/email-screen.tsx`) — it is one form — because the
   handset has two addresses and a shared link has to land on the right one.

5. **One box can receive the whole code.** The handset's OTP field is a single
   hidden input, so the keyboard's "autofill from Messages" types all six digits
   in one edit. Here the code is drawn across six inputs, and a `maxLength` of one
   per box clipped that edit to its first digit — the other five never arrived and
   the code could not be completed by autofill. Each box therefore accepts up to
   `length` characters, and `settle` spreads whatever arrives across the boxes; a
   write at least as long as the code replaces it outright.

## The booking flow

`/app/sport/[id]` → `/app/book/payment` → `/app/book/success`, in that order and
with the handset app's own order of operations, because that order is what keeps
money and court time honest:

1. The court is held by `POST /user/bookings`. The **server** prices the slot and
   clamps the Points against the player's real balance, so no figure shown here is
   trusted on the way back.
2. Points that cover the whole price confirm the booking outright
   (`POST /user/bookings/:id/confirm-with-wallet`) — there is nothing left for the
   gateway to take, so no Razorpay order is created at all.
3. Otherwise `POST /user/payments/create-order` returns an order for the remainder
   and `POST /user/payments/verify` confirms it. The webhook confirms it too, so a
   dropped connection on the way back does not lose the booking.
4. Closing the gateway without paying calls `POST /user/bookings/:id/cancel` to
   release the hold, so the slot is bookable again immediately rather than after
   the hold lapses.

Four places where a browser needed a different mechanism, and what replaced what:

| Handset | Web |
|---|---|
| Razorpay's native SDK / WebView checkout | `checkout.js` and Razorpay's own modal — `payment/razorpay-checkout.tsx` renders nothing and only drives the gateway |
| `Alert.alert` for a checkout problem | An inline notice card above the summary, so the message sits next to the thing it is about |
| Pull-to-refresh on the sport detail screen | A refresh action in that screen's header, which is where a browser keeps reload |
| `StickyFooter onHeight` | The footer is measured with a `ResizeObserver`, so the scroll clears it whether or not the summary breakdown is expanded |

The one visual difference that is deliberate: the handset paints its brand badge on the
`#0B0908` ground, and this web app draws the brand from the shared assets instead. The
`/app` header, every auth screen and the marketing navigation all render the official
`public/game_on.png` wordmark — the same file the hero, footer, league and open-play
pages already use — so the mark is never a retyped `GAME ⚡ N` that drifts from the real
artwork. `BrandLogo` takes a `size` in pixels, which is the rendered height; the width
follows the mark's own 893×250 ratio.

## Events and tournaments

`/app/event/[id]` and `/app/tournament/[id]` are one screen each over a shared
body, exactly as on the handset: the same hero (`DetailHero`), the same facts and
admin-written sections (`ActivityBody`), and the same free/live capacity rules
read from the API's own `capacity`, `taken` and `registrationClosesAt` — nothing
here decides whether an entry is still on sale.

Buying is the same four steps as a court booking:

1. `POST /user/events/:id/tickets` (or `/user/tournaments/:id/register`) holds the
   tickets or the team slot for ten minutes.
2. A free entry comes back `confirmed` and stops there — no gateway order is
   created at all.
3. Otherwise `.../payments/create-order` opens Razorpay for the fee the server set,
   and `.../payments/verify` is what actually issues the tickets or confirms the
   team.
4. Backing out calls `.../cancel`, releasing the hold immediately.

Every figure — the fee, the tickets left, the per-order cap — comes from the
listing or detail response. `spotsLeft`, `registrationOpen` and `entryFeeLabel` in
`constants/events.ts` only *read* those fields.

## Wallet and Points

The wallet is the one place where a figure has to be exactly right, so nothing on
either screen is computed locally:

- `GameOnWalletProvider` reads `GET /user/wallet` (balance, lifetime earned, lifetime
  used) and the first page of `GET /user/wallet/transactions`. A failed read shows
  **zero** rather than a stale balance — Points must never look spendable when we
  could not confirm them — and the store is keyed on the account, so a different
  player signing in never sees the previous player's balance.
- `/app/accounts/transactions` reads `GET /user/transactions`, which mixes gateway
  payments with Points movements. The table keeps the two units apart: a payment is
  shown in rupees with the Points it consumed beside it, a Points row in PTS. A
  filter changes what is fetched, not what is hidden — the server filters before it
  paginates, so "Refunds" means twenty refunds rather than the refunds that happened
  to be in the last twenty rows.
- `constants/transactions.ts` maps both endpoints onto one row type, so the wallet's
  recent list and the full history cannot drift apart.

Cancelling a booking credits the refund to the wallet as Points inside the same
request, which is why `/app/booking/[id]` refreshes both the bookings and the wallet
after a cancellation succeeds.

## The Account tab

The tab is the handset's own list, in the handset's own order: the profile card, then
Profile Management, Transactions, GameOn Wallet, Refer and Earn, Terms and Conditions,
Policies, Privacy, Feedback and Delete Account, then Logout behind a confirmation
sheet. A guest sees the card in its "Browsing as Guest" state and only the rows marked
`guest` — the four public pages — so the tab never offers a screen it cannot open.
Logging out clears any half-built booking draft on the way out.

The sub-screens share `components/accounts/`, the web twins of the handset's:
`screen-shell` (back chevron over a scrolling body), `screen-title`, `field-row` and
`legal-sections`. Three platform substitutions, and why:

| Handset | Web |
|---|---|
| `expo-image-picker` for the profile photo | A real `<input type="file">`, with the same `image/jpeg,png,webp` allow-list and 3 MB ceiling checked before the upload starts |
| A three-column `DatePickerSheet` | The browser's own `<input type="date">`, bounded to the same latest year the handset allows |
| `expo-clipboard` and the native `Share` sheet | `navigator.clipboard` and `navigator.share`, with a copy fallback where a browser has no share sheet |

Every account screen reads and writes the API, never the database: `GET`/`PATCH
/user/profile` (only the fields that changed, so an untouched field can never be
cleared), `POST /user/profile/photo`, `GET /user/referral`, `POST /public/feedback`
and `POST /user/account-deletion`. Profile management patches only the login contact's
*other* half: the server refuses an attempt to change the contact a player signs in
with, and the field is read-only with a "Verified" pill for that reason.

One structural difference, and it is the same one `wallet` and `transactions`
already had: the handset keeps the tab bar visible on these screens because they are a
nested stack *inside* the Account tab, whereas on the web they are ordinary pushed
pages — the back chevron is the way out, which is what a browser's own back button
does too. `src/app/app/accounts/layout.tsx` still carries the handset's gate, so a deep
link with no session lands on the login screen rather than on a screen whose reads can
only fail.

## Still to port

| # | Screen | Data |
|---|---|---|
| 1 | `/app/search` | `GET /public/search?q=` (sports and courts) |

Nothing in the app links to `/app/search` — the handset's Account tab has no Search row
either — so it is the only route left with no way in. Every other card in the app opens
a real screen.

## Environment

Email sign-in needs the two variables already used by the admin panel:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Phone sign-in needs a Firebase *web app* config**, which is not in `.env.local`
yet. Copy the values from Firebase console → Project settings → Your apps → Web
app:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

`NEXT_PUBLIC_FIREBASE_PROJECT_ID` must match the `project_id` of the
`FIREBASE_SERVICE_ACCOUNT` the backend verifies tokens against
(`src/lib/firebase-token.ts`), or every exchange will be rejected.

Optional: `NEXT_PUBLIC_PHONE_COUNTRY_CODE` (default `91`).

A Firebase web config is an identifier rather than a secret — it ships in the
client by design. Restrict the API key by HTTP referrer in Google Cloud Console
instead of trying to hide it. The **login domain must be listed under
Authentication → Settings → Authorized domains**, or Google's reCAPTCHA will
refuse to render and the OTP step will say so.

Until those keys are present, the phone screen renders normally and names the
missing variables on submit — it never silently accepts a code.

## Assets

`public/sports/{badminton,pickleball,cricket,football}.png` are the handset app's
own sport tiles, copied out of `gameon-multisports/assets/images/`. The route owns
its own asset namespace rather than reusing the marketing site's loose files at
`public/*.png`.

## SEO

`/app` is `noindex` (layout metadata) and `/app/` is disallowed in `robots.ts`:
every screen is either an auth form or the signed-in player's own data.

