// This is a minimal representation of your Supabase types.
// For a production app, you should generate this file automatically using the Supabase CLI:
// npx supabase gen types typescript --project-id "your-project-id" > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          role: 'USER' | 'ADMIN' | 'STAFF'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          role?: 'USER' | 'ADMIN' | 'STAFF'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          role?: 'USER' | 'ADMIN' | 'STAFF'
          created_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string | null
          timezone: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          timezone?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          timezone?: string
          is_active?: boolean
          created_at?: string
        }
      }
      sports: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
      }
      facilities: {
        Row: {
          id: string
          venue_id: string
          sport_id: string
          name: string
          is_indoor: boolean
          has_ac: boolean
          surface_type: string
          price_per_hour: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          sport_id: string
          name: string
          is_indoor: boolean
          has_ac: boolean
          surface_type: string
          price_per_hour: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          sport_id?: string
          name?: string
          is_indoor?: boolean
          has_ac?: boolean
          surface_type?: string
          price_per_hour?: number
          is_active?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string | null
          facility_id: string
          booking_date: string
          start_time: string
          end_time: string
          status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
          payment_status: 'UNPAID' | 'PAID' | 'REFUNDED'
          amount_paid: number
          expires_at: string | null
          is_scanned: boolean
          scanned_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          facility_id: string
          booking_date: string
          start_time: string
          end_time: string
          status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
          payment_status?: 'UNPAID' | 'PAID' | 'REFUNDED'
          amount_paid?: number
          expires_at?: string | null
          is_scanned?: boolean
          scanned_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          facility_id?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
          payment_status?: 'UNPAID' | 'PAID' | 'REFUNDED'
          amount_paid?: number
          expires_at?: string | null
          is_scanned?: boolean
          scanned_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
