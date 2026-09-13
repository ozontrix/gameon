# GameOn API Documentation

This document provides details on how to use the GameOn Next.js backend APIs. These endpoints are designed to be consumed by the React Native mobile application and the Admin/Staff portal.

---

## ⚙️ Setup & Environment

Before testing or deploying the APIs, ensure you have configured your environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

To run the Next.js server on a custom port (e.g., 3001) to avoid conflicts:
```bash
npm run dev -- -p 3001
```

---

## 📱 User APIs (React Native App)

### 1. Fetch Available Time Slots
Dynamically calculates available 1-hour slots for a specific court on a given date. It automatically removes times that are booked by others, outside operating hours, or blocked due to holidays.

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
      { "start_time": "06:00:00", "end_time": "07:00:00" },
      { "start_time": "07:00:00", "end_time": "08:00:00" }
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
Creates a `PENDING` booking, temporarily locking the slot for 10 minutes so the user can complete payment via Razorpay/Stripe.

* **Endpoint:** `POST /api/v1/user/bookings`
* **Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "userId": "uuid-of-the-user",
  "facilityId": "uuid-of-the-court",
  "date": "2024-11-20",
  "startTime": "06:00:00",
  "endTime": "07:00:00",
  "amount": 500.00
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Slot locked successfully for 10 minutes. Proceed to payment.",
  "bookingId": "987e6543-e21b-12d3-a456-426614174000"
}
```
> *Note: The React Native app should encode this returned `bookingId` into the QR code after payment is confirmed.*

**Error Response (409 Conflict) - Double Booking:**
```json
{
  "success": false,
  "error": "Slot was just booked by someone else."
}
```

---

## 🛡️ Admin & Staff APIs (QR Scanner App)

### 3. Verify QR Code (Entry System)
Used by venue staff scanning a user's digital QR code. Validates if the code is authentic, paid, for today, and hasn't been scanned already.

* **Endpoint:** `POST /api/v1/admin/bookings/verify-qr`
* **Headers:** `Content-Type: application/json`
> *Security Note: In production, ensure this route requires an Admin JWT Token.*

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
