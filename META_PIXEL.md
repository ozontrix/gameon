# GameOn Meta Pixel

Pixel ID: `1044470925231458`.

The root layout includes the Pixel on public website routes and the Multisports
League. Tracking is enabled for production builds and disabled for development
and Vercel preview deployments. No extra environment variable is required for
this browser-only integration.

## Consent and privacy

- Meta's SDK loads only after the visitor accepts marketing cookies.
- Accept and reject controls are available in the consent prompt; Cookie settings
  allows changing the choice later. Bookings and payments work without tracking.
- A browser Global Privacy Control signal prevents tracking.
- Admin, API, email confirmation, and account-deletion routes are excluded.
- Custom event parameters do not include names, emails, phone numbers, city,
  notes, or team/player details. Automatic event configuration is disabled.
- The standard Meta SDK can send page URLs, browser/device information and
  cookie identifiers after consent. The website privacy notice explains this.
- The supplied noscript image is intentionally not included, because it would
  send a request without the visitor choosing marketing consent.

## Events

| Event | Trigger |
| --- | --- |
| PageView | Initial consented public page and client-side pathname changes |
| ViewContent | League landing page or an individual sport page |
| AddToCart | Adding a sport category; removing it does not fire this event |
| InitiateCheckout | Opening the details step with a restored, non-empty cart |
| AddPaymentInfo | Razorpay returns payment details; uses the issued order amount |
| Purchase | Confirmation API successfully verifies the captured payment |
| Lead | Early-access signup is accepted by the waitlist or notification endpoint |

League monetary events use `INR` and rupee amounts (not Razorpay paise).
Content identifiers include both sport and category. Purchase value comes from
the verified saved confirmation, including coupon discounts, rather than the
browser cart total. An unpaid, cancelled or unverified payment does not emit
Purchase. Visiting or refreshing the success page does not emit Purchase.

Purchase uses `league-purchase:<razorpay-order-id>` as its event ID. Memory and
local storage prevent repeated callbacks in the same browser from queuing the
same purchase again. Storage/SDK errors do not interrupt payment confirmation.

## Deployment validation

After deploying the site, use the Pixel's Test Events view in Meta Events Manager
to check visits, sport views, category additions and the checkout funnel. Accept
marketing cookies in the test browser first. Confirm a real payment only when
you intentionally want to create a paid registration; local automated tests do
not create real payments or send Meta conversions.

Check that Purchase contains the actual discounted rupee value, `INR`, and the
sport-qualified category identifiers. Rejecting marketing cookies should leave
the booking flow functional without loading Meta's script. Avoid separately
configuring URL-based Purchase tracking for the success page or installing this
Pixel again through a tag manager, which could produce additional events.

## Limits

This implementation is browser-based, not Meta Conversions API. Ad blockers,
declined consent, connection failure, or a buyer closing the browser before
confirmation can prevent a conversion from reaching Meta. A payment confirmed
only by a server webhook does not send a browser Purchase. There is no guarantee
of delivery merely because an event was queued. Server-side tracking would need
separate Meta credentials and an appropriate consent/deduplication design.

Automated checks: `node --test scripts/test-meta-pixel.mjs` and
`node scripts/smoke-league-bookings.mjs` (the latter requires a production build).