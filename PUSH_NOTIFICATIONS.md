# Firebase push delivery

## What changed

All new `notifications` rows atomically enqueue delivery attempts for eligible
Android/iOS installations. Broadcasts include guest installations; targeted
messages only reach devices currently associated with that user. Previously
saved notifications are NOT replayed. Inbox behavior is unchanged.

`NotificationService.create` starts a bounded post-response worker. A leased,
server-only queue provides recovery, exponential retry (up to eight attempts)
and Firebase Retry-After support. `sent` means accepted by FCM, not proof of
device receipt. Expired/unregistered tokens are disabled. Token/credential data
is never included in the admin UI. It reports registered devices, pending and
failed counts, missing credentials and unavailable database state.

## Required deployment configuration

1. Apply `supabase/migrations/20261015160000_firebase_push.sql` (applied to the
   connected project on October 15, 2026). New push tables have RLS, no public
   policies and no anon/authenticated table or RPC privileges by design.
2. In the backend hosting environment, configure **server-only**
   `FIREBASE_SERVICE_ACCOUNT_JSON` with the Firebase service-account JSON.
   Legacy `FIREBASE_SERVICE_ACCOUNT` JSON also works. Alternatively set all of
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
   Never use an `EXPO_PUBLIC_` or `NEXT_PUBLIC_` name for credentials.
   Grant permission to send FCM messages and enable Firebase Cloud Messaging
   HTTP v1 API in the same project used by the native apps.
3. Set `CRON_SECRET`. `GET /api/cron/push-deliveries` accepts only
   `Authorization: Bearer <CRON_SECRET>`. It drains up to 1000 jobs per call,
   subject to the 230-second work budget and function limits.
4. `vercel.json` schedules recovery once daily (`0 3 * * *`, 03:00 UTC /
   08:30 IST) to support Vercel Hobby. Admin sends still start an immediate
   post-response attempt; failed or overflow deliveries can wait until the next
   daily recovery run (or later if the worker reaches its batch/time limit).
   Hobby execution can occur anywhere within the scheduled hour. For faster
   recovery, an external scheduler can call the same authenticated endpoint;
   none is configured by this change. Keep `CRON_SECRET` private.
5. Deploy the backend and build/install fresh Android/iOS apps. Native messaging
   cannot be added to already installed apps by JavaScript-only updates.
6. Upload the APNs authentication key in Firebase for the iOS app and verify
   signing/provisioning includes Push Notifications. See the mobile guide.

The local environment checker reports presence only, not remote validity:

```bat
node scripts/verify-push-env.mjs
node scripts/verify-push-env.mjs --validate
node --test scripts/test-push.mjs
npx tsc --noEmit
```

`--validate` obtains an OAuth token and makes an FCM `validate_only` topic
request. It does not deliver messages or print credentials. It validates server
authorization, not the APNs key, native installation or device receipt.

## Device registration API

### Verification on October 15, 2026

- Firebase OAuth and an FCM HTTP v1 `validate_only` request passed with local
  server credentials. This did not send a message and does not verify the
  production hosting environment or APNs configuration.
- Push migration presence and RLS were confirmed on the connected database.
  It had zero registered installations at verification time.
- Backend push/session/app-review suites passed (48 distinct tests); mobile push
  tests passed (17). TypeScript and targeted lint passed in both projects.
- Native Expo introspection and Android/iOS JavaScript exports passed. Signed
  native builds, installation and actual notification receipt remain unverified.

`POST /api/v1/push/devices` accepts `installationId` (UUID), `secret` (64 hex
characters), `token` (FCM token or null), `platform` (`android`/`ios`) and
`enabled` (boolean). Enabled registrations require a token. The installation
secret is hashed server-side, and updates require the same capability. Auth is
optional for broadcasts; when present it is verified and supplies the user id.
A client-supplied user id is rejected. The API is rate limited.

App launch, account changes, token refresh and foreground resume synchronize
registration. Offline writes are retried by the native registration lifecycle.
There is one row per installation, not per user, so one account can have many
devices. Account changes overwrite the device association; workers check the
target-user snapshot before sending. Permission denial disables the device.
An offline sign-out cannot immediately notify the server; detachment happens
when synchronization next succeeds. An already accepted OS push cannot be recalled.

## Firebase Console testing

Use Firebase Messaging's test-message function with the actual **FCM** token
for the installed device (including iOS; do not paste an APNs token). A visible
Firebase notification payload works in foreground/background. Optional custom
data `link=/sports` navigates internally; absent/unsafe links open the inbox.
Console messages do not automatically create a GameOn inbox row or delivery log.
Data-only messages do not promise a visible alert; server messages include a
notification title/body. OS permission, connectivity, Focus settings, device
restrictions and force-stop behavior can affect delivery.

## References

- https://firebase.google.com/docs/cloud-messaging/send/v1-api
- https://rnfirebase.io/messaging/usage/ios-setup
- https://vercel.com/docs/cron-jobs/usage-and-pricing