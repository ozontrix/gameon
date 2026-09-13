# GameOn Backend & API Architecture Plan (V2 - Enterprise Grade)

## 1. Overview
This document outlines the professional backend architecture for the GameOn Multi-Sports facility. The APIs will be built using Next.js (App Router) and backed by Supabase (PostgreSQL). These APIs will be consumed primarily by the `gameone-multisports` React Native mobile application.

This plan includes strict risk-mitigation strategies (concurrency locks, payment abandonment, scalability) typical of enterprise reservation systems.

## 2. System Architecture (Layered Approach)
To ensure maintainability and scalability, the backend follows a **Controller-Service-Repository** pattern. 

### Folder Structure
```text
gameon/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── v1/                 # API Versioning for mobile apps
│   │           ├── admin/          # Protected routes for staff/admin
│   │           │   ├── venues/
│   │           │   ├── facilities/
│   │           │   ├── holidays/
│   │           │   └── bookings/   # Includes /verify-qr
│   │           └── user/           # Routes for standard users
│   │               ├── facilities/
│   │               ├── slots/      # Slot generation (Rate-limited)
│   │               └── bookings/   # Creates and views user bookings
│   │
│   ├── lib/
│   │   ├── services/               # Core Business Logic Layer
│   │   │   ├── booking.service.ts  # Handles transaction logic & double-booking prevention
│   │   │   ├── slot.service.ts     
│   │   │   └── admin.service.ts
│   │   │
│   │   ├── db/                     # Database / Supabase interactions
│   │   │   ├── supabase.ts         
│   │   │   └── queries/            
│   │   │
│   │   ├── utils/
│   │   │   ├── date-helpers.ts     # Strict Local Timezone enforcement (e.g. Asia/Kolkata)
│   │   │   └── errors.ts           
│   │   │
│   │   └── middlewares/
│   │       ├── auth.ts             # Validates JWT tokens and User Roles
│   │       └── rate-limiter.ts     # DDoS & Scraping protection
│   │
│   └── types/
│       ├── database.types.ts       # Supabase generated types
│       └── api.types.ts            # API request/response payload types
```

---

## 3. Database Schema (PostgreSQL)

### `users`
- `id` (UUID, PK)
- `name` (String)
- `phone` (String, Unique)
- `email` (String, Unique, Nullable)
- `role` (Enum: `USER`, `ADMIN`, `STAFF`) - Default: `USER`
- `created_at` (Timestamp)

### `venues` (Scalability / Future-Proofing)
- `id` (UUID, PK)
- `name` (String) - e.g., "GameOn Main Arena"
- `address` (String)
- `timezone` (String) - e.g., "Asia/Kolkata"
- `is_active` (Boolean)

### `sports`
- `id` (UUID, PK)
- `name` (String) - e.g., Badminton, Pickleball
- `is_active` (Boolean)

### `facilities` (Bookable Inventory)
- `id` (UUID, PK)
- `venue_id` (UUID, FK -> venues.id)
- `sport_id` (UUID, FK -> sports.id)
- `name` (String) - e.g., "Badminton Court 1"
- `is_indoor` (Boolean)
- `has_ac` (Boolean)
- `surface_type` (String)
- `price_per_hour` (Decimal)
- `is_active` (Boolean)

### `operating_hours`
- `id` (UUID, PK)
- `venue_id` (UUID, FK -> venues.id)
- `day_of_week` (Integer 0-6, 0=Sunday)
- `open_time` (Time)
- `close_time` (Time)
- `slot_duration_minutes` (Integer)

### `holidays_and_closures`
- `id` (UUID, PK)
- `venue_id` (UUID, FK -> venues.id)
- `date` (Date)
- `start_time` (Time, Nullable) - Null means closed all day
- `end_time` (Time, Nullable)
- `reason` (String)
- `facility_id` (UUID, FK, Nullable) - Null applies to the entire venue

### `bookings`
- `id` (UUID, PK) - **Also used as the QR Code Data**
- `user_id` (UUID, FK -> users.id)
- `facility_id` (UUID, FK -> facilities.id)
- `booking_date` (Date)
- `start_time` (Time)
- `end_time` (Time)
- `status` (Enum: `PENDING`, `CONFIRMED`, `CANCELLED`)
- `payment_status` (Enum: `UNPAID`, `PAID`, `REFUNDED`)
- `amount_paid` (Decimal)
- `expires_at` (Timestamp) - **Risk Mitigation:** If `PENDING` and time > expires_at, slot is freed.
- `is_scanned` (Boolean) - Default: false
- `scanned_at` (Timestamp, Nullable)
- `created_at` (Timestamp)
> **Constraint (Double-Booking Prevention):** `UNIQUE(facility_id, booking_date, start_time)` WHERE `status IN ('PENDING', 'CONFIRMED')`.

---

## 4. Core Workflows & Risk Management

### A. Dynamic Slot Generation
1. App requests slots for a Sport and Date.
2. System fetches `operating_hours` for that venue/day.
3. System blocks times listed in `holidays_and_closures`.
4. System checks `bookings` for `CONFIRMED` or valid `PENDING` reservations.
5. Unbooked slots are returned to the user.

### B. Checkout & Cart Abandonment (Locking)
1. User selects a slot. System creates a `PENDING` booking with `expires_at = NOW() + 10 minutes`.
2. This temporarily locks the slot (enforced by the DB Unique Constraint).
3. If the user pays, status becomes `CONFIRMED`.
4. If they abandon the app, a background cron job (or Supabase Edge Function) clears expired `PENDING` bookings, making the slot available to others again.

### C. Secure QR Code Management
1. **Generation:** `bookings.id` (UUID) is generated upon `CONFIRMED` status.
2. **Display:** Mobile app renders the UUID as a QR Code.
3. **Scan & Verify:** Staff scans QR -> Calls `POST /api/v1/admin/bookings/verify-qr`.
4. **Security Check:** Backend verifies `is_scanned == false`.
5. **Identity Check:** API returns a success message **along with the User's Name**. The staff verbally verifies ("Are you Rahul?") to prevent users from sharing screenshots of QR codes.
6. **Completion:** `is_scanned` is set to `true`, preventing reuse.

### D. Timezone Strictness
All dates and times are stored as standard `DATE` and `TIME` types (without timezone offsets) in the DB, mapped strictly to the venue's physical timezone (e.g., `Asia/Kolkata`). This prevents multi-hour offsets from shifting evening bookings into the next calendar day.
