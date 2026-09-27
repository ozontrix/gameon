export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: []
      }
      amenities: {
        Row: {
          created_at: string
          icon_family: string
          icon_name: string
          id: string
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon_family: string
          icon_name: string
          id?: string
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon_family?: string
          icon_name?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount_paid: number | null
          booking_date: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          end_time: string
          expires_at: string | null
          facility_id: string | null
          id: string
          is_scanned: boolean | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          players: number | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          refund_due_amount: number | null
          refund_percent: number | null
          refund_reference: string | null
          refunded_at: string | null
          scanned_at: string | null
          source: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string | null
          wallet_points_used: number
        }
        Insert: {
          amount_paid?: number | null
          booking_date: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time: string
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_scanned?: boolean | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          players?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_due_amount?: number | null
          refund_percent?: number | null
          refund_reference?: string | null
          refunded_at?: string | null
          scanned_at?: string | null
          source?: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string | null
          wallet_points_used?: number
        }
        Update: {
          amount_paid?: number | null
          booking_date?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_scanned?: boolean | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          players?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          refund_due_amount?: number | null
          refund_percent?: number | null
          refund_reference?: string | null
          refunded_at?: string | null
          scanned_at?: string | null
          source?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string | null
          wallet_points_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policy_tiers: {
        Row: {
          applies_to: string
          created_at: string
          id: string
          min_hours_before: number
          refund_percent: number
          updated_at: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          id?: string
          min_hours_before: number
          refund_percent: number
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          id?: string
          min_hours_before?: number
          refund_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      court_type_amenities: {
        Row: {
          amenity_id: string
          court_type_id: string
        }
        Insert: {
          amenity_id: string
          court_type_id: string
        }
        Update: {
          amenity_id?: string
          court_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_type_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_type_amenities_court_type_id_fkey"
            columns: ["court_type_id"]
            isOneToOne: false
            referencedRelation: "court_types"
            referencedColumns: ["id"]
          },
        ]
      }
      court_type_images: {
        Row: {
          court_type_id: string
          created_at: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          court_type_id: string
          created_at?: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          court_type_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_type_images_court_type_id_fkey"
            columns: ["court_type_id"]
            isOneToOne: false
            referencedRelation: "court_types"
            referencedColumns: ["id"]
          },
        ]
      }
      court_type_rules: {
        Row: {
          court_type_id: string
          created_at: string
          id: string
          rule: string
          sort_order: number
        }
        Insert: {
          court_type_id: string
          created_at?: string
          id?: string
          rule: string
          sort_order?: number
        }
        Update: {
          court_type_id?: string
          created_at?: string
          id?: string
          rule?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "court_type_rules_court_type_id_fkey"
            columns: ["court_type_id"]
            isOneToOne: false
            referencedRelation: "court_types"
            referencedColumns: ["id"]
          },
        ]
      }
      court_type_slot_options: {
        Row: {
          court_type_id: string
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          price: number
        }
        Insert: {
          court_type_id: string
          created_at?: string
          duration_minutes: number
          id?: string
          is_active?: boolean
          price: number
        }
        Update: {
          court_type_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "court_type_slot_options_court_type_id_fkey"
            columns: ["court_type_id"]
            isOneToOne: false
            referencedRelation: "court_types"
            referencedColumns: ["id"]
          },
        ]
      }
      court_types: {
        Row: {
          created_at: string
          description: string | null
          has_ac: boolean
          id: string
          is_active: boolean
          is_indoor: boolean
          max_players: number
          name: string
          slug: string
          sort_order: number
          sport_id: string
          surface_type: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          has_ac: boolean
          id?: string
          is_active?: boolean
          is_indoor: boolean
          max_players?: number
          name: string
          slug: string
          sort_order?: number
          sport_id: string
          surface_type: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          has_ac?: boolean
          id?: string
          is_active?: boolean
          is_indoor?: boolean
          max_players?: number
          name?: string
          slug?: string
          sort_order?: number
          sport_id?: string
          surface_type?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_types_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_types_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          court_type_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          venue_id: string
        }
        Insert: {
          court_type_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          venue_id: string
        }
        Update: {
          court_type_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_court_type_venue_fk"
            columns: ["court_type_id", "venue_id"]
            isOneToOne: false
            referencedRelation: "court_types"
            referencedColumns: ["id", "venue_id"]
          },
          {
            foreignKeyName: "facilities_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays_and_closures: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          facility_id: string | null
          id: string
          reason: string
          start_time: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          facility_id?: string | null
          id?: string
          reason: string
          start_time?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          facility_id?: string | null
          id?: string
          reason?: string
          start_time?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holidays_and_closures_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_and_closures_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      home_banners: {
        Row: {
          badge: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          placement: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
          title_accent: string | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          placement: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          title_accent?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          title_accent?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          id: string
          kind: string
          link: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          id?: string
          kind: string
          link?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          id?: string
          kind?: string
          link?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_hours: {
        Row: {
          close_time: string
          created_at: string | null
          day_of_week: number
          id: string
          open_time: string
          venue_id: string | null
        }
        Insert: {
          close_time: string
          created_at?: string | null
          day_of_week: number
          id?: string
          open_time: string
          venue_id?: string | null
        }
        Update: {
          close_time?: string
          created_at?: string | null
          day_of_week?: number
          id?: string
          open_time?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          preferred_sports: string[]
          referral_bonus_paid: boolean
          referral_code: string
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id: string
          phone?: string | null
          preferred_sports?: string[]
          referral_bonus_paid?: boolean
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          preferred_sports?: string[]
          referral_bonus_paid?: boolean
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_settings: {
        Row: {
          first_booking_bonus_points: number
          id: boolean
          signup_bonus_points: number
          updated_at: string
        }
        Insert: {
          first_booking_bonus_points?: number
          id?: boolean
          signup_bonus_points?: number
          updated_at?: string
        }
        Update: {
          first_booking_bonus_points?: number
          id?: boolean
          signup_bonus_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      sports: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          booking_window_days: number
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          timezone: string | null
        }
        Insert: {
          address?: string | null
          booking_window_days?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          timezone?: string | null
        }
        Update: {
          address?: string | null
          booking_window_days?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          timezone?: string | null
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          court_type_id: string
          created_at: string
          created_by: string | null
          daily_end_time: string
          daily_start_time: string
          description: string | null
          ends_on: string
          entry_fee: number
          format: string | null
          id: string
          match_type: string
          registration_closes_at: string
          starts_on: string
          status: string
          team_capacity: number
          team_size_label: string | null
          title: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          court_type_id: string
          created_at?: string
          created_by?: string | null
          daily_end_time: string
          daily_start_time: string
          description?: string | null
          ends_on: string
          entry_fee: number
          format?: string | null
          id?: string
          match_type: string
          registration_closes_at: string
          starts_on: string
          status?: string
          team_capacity: number
          team_size_label?: string | null
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          court_type_id?: string
          created_at?: string
          created_by?: string | null
          daily_end_time?: string
          daily_start_time?: string
          description?: string | null
          ends_on?: string
          entry_fee?: number
          format?: string | null
          id?: string
          match_type?: string
          registration_closes_at?: string
          starts_on?: string
          status?: string
          team_capacity?: number
          team_size_label?: string | null
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_court_type_venue_fk"
            columns: ["court_type_id", "venue_id"]
            isOneToOne: false
            referencedRelation: "court_types"
            referencedColumns: ["id", "venue_id"]
          },
          {
            foreignKeyName: "tournaments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_images: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          tournament_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          tournament_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          tournament_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_images_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_sections: {
        Row: {
          body: string
          created_at: string
          id: string
          sort_order: number
          title: string
          tournament_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          tournament_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_sections_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          amount_paid: number
          captain_name: string
          contact_email: string | null
          contact_phone: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          team_name: string
          tournament_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          captain_name: string
          contact_email?: string | null
          contact_phone: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          team_name: string
          tournament_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          captain_name?: string
          contact_email?: string | null
          contact_phone?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          team_name?: string
          tournament_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          daily_end_time: string
          daily_start_time: string
          description: string | null
          ends_on: string
          entry_fee: number | null
          fee_unit: string
          format: string | null
          id: string
          max_tickets_per_order: number
          registration_closes_at: string
          sport_id: string | null
          starts_on: string
          status: string
          ticket_capacity: number
          title: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          daily_end_time: string
          daily_start_time: string
          description?: string | null
          ends_on: string
          entry_fee?: number | null
          fee_unit?: string
          format?: string | null
          id?: string
          max_tickets_per_order?: number
          registration_closes_at: string
          sport_id?: string | null
          starts_on: string
          status?: string
          ticket_capacity: number
          title: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          daily_end_time?: string
          daily_start_time?: string
          description?: string | null
          ends_on?: string
          entry_fee?: number | null
          fee_unit?: string
          format?: string | null
          id?: string
          max_tickets_per_order?: number
          registration_closes_at?: string
          sport_id?: string | null
          starts_on?: string
          status?: string
          ticket_capacity?: number
          title?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      event_images: {
        Row: {
          created_at: string
          event_id: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_images_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sections: {
        Row: {
          body: string
          created_at: string
          event_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_orders: {
        Row: {
          amount_paid: number
          attendee_name: string
          contact_email: string | null
          contact_phone: string
          created_at: string
          event_id: string
          expires_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          tickets: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          attendee_name: string
          contact_email?: string | null
          contact_phone: string
          created_at?: string
          event_id: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          tickets: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          attendee_name?: string
          contact_email?: string | null
          contact_phone?: string
          created_at?: string
          event_id?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          tickets?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          balance_after: number
          booking_id: string | null
          created_at: string
          id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          balance_after: number
          booking_id?: string | null
          created_at?: string
          id?: string
          points: number
          reason: string
          user_id: string
        }
        Update: {
          balance_after?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_team_members: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          phone: string
          role: string
        }[]
      }
      auth_user_id_by_email: { Args: { p_email: string }; Returns: string }
      auth_user_id_by_phone: { Args: { p_phone: string }; Returns: string }
      mark_notifications_read: {
        Args: { p_ids?: string[]; p_user_id: string }
        Returns: number
      }
      user_notifications: {
        Args: { p_before?: string; p_limit?: number; p_user_id: string }
        Returns: {
          body: string
          booking_id: string
          created_at: string
          id: string
          is_broadcast: boolean
          is_read: boolean
          kind: string
          link: string
          title: string
        }[]
      }
      user_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      wallet_adjust: {
        Args: { p_booking_id?: string | null; p_points: number; p_reason: string; p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      booking_status: "PENDING" | "CONFIRMED" | "CANCELLED"
      payment_status: "UNPAID" | "PAID" | "REFUNDED"
      user_role: "USER" | "ADMIN" | "STAFF"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: ["PENDING", "CONFIRMED", "CANCELLED"],
      payment_status: ["UNPAID", "PAID", "REFUNDED"],
      user_role: ["USER", "ADMIN", "STAFF"],
    },
  },
} as const
