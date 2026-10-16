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
| `/app` | Sign in — phone, email, or guest | direct |
| `/app/phone-login` | 10 digits + referral code, then the 6-digit SMS code | "Continue with Phone" |
| `/app/email-login` | Email sign-in **and** sign-up on one screen | "Continue with Email" |
| `/app/home` | Dashboard: hero, next booking, sports, promo, events, features | first tab |
| `/app/sports` | Every bookable card, filtered server-side | second tab |
| `/app/bookings` | The player's own bookings, upcoming/ongoing/past | third tab |
| `/app/events` | Events and tournaments, one segmented control | fourth tab |
| `/app/accounts` | Profile, shortcuts, legal links, sign out | fifth tab |
| `/app/notifications` | Grouped by recency, filter pills, mark-all-read | the header bell |
| `/app/sport/[id]` | Sport detail: gallery, courts, date & time, booking details | a Sports card |
| `/app/book/payment` | Checkout: summary, GameOn Points, Razorpay | "Continue to Pay" |
| `/app/book/success` | Confirmation, re-read from the server | the gateway's callback |

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
| The kit | `src/components/mobile/ui/*` | `components/ui/*` |
| Home sections | `src/components/mobile/home/*` | `components/home/*` |
| Auth pieces and the OTP field | `src/components/mobile/auth/*` | `components/auth/*` |

### Three web-specific decisions

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

## Still to port

The remaining pushed screens, in priority order:

| # | Screen | Data |
|---|---|---|
| 1 | `/app/booking/[id]` — check-in QR, invoice, cancel with refund preview | `GET /user/bookings/:id`, `POST /user/bookings/:id/cancel`, `GET /user/bookings/:id/cancellation-preview` |
| 2 | `/app/event/[id]`, `/app/tournament/[id]`, `/app/my-tickets` | `GET /public/events/:id`, `/public/tournaments/:id`, `/user/event-orders` |
| 3 | `/app/search` | `GET /public/search?q=` |
| 4 | Accounts suite — wallet, transactions, refer & earn, profile management, policies | `/user/wallet`, `/user/transactions`, `/user/referral`, `/user/profile` |

Until those land, the Events cards link to `/app/event/…` and the booking cards to
`/app/booking/…`, which do not exist yet. Sports cards resolve: `/app/sport/[id]`
is live.

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

