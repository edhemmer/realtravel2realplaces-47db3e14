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
          address: string | null
          airline: string | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          confirmation_number: string | null
          created_at: string
          end_datetime: string | null
          frequent_flyer_number: string | null
          id: string
          link_url: string | null
          my_share: number | null
          notes: string | null
          passenger_name: string | null
          pickup_location: string | null
          property_name: string | null
          rental_company: string | null
          return_location: string | null
          start_datetime: string
          stay_type: Database["public"]["Enums"]["stay_type"] | null
          total_cost: number | null
          trip_id: string
          tsa_precheck_number: string | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          address?: string | null
          airline?: string | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          confirmation_number?: string | null
          created_at?: string
          end_datetime?: string | null
          frequent_flyer_number?: string | null
          id?: string
          link_url?: string | null
          my_share?: number | null
          notes?: string | null
          passenger_name?: string | null
          pickup_location?: string | null
          property_name?: string | null
          rental_company?: string | null
          return_location?: string | null
          start_datetime: string
          stay_type?: Database["public"]["Enums"]["stay_type"] | null
          total_cost?: number | null
          trip_id: string
          tsa_precheck_number?: string | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          address?: string | null
          airline?: string | null
          booking_type?: Database["public"]["Enums"]["booking_type"]
          confirmation_number?: string | null
          created_at?: string
          end_datetime?: string | null
          frequent_flyer_number?: string | null
          id?: string
          link_url?: string | null
          my_share?: number | null
          notes?: string | null
          passenger_name?: string | null
          pickup_location?: string | null
          property_name?: string | null
          rental_company?: string | null
          return_location?: string | null
          start_datetime?: string
          stay_type?: Database["public"]["Enums"]["stay_type"] | null
          total_cost?: number | null
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
          frequent_flyer_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          trip_id: string
          tsa_precheck_number: string | null
        }
        Insert: {
          airline?: string | null
          created_at?: string
          email?: string | null
          frequent_flyer_number?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          trip_id: string
          tsa_precheck_number?: string | null
        }
        Update: {
          airline?: string | null
          created_at?: string
          email?: string | null
          frequent_flyer_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          trip_id?: string
          tsa_precheck_number?: string | null
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
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string | null
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
          is_packed: boolean
          item_name: string
          quantity: number
          trip_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_packed?: boolean
          item_name: string
          quantity?: number
          trip_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
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
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_frequent_flyer?: string | null
          default_tsa_precheck?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_frequent_flyer?: string | null
          default_tsa_precheck?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          end_date: string
          estimated_miles: number | null
          id: string
          name: string
          notes: string | null
          origin_address: string | null
          start_date: string
          transportation_mode: Database["public"]["Enums"]["transportation_mode"]
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
          end_date: string
          estimated_miles?: number | null
          id?: string
          name: string
          notes?: string | null
          origin_address?: string | null
          start_date: string
          transportation_mode?: Database["public"]["Enums"]["transportation_mode"]
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
          end_date?: string
          estimated_miles?: number | null
          id?: string
          name?: string
          notes?: string | null
          origin_address?: string | null
          start_date?: string
          transportation_mode?: Database["public"]["Enums"]["transportation_mode"]
          trip_type?: Database["public"]["Enums"]["trip_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_has_booking_access: {
        Args: { p_booking_id: string }
        Returns: boolean
      }
      user_has_trip_access: { Args: { trip_id: string }; Returns: boolean }
      user_owns_booking: { Args: { p_booking_id: string }; Returns: boolean }
      user_owns_trip: { Args: { trip_id: string }; Returns: boolean }
    }
    Enums: {
      booking_type: "flight" | "stay" | "car_rental" | "activity"
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
      parking_billing: "hourly" | "daily" | "per_trip" | "other"
      parking_type: "airport" | "beach" | "city_garage" | "hotel" | "other"
      stay_type: "hotel" | "airbnb" | "vrbo" | "other"
      transportation_mode: "flight" | "drive" | "unspecified"
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
      booking_type: ["flight", "stay", "car_rental", "activity"],
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
      parking_billing: ["hourly", "daily", "per_trip", "other"],
      parking_type: ["airport", "beach", "city_garage", "hotel", "other"],
      stay_type: ["hotel", "airbnb", "vrbo", "other"],
      transportation_mode: ["flight", "drive", "unspecified"],
      trip_type: ["business", "personal", "mixed"],
    },
  },
} as const
