/**
 * Database types for the GameOn Supabase project.
 *
 * Shape matters: supabase-js requires `Relationships` on every table and
 * `Views` + `Functions` on the schema (see postgrest-js `GenericTable` /
 * `GenericSchema`). Without them every typed query degrades to `never` and
 * `next build` fails.
 *
 * Regenerate the authoritative version from the live project with:
 *   node scripts/gen-supabase-types.mjs
 * (needs SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_ID in .env.local)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums declared in schema.sql
export type UserRole = 'USER' | 'ADMIN' | 'STAFF'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          role?: UserRole
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_user_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['user_id']
          },
        ]
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string | null
          timezone: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          timezone?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          timezone?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'facilities_venue_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'facilities'
            referencedColumns: ['venue_id']
          },
          {
            foreignKeyName: 'holidays_and_closures_venue_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'holidays_and_closures'
            referencedColumns: ['venue_id']
          },
          {
            foreignKeyName: 'operating_hours_venue_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'operating_hours'
            referencedColumns: ['venue_id']
          },
        ]
      }
      sports: {
        Row: {
          id: string
          name: string
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'facilities_sport_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'facilities'
            referencedColumns: ['sport_id']
          },
        ]
      }
      facilities: {
        Row: {
          id: string
          venue_id: string | null
          sport_id: string | null
          name: string
          is_indoor: boolean
          has_ac: boolean
          surface_type: string
          price_per_hour: number
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          venue_id?: string | null
          sport_id?: string | null
          name: string
          is_indoor: boolean
          has_ac: boolean
          surface_type: string
          price_per_hour: number
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          venue_id?: string | null
          sport_id?: string | null
          name?: string
          is_indoor?: boolean
          has_ac?: boolean
          surface_type?: string
          price_per_hour?: number
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_facility_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'bookings'
            referencedColumns: ['facility_id']
          },
          {
            foreignKeyName: 'holidays_and_closures_facility_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'holidays_and_closures'
            referencedColumns: ['facility_id']
          },
          {
            foreignKeyName: 'facilities_venue_id_fkey'
            columns: ['venue_id']
            isOneToOne: false
            referencedRelation: 'venues'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'facilities_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
        ]
      }
      operating_hours: {
        Row: {
          id: string
          venue_id: string | null
          day_of_week: number
          open_time: string
          close_time: string
          slot_duration_minutes: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          venue_id?: string | null
          day_of_week: number
          open_time: string
          close_time: string
          slot_duration_minutes?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          venue_id?: string | null
          day_of_week?: number
          open_time?: string
          close_time?: string
          slot_duration_minutes?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'operating_hours_venue_id_fkey'
            columns: ['venue_id']
            isOneToOne: false
            referencedRelation: 'venues'
            referencedColumns: ['id']
          },
        ]
      }
      holidays_and_closures: {
        Row: {
          id: string
          venue_id: string | null
          date: string
          start_time: string | null
          end_time: string | null
          reason: string
          facility_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          venue_id?: string | null
          date: string
          start_time?: string | null
          end_time?: string | null
          reason: string
          facility_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          venue_id?: string | null
          date?: string
          start_time?: string | null
          end_time?: string | null
          reason?: string
          facility_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'holidays_and_closures_venue_id_fkey'
            columns: ['venue_id']
            isOneToOne: false
            referencedRelation: 'venues'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'holidays_and_closures_facility_id_fkey'
            columns: ['facility_id']
            isOneToOne: false
            referencedRelation: 'facilities'
            referencedColumns: ['id']
          },
        ]
      }
      bookings: {
        Row: {
          id: string
          user_id: string | null
          facility_id: string | null
          booking_date: string
          start_time: string
          end_time: string
          status: BookingStatus
          payment_status: PaymentStatus
          amount_paid: number | null
          expires_at: string | null
          is_scanned: boolean | null
          scanned_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          facility_id?: string | null
          booking_date: string
          start_time: string
          end_time: string
          status?: BookingStatus
          payment_status?: PaymentStatus
          amount_paid?: number | null
          expires_at?: string | null
          is_scanned?: boolean | null
          scanned_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          facility_id?: string | null
          booking_date?: string
          start_time?: string
          end_time?: string
          status?: BookingStatus
          payment_status?: PaymentStatus
          amount_paid?: number | null
          expires_at?: string | null
          is_scanned?: boolean | null
          scanned_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_facility_id_fkey'
            columns: ['facility_id']
            isOneToOne: false
            referencedRelation: 'facilities'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      booking_status: BookingStatus
      payment_status: PaymentStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
