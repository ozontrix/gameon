# GameOn mobile web app

The app build of GameOn lives at **`/app`** in this Next.js site. It is a
port of the Expo app (`gameon-multisports/`) to the browser: the same three ways
in, the same five tabs, the same dark palette and the same spacing scale, driven
by the API that already exists in `src/app/api/v1/`.

Nothing about it is a second backend. Phone OTP, email sign-in, guest browsing,
bookings and the profile read all go through the routes the handset build uses.

## Routes

| Route | Screen | Reached from |
|---|---|---|
| `/app` | Sign in — phone, email, or guest | direct |
| `/app/phone-login` | 10 digits, then the 6-digit SMS code | "Continue with Phone" |
| `/app/email-login` | Email sign-in **and** sign-up on one screen | "Continue with Email" |
| `/app/home` | Dashboard: venue, banners, sports | first tab |
| `/app/sports` | Every bookable sport, cheapest slot price | second tab |
| `/app/bookings` | The player's own bookings, upcoming/past | third tab |
| `/app/events` | Events and tournaments | fourth tab |
| `/app/accounts` | Profile, legal links, sign out | fifth tab |

`(tabs)` is a Next.js route group, so the five tab screens share one layout and
the tab bar is mounted once — the same thing a native tab navigator does. The
group name does not appear in any URL.

## How the screens stay in step with the handset app

| Concern | Where it lives |
|---|---|
| Colours, type, spacing, radii | `src/lib/mobile/theme.ts` — a port of the app's `constants/theme.ts`; values are copied, not re-derived |
| API client | `src/lib/mobile/api-client.ts` — token renewal, GET retries, the 401 handler |
| Who is signed in | `src/components/mobile/session-provider.tsx` — Firebase phone **and** Supabase email, mirrored into one `SessionUser` |
| Phone OTP | `src/lib/mobile/phone-auth.ts` (Firebase) → `POST /api/v1/auth/exchange` → a renewable phone session |
| Email | `src/lib/mobile/email-auth.ts` (Supabase) |
| Reading an endpoint | `src/lib/mobile/use-api.ts` |
| Shell and kit | `src/components/mobile/` |

`/app/mobile.css` holds only what inline styles cannot express: `:active`,
`:focus-within`, `::placeholder`, keyframes, the safe-area frame and scrollbar
suppression. Colours there are the literal values from `theme.ts`, because a
stylesheet cannot import them.

### Two web-specific decisions

- **The bottom bar is made of real links.** In expo-router the tabs are
  `TabTrigger`s; here they are `<Link>`s to real URLs, so every tab is
  reloadable, shareable, and behaves with the browser's back button.
- **The frame is a centred handset.** `.mobile-viewport` / `.mobile-frame` in
  `mobile.css` render the 430pt layout as a phone-shaped column on a desktop
  browser instead of stretching it across the window.

## Environment

Email sign-in needs the two variables already used by the admin panel:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Phone sign-in needs a Firebase *web app* config**, which is not in
`.env.local` yet. Copy the values from Firebase console → Project settings →
Your apps → Web app:

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

## SEO

`/app` is `noindex` (layout metadata) and `/app/` is disallowed in `robots.ts`:
every screen is either an auth form or the signed-in player's own data.
