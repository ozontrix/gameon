# League full payment and 20% advance

The shared `/gameon-multisports-league/book/review` page supports every sport and
combined carts. Customers select **Pay in full** (default) or **Book your slot at
just 20%**. The selection survives refresh/back navigation.

- `entry.paymentPlan` accepts only `FULL` and `DEPOSIT_20`; older entries default
  to full. Full snapshots omit the field to preserve retries of existing orders.
- `quote.total` is always the complete booking total after the coupon discount.
- `league_bookings.amount_paise` is the amount due/captured on this Razorpay
  order, not the complete price for an advance booking. Advance = round(total
  paise / 5); outstanding balance = total paise minus captured paise.
- The server derives prices from the catalog. Coupon discounts and the selected
  advance are pinned atomically by `league_create_coupon_booking`.
- Payment confirmation still checks captured status, exact order, currency and
  saved amount. `CONFIRMED` means the chosen payment was captured and the entry
  is reserved; it does not mean the full balance was paid.
- Customer/staff confirmation emails, the success page, admin list/details and
  CSV distinguish the total, advance and remaining balance.
- Coupons remain allocated to issued orders. Switching plans after allocating
  a coupon order can hit the contact usage limit; resume the original plan/order
  or contact the desk. Do not release a still-payable order's coupon allocation.

## Pickleball Showdown catalog update

Pickleball alone runs on **31 October and 1 November 2026**. Its eleven ticket
categories replace the old Under-14/open catalog. Fees are retained from the
provided ticket screenshots for server quotes and are visible on every category,
cart row and checkout summary, labelled per person or per team. The league card
remains category-focused without a starting price. No category-specific prize
amounts were supplied for the new categories, so the old category prize allocations
are not reused.

Each new pickleball category stores `date: 2026-10-31` and
`endDate: 2026-11-01`: these represent the tournament window, **not** an assigned
bracket day. Shared summaries and receipts retain both dates, and omit repeated
per-category dates while displaying each category's fee. Frozen historical receipts
keep their original dates, names and amounts. Obsolete category IDs are removed from saved browser drafts,
not silently mapped into a different eligibility bracket. Other sports retain
their October 24–25 dates and pricing. No database migration is required.

Validation for this update: 92 targeted league/analytics tests, TypeScript,
league lint, production build and HTTP smoke checks passed. Chrome checks cover
the eleven category options, screenshot-matched entry prices, league card dates, selection
persistence and 32 intercepted full/advance checkouts at 375/768/1024/1440px.
No live orders, payments or emails are created by these tests.

## Remaining collection

There is **no automatic second charge, balance-payment link or balance-settlement
workflow** in this change. GameOn staff coordinate collection of the remaining
80%. The balance shown in this flow reflects this initial captured payment only;
external settlements are not automatically imported. No due date is invented.

The migration `20261013140221_league_deposit_payments.sql` was applied to the
connected database. Other deployments must apply it before enabling deposit
checkout. No environment-variable changes are needed.

## Checks

Run `node --test scripts/test-league-bookings.mjs scripts/test-league-coupons.mjs
scripts/test-league-cart.mjs scripts/test-league-flow.mjs scripts/test-league-details.mjs
scripts/test-smtp.mjs`, `npx tsc --noEmit`, and `npm run build`.
After building, run `node scripts/browser-league-payments.mjs` and
`node scripts/smoke-league-bookings.mjs`. Browser checkouts are intercepted and
Razorpay is mocked: these checks do not create live payments or send emails.

Validation: 91 targeted tests, TypeScript, lint, production build and 32 Chrome
checkouts at 375/768/1024/1440px passed. The real coupon RPC was validated inside
a rolled-back transaction (discounted advance, retry reuse, distinct full order).
Existing `test-league-coming-soon.mjs` and `smoke-league-bookings.mjs` assumptions
about the old landing page fail against the current two-event hub (which also
shows Open Play on October 18); these unrelated checks were not rewritten here.