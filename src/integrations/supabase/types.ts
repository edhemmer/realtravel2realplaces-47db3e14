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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      booking_companions: {
        Row: {
          booking_id: string
          companion_id: string
          created_at: string
          id: string
        }
        Insert: {
          booking_id: string
          companion_id: string
          created_at?: string
          id?: string
        }
        Update: {
          booking_id?: string
          companion_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_companions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_companions_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          activity_source: string | null
          address: string | null
          advance_recommended: boolean | null
          airline: string | null
          arrival_airport_code: string | null
          arrival_airport_name: string | null
          booking_pattern: string | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          booking_url: string | null
          confirmation_number: string | null
          created_at: string
          departure_airport_code: string | null
          departure_airport_name: string | null
          end_datetime: string | null
          frequent_flyer_number: string | null
          from_location: string | null
          id: string
          link_url: string | null
          location_summary: string | null
          my_share: number | null
          notes: string | null
          operator: string | null
          passenger_name: string | null
          pickup_location: string | null
          property_name: string | null
          rental_company: string | null
          return_location: string | null
          start_datetime: string
          stay_type: Database["public"]["Enums"]["stay_type"] | null
          ticket_required: boolean | null
          tickets_purchased: boolean | null
          to_location: string | null
          total_cost: number | null
          transport_mode: Database["public"]["Enums"]["transport_mode"] | null
          trip_id: string
          tsa_precheck_number: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          activity_source?: string | null
          address?: string | null
          advance_recommended?: boolean | null
          airline?: string | null
          arrival_airport_code?: string | null
          arrival_airport_name?: string | null
          booking_pattern?: string | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          booking_url?: string | null
          confirmation_number?: string | null
          created_at?: string
          departure_airport_code?: string | null
          departure_airport_name?: string | null
          end_datetime?: string | null
          frequent_flyer_number?: string | null
          from_location?: string | null
          id?: string
          link_url?: string | null
          location_summary?: string | null
          my_share?: number | null
          notes?: string | null
          operator?: string | null
          passenger_name?: string | null
          pickup_location?: string | null
          property_name?: string | null
          rental_company?: string | null
          return_location?: string | null
          start_datetime: string
          stay_type?: Database["public"]["Enums"]["stay_type"] | null
          ticket_required?: boolean | null
          tickets_purchased?: boolean | null
          to_location?: string | null
          total_cost?: number | null
          transport_mode?: Database["public"]["Enums"]["transport_mode"] | null
          trip_id: string
          tsa_precheck_number?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          activity_source?: string | null
          address?: string | null
          advance_recommended?: boolean | null
          airline?: string | null
          arrival_airport_code?: string | null
          arrival_airport_name?: string | null
          booking_pattern?: string | null
          booking_type?: Database["public"]["Enums"]["booking_type"]
          booking_url?: string | null
          confirmation_number?: string | null
          created_at?: string
          departure_airport_code?: string | null
          departure_airport_name?: string | null
          end_datetime?: string | null
          frequent_flyer_number?: string | null
          from_location?: string | null
          id?: string
          link_url?: string | null
          location_summary?: string | null
          my_share?: number | null
          notes?: string | null
          operator?: string | null
          passenger_name?: string | null
          pickup_location?: string | null
          property_name?: string | null
          rental_company?: string | null
          return_location?: string | null
          start_datetime?: string
          stay_type?: Database["public"]["Enums"]["stay_type"] | null
          ticket_required?: boolean | null
          tickets_purchased?: boolean | null
          to_location?: string | null
          total_cost?: number | null
          transport_mode?: Database["public"]["Enums"]["transport_mode"] | null
          trip_id?: string
          tsa_precheck_number?: string | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      companions: {
        Row: {
          airline: string | null
          created_at: string
          email: string | null
          flight_number: string | null
          frequent_flyer_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          portion_owed: number | null
          seat_number: string | null
          trip_id: string
          tsa_precheck_number: string | null
          tsa_reviewed: boolean
        }
        Insert: {
          airline?: string | null
          created_at?: string
          email?: string | null
          flight_number?: string | null
          frequent_flyer_number?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          portion_owed?: number | null
          seat_number?: string | null
          trip_id: string
          tsa_precheck_number?: string | null
          tsa_reviewed?: boolean
        }
        Update: {
          airline?: string | null
          created_at?: string
          email?: string | null
          flight_number?: string | null
          frequent_flyer_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          portion_owed?: number | null
          seat_number?: string | null
          trip_id?: string
          tsa_precheck_number?: string | null
          tsa_reviewed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "companions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          address: string | null
          created_at: string
          date: string
          end_time: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          origin: string
          reference_id: string | null
          start_time: string
          store_number: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          origin?: string
          reference_id?: string | null
          start_time: string
          store_number?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          origin?: string
          reference_id?: string | null
          start_time?: string
          store_number?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string | null
          engagement_id: string | null
          expense_purpose: string | null
          id: string
          my_share: number | null
          notes: string | null
          receipt_url: string | null
          sub_category:
            | Database["public"]["Enums"]["expense_sub_category"]
            | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date: string
          description?: string | null
          engagement_id?: string | null
          expense_purpose?: string | null
          id?: string
          my_share?: number | null
          notes?: string | null
          receipt_url?: string | null
          sub_category?:
            | Database["public"]["Enums"]["expense_sub_category"]
            | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string | null
          engagement_id?: string | null
          expense_purpose?: string | null
          id?: string
          my_share?: number | null
          notes?: string | null
          receipt_url?: string | null
          sub_category?:
            | Database["public"]["Enums"]["expense_sub_category"]
            | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_custom: boolean
          is_packed: boolean
          item_name: string
          quantity: number
          trip_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_custom?: boolean
          is_packed?: boolean
          item_name: string
          quantity?: number
          trip_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_custom?: boolean
          is_packed?: boolean
          item_name?: string
          quantity?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      parking: {
        Row: {
          address: string | null
          billing_type: Database["public"]["Enums"]["parking_billing"]
          created_at: string
          end_datetime: string | null
          id: string
          label: string
          level_section_space: string | null
          my_share: number | null
          parking_type: Database["public"]["Enums"]["parking_type"]
          start_datetime: string
          total_cost: number | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          billing_type?: Database["public"]["Enums"]["parking_billing"]
          created_at?: string
          end_datetime?: string | null
          id?: string
          label: string
          level_section_space?: string | null
          my_share?: number | null
          parking_type: Database["public"]["Enums"]["parking_type"]
          start_datetime: string
          total_cost?: number | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          billing_type?: Database["public"]["Enums"]["parking_billing"]
          created_at?: string
          end_datetime?: string | null
          id?: string
          label?: string
          level_section_space?: string | null
          my_share?: number | null
          parking_type?: Database["public"]["Enums"]["parking_type"]
          start_datetime?: string
          total_cost?: number | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_frequent_flyer: string | null
          default_tsa_precheck: string | null
          deleted_at: string | null
          display_name: string | null
          distance_unit: string | null
          first_name: string | null
          has_completed_onboarding: boolean
          id: string
          is_deleted: boolean
          last_name: string | null
          lifetime_trip_count: number
          preferred_currency: string | null
          preferred_datetime_format: string | null
          preferred_home_airport: string | null
          subscription_started_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          temperature_unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_frequent_flyer?: string | null
          default_tsa_precheck?: string | null
          deleted_at?: string | null
          display_name?: string | null
          distance_unit?: string | null
          first_name?: string | null
          has_completed_onboarding?: boolean
          id?: string
          is_deleted?: boolean
          last_name?: string | null
          lifetime_trip_count?: number
          preferred_currency?: string | null
          preferred_datetime_format?: string | null
          preferred_home_airport?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          temperature_unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_frequent_flyer?: string | null
          default_tsa_precheck?: string | null
          deleted_at?: string | null
          display_name?: string | null
          distance_unit?: string | null
          first_name?: string | null
          has_completed_onboarding?: boolean
          id?: string
          is_deleted?: boolean
          last_name?: string | null
          lifetime_trip_count?: number
          preferred_currency?: string | null
          preferred_datetime_format?: string | null
          preferred_home_airport?: string | null
          subscription_started_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          temperature_unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stop_reminders: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          reminder_datetime: string
          reminder_sent: boolean
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          reminder_datetime: string
          reminder_sent?: boolean
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          reminder_datetime?: string
          reminder_sent?: boolean
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stop_reminders_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stop_reminders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          app_version: string | null
          created_at: string
          email: string
          id: string
          message: string
          page_path: string | null
          status: string
          subject: string
          trip_id: string | null
          updated_at: string
          user_id: string
          user_plan: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          page_path?: string | null
          status?: string
          subject: string
          trip_id?: string | null
          updated_at?: string
          user_id: string
          user_plan?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          page_path?: string | null
          status?: string
          subject?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string
          user_plan?: string | null
        }
        Relationships: []
      }
      ticket_reminders: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          reminder_date: string
          reminder_sent: boolean | null
          trip_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          reminder_date: string
          reminder_sent?: boolean | null
          trip_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          reminder_date?: string
          reminder_sent?: boolean | null
          trip_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_reminders_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_events: {
        Row: {
          created_at: string
          event_datetime: string
          event_type: Database["public"]["Enums"]["trip_event_type"]
          id: string
          location_summary: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["event_source_type"]
          title: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_datetime: string
          event_type: Database["public"]["Enums"]["trip_event_type"]
          id?: string
          location_summary?: string | null
          source_id: string
          source_type: Database["public"]["Enums"]["event_source_type"]
          title?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_datetime?: string
          event_type?: Database["public"]["Enums"]["trip_event_type"]
          id?: string
          location_summary?: string | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["event_source_type"]
          title?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invites: {
        Row: {
          accepted_by_user_id: string | null
          created_at: string
          expires_at: string
          id: string
          invitee_email: string
          inviter_user_id: string
          role: Database["public"]["Enums"]["trip_member_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token_hash: string
          trip_id: string
        }
        Insert: {
          accepted_by_user_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          invitee_email: string
          inviter_user_id: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token_hash: string
          trip_id: string
        }
        Update: {
          accepted_by_user_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          inviter_user_id?: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token_hash?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_invites_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["trip_member_role"]
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["trip_member_role"]
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["trip_member_role"]
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_notes: {
        Row: {
          created_at: string
          emergency_numbers: string | null
          general_notes: string | null
          id: string
          important_links: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emergency_numbers?: string | null
          general_notes?: string | null
          id?: string
          important_links?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emergency_numbers?: string | null
          general_notes?: string | null
          id?: string
          important_links?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_shares: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          permission: string
          share_token: string | null
          shared_with_email: string | null
          shared_with_user_id: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          permission?: string
          share_token?: string | null
          shared_with_email?: string | null
          shared_with_user_id?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          permission?: string
          share_token?: string | null
          shared_with_email?: string | null
          shared_with_user_id?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_shares_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          destination_address: string | null
          destination_city: string
          destination_country: string
          destination_state: string | null
          destination_type: Database["public"]["Enums"]["destination_type"]
          end_date: string
          estimated_miles: number | null
          id: string
          name: string
          notes: string | null
          origin_address: string | null
          start_date: string
          transportation_mode: Database["public"]["Enums"]["transportation_mode"]
          trip_state: Database["public"]["Enums"]["trip_state"]
          trip_type: Database["public"]["Enums"]["trip_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_address?: string | null
          destination_city: string
          destination_country: string
          destination_state?: string | null
          destination_type?: Database["public"]["Enums"]["destination_type"]
          end_date: string
          estimated_miles?: number | null
          id?: string
          name: string
          notes?: string | null
          origin_address?: string | null
          start_date: string
          transportation_mode?: Database["public"]["Enums"]["transportation_mode"]
          trip_state?: Database["public"]["Enums"]["trip_state"]
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_address?: string | null
          destination_city?: string
          destination_country?: string
          destination_state?: string | null
          destination_type?: Database["public"]["Enums"]["destination_type"]
          end_date?: string
          estimated_miles?: number | null
          id?: string
          name?: string
          notes?: string | null
          origin_address?: string | null
          start_date?: string
          transportation_mode?: Database["public"]["Enums"]["transportation_mode"]
          trip_state?: Database["public"]["Enums"]["trip_state"]
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upgrade_intents: {
        Row: {
          created_at: string
          current_plan: string
          entry_point: string
          id: string
          target_plan: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_plan: string
          entry_point: string
          id?: string
          target_plan: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_plan?: string
          entry_point?: string
          id?: string
          target_plan?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_trip_invite: { Args: { p_token: string }; Returns: string }
      admin_delete_user: { Args: { p_user_id: string }; Returns: Json }
      admin_get_all_users: {
        Args: never
        Returns: {
          created_at: string
          current_trip_count: number
          email: string
          first_name: string
          last_name: string
          last_sign_in_at: string
          lifetime_trip_count: number
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          user_id: string
        }[]
      }
      admin_update_user_name: {
        Args: { p_first_name: string; p_last_name: string; p_user_id: string }
        Returns: boolean
      }
      admin_update_user_tier: {
        Args: {
          p_new_tier: Database["public"]["Enums"]["subscription_tier"]
          p_user_id: string
        }
        Returns: boolean
      }
      count_user_active_trips: { Args: { p_user_id: string }; Returns: number }
      create_trip_invite: {
        Args: {
          p_invitee_email: string
          p_trip_id: string
          p_ttl_days?: number
        }
        Returns: {
          invite_id: string
          invite_token: string
        }[]
      }
      get_bookings_safe: {
        Args: { p_trip_id: string }
        Returns: {
          activity_source: string
          address: string
          advance_recommended: boolean
          airline: string
          arrival_airport_code: string
          arrival_airport_name: string
          booking_pattern: string
          booking_type: string
          booking_url: string
          confirmation_number: string
          created_at: string
          departure_airport_code: string
          departure_airport_name: string
          end_datetime: string
          frequent_flyer_number: string
          from_location: string
          id: string
          link_url: string
          location_summary: string
          my_share: number
          notes: string
          operator: string
          passenger_name: string
          pickup_location: string
          property_name: string
          rental_company: string
          return_location: string
          start_datetime: string
          stay_type: string
          ticket_required: boolean
          tickets_purchased: boolean
          to_location: string
          total_cost: number
          transport_mode: string
          trip_id: string
          tsa_precheck_number: string
          updated_at: string
          vendor_name: string
        }[]
      }
      get_companions_safe: {
        Args: { p_trip_id: string }
        Returns: {
          airline: string
          created_at: string
          email: string
          flight_number: string
          frequent_flyer_number: string
          id: string
          name: string
          notes: string
          phone: string
          portion_owed: number
          seat_number: string
          trip_id: string
          tsa_precheck_number: string
          tsa_reviewed: boolean
        }[]
      }
      get_trip_shares_safe: {
        Args: { p_trip_id: string }
        Returns: {
          accepted_at: string
          created_at: string
          id: string
          permission: string
          share_token: string
          shared_with_email: string
          shared_with_user_id: string
          trip_id: string
          updated_at: string
        }[]
      }
      get_user_subscription_tier: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      get_user_trip_limit: { Args: { p_user_id: string }; Returns: number }
      guest_can_write_trip: { Args: { p_trip_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_trip_guest: { Args: { p_trip_id: string }; Returns: boolean }
      is_trip_owner_member: { Args: { p_trip_id: string }; Returns: boolean }
      revoke_trip_invite: { Args: { p_invite_id: string }; Returns: boolean }
      run_trip_lifecycle_enforcement: { Args: never; Returns: Json }
      trip_is_writable: { Args: { p_trip_id: string }; Returns: boolean }
      trip_owner_is_pro: { Args: { p_trip_id: string }; Returns: boolean }
      user_can_create_trip: { Args: { p_user_id: string }; Returns: boolean }
      user_can_write_trip: { Args: { p_trip_id: string }; Returns: boolean }
      user_has_booking_access: {
        Args: { p_booking_id: string }
        Returns: boolean
      }
      user_has_trip_access: { Args: { trip_id: string }; Returns: boolean }
      user_is_pro: { Args: { p_user_id: string }; Returns: boolean }
      user_owns_booking: { Args: { p_booking_id: string }; Returns: boolean }
      user_owns_trip: { Args: { trip_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      booking_type: "flight" | "stay" | "car_rental" | "activity" | "transport"
      destination_type: "beach" | "mountain" | "city" | "unspecified"
      event_source_type: "booking" | "parking" | "engagement"
      expense_category:
        | "meals"
        | "transport"
        | "activity"
        | "shopping"
        | "parking"
        | "other"
      expense_sub_category:
        | "breakfast"
        | "lunch"
        | "dinner"
        | "snacks"
        | "coffee"
        | "groceries"
        | "uber"
        | "taxi"
        | "gas"
        | "tolls"
        | "public_transit"
        | "parking_expense"
        | "tours"
        | "entertainment"
        | "tickets"
        | "sports"
        | "souvenirs"
        | "clothing"
        | "gifts"
        | "tips"
        | "fees"
        | "insurance"
        | "miscellaneous"
        | "alcohol"
        | "beverages"
        | "rental_car"
      invite_status: "pending" | "accepted" | "expired" | "revoked"
      parking_billing: "hourly" | "daily" | "per_trip" | "other"
      parking_type: "airport" | "beach" | "city_garage" | "hotel" | "other"
      stay_type: "hotel" | "airbnb" | "vrbo" | "other"
      subscription_tier: "free" | "pro" | "business"
      transport_mode: "train" | "bus" | "metro" | "ferry" | "other"
      transportation_mode: "flight" | "drive" | "unspecified"
      trip_event_type:
        | "flight_departure"
        | "hotel_checkin"
        | "hotel_checkout"
        | "rental_pickup"
        | "rental_return"
        | "parking_expiration"
        | "engagement_start"
      trip_member_role: "owner" | "guest"
      trip_state: "active" | "locked" | "closed"
      trip_type: "business" | "personal" | "mixed"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
      booking_type: ["flight", "stay", "car_rental", "activity", "transport"],
      destination_type: ["beach", "mountain", "city", "unspecified"],
      event_source_type: ["booking", "parking", "engagement"],
      expense_category: [
        "meals",
        "transport",
        "activity",
        "shopping",
        "parking",
        "other",
      ],
      expense_sub_category: [
        "breakfast",
        "lunch",
        "dinner",
        "snacks",
        "coffee",
        "groceries",
        "uber",
        "taxi",
        "gas",
        "tolls",
        "public_transit",
        "parking_expense",
        "tours",
        "entertainment",
        "tickets",
        "sports",
        "souvenirs",
        "clothing",
        "gifts",
        "tips",
        "fees",
        "insurance",
        "miscellaneous",
        "alcohol",
        "beverages",
        "rental_car",
      ],
      invite_status: ["pending", "accepted", "expired", "revoked"],
      parking_billing: ["hourly", "daily", "per_trip", "other"],
      parking_type: ["airport", "beach", "city_garage", "hotel", "other"],
      stay_type: ["hotel", "airbnb", "vrbo", "other"],
      subscription_tier: ["free", "pro", "business"],
      transport_mode: ["train", "bus", "metro", "ferry", "other"],
      transportation_mode: ["flight", "drive", "unspecified"],
      trip_event_type: [
        "flight_departure",
        "hotel_checkin",
        "hotel_checkout",
        "rental_pickup",
        "rental_return",
        "parking_expiration",
        "engagement_start",
      ],
      trip_member_role: ["owner", "guest"],
      trip_state: ["active", "locked", "closed"],
      trip_type: ["business", "personal", "mixed"],
    },
  },
} as const
