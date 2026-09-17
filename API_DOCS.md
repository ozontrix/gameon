# GameOn API Documentation

This document provides details on how to use the GameOn Next.js backend APIs. These endpoints are designed to be consumed by the React Native mobile application and the Admin/Staff portal.

---

## ⚙️ Setup & Environment

Before testing or deploying the APIs, ensure you have configured your environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"   # required — there is no fallback
SUPABASE_JWT_SECRET="..."                           # signs phone-login tokens
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'  # required for phone login
RAZORPAY_KEY_ID="rzp_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."   # Razorpay Dashboard → Webhooks
CRON_SECRET="..."               # Vercel sends it to /api/cron/clear-expired
```

Apply `supabase/migrations/20260917000000_booking_payment_hardening.sql` in the Supabase SQL Editor before deploying this API version.

To run the Next.js server on a custom port (e.g., 3001) to avoid conflicts:
```bash
npm run dev -- -p 3001
```

---

## 📱 User APIs (React Native App)

### 1. Fetch Time Slots
Returns every slot a court has on a date (from the venue's operating hours), each flagged `available`. A slot is unavailable when it is booked, held by an unexpired checkout, inside a partial closure, or has already started (venue timezone). An empty list means the court is closed that day.

* **Endpoint:** `GET /api/v1/user/slots`
* **Query Parameters:**
  * `facilityId` (UUID) - The ID of the court/turf.
  * `date` (String) - The target date in `YYYY-MM-DD` format.

**Example Request:**
```bash
curl "http://localhost:3001/api/v1/user/slots?facilityId=123e4567-e89b-12d3-a456-426614174000&date=2024-11-20"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "facilityId": "123e4567-e89b-12d3-a456-426614174000",
    "date": "2024-11-20",
    "slots": [
      { "start_time": "06:00:00", "end_time": "07:00:00", "available": false },
      { "start_time": "07:00:00", "end_time": "08:00:00", "available": true }
    ]
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid parameters",
  "details": { ...ZodValidationErrors }
}
```

---

### 2. Create a Booking (Lock Slot)
Creates a `PENDING` booking for the signed-in user, holding the slot for 10 minutes while they pay. The price is computed on the server (court hourly rate × slot length); any `amount` in the body is ignored.

* **Endpoint:** `POST /api/v1/user/bookings`
* **Headers:** `Content-Type: application/json`, `Authorization: Bearer <supabase access token>`

**Request Body:**
```json
{
  "facilityId": "uuid-of-the-court",
  "date": "2024-11-20",
  "startTime": "06:00:00",
  "endTime": "07:00:00",
  "players": 4,
  "contactName": "Rahul Sharma",
  "contactPhone": "9876543210",
  "notes": "optional"
}
```
`startTime`/`endTime` must match a slot returned by the slots endpoint. `players`, `contactName`, `contactPhone` and `notes` are optional.

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Slot locked successfully for 10 minutes. Proceed to payment.",
  "bookingId": "987e6543-e21b-12d3-a456-426614174000",
  "amount": 400,
  "expiresAt": "2024-11-20T00:40:00.000Z"
}
```
> *Note: After payment, the app encodes the full `bookingId` (UUID) into the check-in QR code.*

**Error Response (409 Conflict) - Double Booking:**
```json
{
  "success": false,
  "error": "Slot was just booked by someone else."
}
```

---

### 3. Pay for a Booking (Razorpay)

1. `POST /api/v1/user/payments/create-order` with `{ "bookingId" }` — only for the caller's own unexpired `PENDING` booking. Returns `{ orderId, amount (paise), currency, keyId }`. Calling it again for the same booking returns the same order.
2. Open Razorpay Checkout with that order.
3. `POST /api/v1/user/payments/verify` with `{ bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }`. The order must be the one created for that booking. Returns `200` once the booking is `CONFIRMED`, or `409` with `code: "SLOT_TAKEN"` if the hold lapsed and someone else booked the slot before the payment landed (the booking is then kept as `CANCELLED` + `PAID` for a manual refund).
4. If checkout is closed without paying, `POST /api/v1/user/bookings/{id}/cancel` releases the hold. It only works on the caller's own unpaid `PENDING` booking — paid bookings cannot be cancelled in the app yet.

`GET /api/v1/user/bookings` lists the caller's `CONFIRMED` bookings.

### 4. Razorpay Webhook
* **Endpoint:** `POST /api/v1/webhooks/razorpay`
* Configure in Razorpay Dashboard → Settings → Webhooks with the events `payment.captured` and `order.paid`, and the same secret as `RAZORPAY_WEBHOOK_SECRET`.
* Confirms the booking even when the app never calls `verify` (app closed, network lost). Safe to receive alongside `verify`.

---

### 6. Home Screen Content
* **Endpoint:** `GET /api/v1/public/home` (no auth)
* Returns the venue, the active banners (`hero`, `promo`) written in the admin panel, and a
  per-sport summary: `courtCount`, `priceFrom`, `bookingsLast30Days` (ranked, most booked first)
  and `imageUrl`. Cached for a minute at the edge.

### 7. Search
* **Endpoint:** `GET /api/v1/public/search?q=` (no auth, min 2 characters)
* Matches sports and courts by name or surface. The words `indoor`, `outdoor` and `ac` match
  court attributes instead of names.

### 8. Notifications
* `GET /api/v1/user/notifications` — the caller's notifications, newest first, with `unread`.
  `?countOnly=1` returns just the unread count (for the bell); `?limit=` and `?before=` page back.
* `POST /api/v1/user/notifications/read` — `{ "ids": ["uuid"] }`, or `{}` to mark all read.
* Sent automatically: booking confirmed, payment received but slot taken, admin cancellation,
  refund recorded, and a closure that affects a booking. Broadcasts come from the admin panel.

### 9. Cron
* `GET /api/cron/clear-expired` — releases lapsed checkout holds (daily).
* `GET /api/cron/booking-reminders` — a morning reminder for each of today's bookings (daily).
* Both require `Authorization: Bearer $CRON_SECRET`, which Vercel Cron sends automatically.

---

## 🛡️ Admin & Staff APIs (QR Scanner App)

### 10. Verify QR Code (Entry System)
Used by venue staff scanning a user's digital QR code. Validates if the code is authentic, paid, for today, and hasn't been scanned already.

* **Endpoint:** `POST /api/v1/admin/bookings/verify-qr`
* **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token of an ADMIN or STAFF user>`
> *Roles are read from the user's Supabase `app_metadata.role` (`ADMIN` / `STAFF`). "Today" is judged in the venue's timezone.*

**Request Body:**
```json
{
  "bookingId": "uuid-scanned-from-qr-code"
}
```

**Success Response (200 OK) - Allow Entry:**
```json
{
  "success": true,
  "message": "Access Granted",
  "facilityName": "Badminton Court 1",
  "userName": "Rahul Sharma",
  "userPhone": "+919876543210"
}
```
> *Staff should verbally confirm the name/phone to prevent users from sharing screenshots of QR codes.*

**Error Responses (400 Bad Request) - Deny Entry:**
```json
{
  "success": false,
  "error": "QR Code has already been used for entry!"
}
```
```json
{
  "success": false,
  "error": "Invalid Date! This booking is for 2024-11-25."
}
```
```json
{
  "success": false,
  "error": "Booking is not confirmed. Current status: PENDING"
}
```
