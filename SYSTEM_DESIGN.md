# System Design: GameOn Multi-Sports Venue Booking System

This document outlines the architecture, high-level design (HLD), and low-level design (LLD) for the GameOn booking system, adhering to standard, scalable System Design principles (similar to those taught in Scaler/FAANG interviews).

---

## 1. Requirements Collection

### Functional Requirements (FRs)
1. Users should be able to view available time slots for specific sports facilities on a given date.
2. Users should be able to book a slot for a facility (1-hour duration).
3. The system must prevent double-booking (two users booking the same court at the same time).
4. Users receive a QR code upon successful payment/booking confirmation.
5. Venue staff must be able to scan the QR code to verify entry and prevent ticket reuse.
6. Admin should be able to configure holidays, venue operating hours, and active facilities.

### Non-Functional Requirements (NFRs)
1. **High Consistency:** Strict ACID properties are required for the booking transactions to avoid financial/booking conflicts. (Consistency > Availability in CAP theorem for the booking flow).
2. **High Availability:** The slot discovery and reading operations should be highly available.
3. **Low Latency:** Slot fetching should take `< 200ms`.
4. **Security:** QR codes must be tamper-proof and unguessable.

---

## 2. Capacity Estimation (Back-of-the-envelope)
Assuming expansion to 10 venues across a city:
* **Facilities per venue:** ~15 (Courts, Turfs, Nets)
* **Bookable slots per day per facility:** 15 hours
* **Total slots per day:** 10 * 15 * 15 = 2,250 slots.
* **Reads (Slot Queries):** Users check slots 20x more than they book. ~45,000 queries/day.
* **Writes (Bookings):** ~2,000 writes/day.
* **Conclusion:** This is a **Read-Heavy System**. The data volume is small enough to fit on a single relational database instance, but caching is highly recommended for slot discovery.

---

## 3. High-Level Design (HLD)

### Architecture Components
1. **Client App (React Native):** Interacts with the API Gateway.
2. **CDN / WAF (Cloudflare/Vercel):** Caches static assets, handles DDoS protection, and rate-limiting.
3. **API Gateway / App Server (Next.js):** 
   - Handles Routing and Authentication.
   - Routes requests to specific Services (Slot Service, Booking Service).
4. **Caching Layer (Redis - Future Scope):** 
   - Caches `operating_hours` and `holidays` as these rarely change.
   - Caches available slots for a given day (invalidated upon new booking).
5. **Database (PostgreSQL / Supabase):** 
   - Primary data store. 
   - Handles ACID transactions for booking locks.
6. **Async Workers (Cron / Edge Functions):**
   - Background tasks to clear abandoned carts (`status = PENDING` where `expires_at < NOW()`).

---

## 4. API Design

`GET /api/v1/slots?facilityId={uuid}&date={YYYY-MM-DD}`
- **Response:** `200 OK` `{ "slots": [...] }`
- **Cache:** Edge cached with short TTL (e.g., 30s) or invalidated on write.

`POST /api/v1/bookings`
- **Payload:** `{ "userId", "facilityId", "date", "startTime", "endTime" }`
- **Response:** `201 Created` `{ "bookingId": "uuid" }` (Locks slot for 10 mins).

`POST /api/v1/admin/verify-qr`
- **Payload:** `{ "bookingId": "uuid" }`
- **Response:** `200 OK` `{ "userName", "facilityName", "status": "Granted" }`

---

## 5. Database Design & Indexes (PostgreSQL)

We use a relational DB because of the strict consistency requirements for financial transactions.

### Key Tables
1. **`Users`**: `id (UUID)`, `phone`, `role`.
2. **`Facilities`**: `id (UUID)`, `venue_id`, `sport_id`, `name`.
3. **`Bookings`**: 
   - `id (UUID, PK)` -> Acts as the secure QR token.
   - `facility_id (UUID, FK)`
   - `booking_date (DATE)`
   - `start_time (TIME)`
   - `status (ENUM: PENDING, CONFIRMED, CANCELLED)`
   - `expires_at (TIMESTAMP)`

### Critical Indexes
To ensure fast slot retrieval and enforce consistency, we apply the following indexes:
1. **Double-Booking Prevention (Constraint Index):**
   ```sql
   CREATE UNIQUE INDEX idx_no_double_book ON bookings (facility_id, booking_date, start_time) 
   WHERE status IN ('PENDING', 'CONFIRMED');
   ```
   *Why?* The DB level unique constraint is the absolute source of truth. It mathematically prevents Race Conditions.
2. **Read Optimization Index:**
   ```sql
   CREATE INDEX idx_bookings_date_facility ON bookings (facility_id, booking_date);
   ```
   *Why?* The `SlotService` constantly queries bookings by date and facility to calculate availability.

---

## 6. Low-Level Design (LLD) / Deep Dives

### Deep Dive 1: Concurrency & Double Booking (The Race Condition)
**Scenario:** User A and User B request the exact same Badminton slot at the exact same millisecond.
**Solution:** 
We use **Pessimistic Locking** via PostgreSQL constraints. 
1. The API logic first does an application-level check.
2. It attempts to `INSERT` the row with status `PENDING`.
3. If both threads reach the DB simultaneously, PostgreSQL's `UNIQUE INDEX` (defined above) will throw a `23505 Unique Violation` error for the second thread.
4. The API catches this error and returns `409 Conflict: Slot just taken`.

### Deep Dive 2: The "Abandoned Cart" Problem (Booking Locks)
**Scenario:** User reserves a slot, is redirected to the payment gateway, but closes the app. The slot is locked forever.
**Solution:**
1. Initial booking is marked as `PENDING` with an `expires_at` timestamp set to `NOW() + 10 mins`.
2. A Cron Job (or Supabase pg_cron) runs every minute:
   ```sql
   UPDATE bookings SET status = 'CANCELLED' 
   WHERE status = 'PENDING' AND expires_at < NOW();
   ```
3. If payment succeeds, a webhook updates status to `CONFIRMED` and `expires_at` to `NULL`.

### Deep Dive 3: Secure QR Code Entry System
**Scenario:** Preventing users from sharing screenshots of QR codes to sneak friends in.
**Solution:**
1. **Generation:** The QR Code payload is simply the Booking's `UUID`. UUIDv4 is 128-bit and cryptographically secure against guessing.
2. **Verification Logic:**
   - Admin scans QR, sending UUID to backend.
   - Backend queries DB: `SELECT * FROM bookings WHERE id = UUID`.
   - **Check 1 (Date):** Is `booking_date == TODAY`? (Prevents using yesterday's code).
   - **Check 2 (Reuse):** Is `is_scanned == false`?
   - **Check 3 (Identity):** API returns `userName` to the Staff app. Staff verbally verifies identity.
   - **Mutation:** DB updates `is_scanned = true`. Code is now burned and cannot be reused.

---

## 7. Scalability Roadmap (Future Scope)

As the platform scales to hundreds of venues:
1. **Redis Caching:** The dynamic slot calculation (checking operating hours, minus holidays, minus existing bookings) is computationally heavy. We will implement Redis to cache the output array of `[Available Slots]` for a specific `(facility_id, date)`. This cache is invalidated immediately via DB Triggers whenever a new booking is inserted.
2. **Database Sharding:** If data grows massively, shard the Postgres DB by `venue_id` (Tenant-based sharding).
3. **Read Replicas:** Route all `GET /slots` requests to a Read Replica, while `POST /bookings` hit the Primary Master DB to preserve lock integrity.
