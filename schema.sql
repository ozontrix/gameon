-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'STAFF');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('UNPAID', 'PAID', 'REFUNDED');

-- 2. Create Users Table (extends Supabase auth if needed, or standalone)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    role user_role DEFAULT 'USER' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Venues Table
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Sports Table
CREATE TABLE sports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Facilities Table
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_indoor BOOLEAN NOT NULL,
    has_ac BOOLEAN NOT NULL,
    surface_type VARCHAR(100) NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Operating Hours Table
CREATE TABLE operating_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (venue_id, day_of_week)
);

-- 7. Create Holidays and Closures Table
CREATE TABLE holidays_and_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason VARCHAR(255) NOT NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE, -- NULL means whole venue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status booking_status DEFAULT 'PENDING' NOT NULL,
    payment_status payment_status DEFAULT 'UNPAID' NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    expires_at TIMESTAMP WITH TIME ZONE, -- For cart abandonment
    is_scanned BOOLEAN DEFAULT FALSE,
    scanned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Add Constraints to Bookings
-- Ensure end time is strictly after start time
ALTER TABLE bookings ADD CONSTRAINT chk_time_order CHECK (end_time > start_time);

-- Double-Booking Prevention: Prevent two CONFIRMED or valid PENDING bookings for the same slot
CREATE UNIQUE INDEX no_double_booking_idx ON bookings (facility_id, booking_date, start_time) 
WHERE status IN ('PENDING', 'CONFIRMED');

-- 10. Optional: Insert initial seed data (Venue & Sports)
INSERT INTO venues (name, address, timezone) VALUES ('GameOn Multi-Sports', 'Main Location', 'Asia/Kolkata');

-- We can seed sports now so they are ready
INSERT INTO sports (name) VALUES 
('Badminton'), 
('Pickleball'), 
('Cricket Practice Nets'), 
('Box Football / Cricket');
