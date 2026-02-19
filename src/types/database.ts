export type TripType = 'business' | 'personal' | 'mixed';
export type BookingType = 'flight' | 'stay' | 'car_rental' | 'activity' | 'transport';
export type StayType = 'hotel' | 'airbnb' | 'vrbo' | 'other';
export type TransportModeType = 'train' | 'bus' | 'metro' | 'ferry' | 'other';
export type ExpenseCategory = 'meals' | 'transport' | 'activity' | 'shopping' | 'parking' | 'other';
export type ParkingType = 'airport' | 'beach' | 'city_garage' | 'hotel' | 'other';
export type ParkingBilling = 'hourly' | 'daily' | 'per_trip' | 'other';
export type ExpensePurpose = 'business' | 'personal';
export type TransportationMode = 'flight' | 'drive' | 'unspecified';
export type DestinationType = 'beach' | 'mountain' | 'city' | 'unspecified';
export type TripState = 'active' | 'locked' | 'closed';
export type ExpenseSubCategory = 
  'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'coffee' | 'groceries' | 'alcohol' | 'beverages' |
  'uber' | 'taxi' | 'gas' | 'tolls' | 'public_transit' | 'parking_expense' | 'rental_car' |
  'tours' | 'entertainment' | 'tickets' | 'sports' |
  'souvenirs' | 'clothing' | 'gifts' |
  'tips' | 'fees' | 'insurance' | 'miscellaneous';

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  destination_city: string;
  destination_state?: string;
  destination_country: string;
  start_date: string;
  end_date: string;
  trip_type: TripType;
  trip_state?: TripState;
  transportation_mode?: TransportationMode;
  destination_type?: DestinationType;
  origin_address?: string;
  destination_address?: string;
  estimated_miles?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  booking_type: BookingType;
  vendor_name: string;
  start_datetime: string;
  end_datetime?: string;
  address?: string;
  confirmation_number?: string;
  total_cost: number;
  my_share: number;
  link_url?: string;
  notes?: string;
  // Flight specific
  passenger_name?: string;
  airline?: string;
  tsa_precheck_number?: string;
  frequent_flyer_number?: string;
  departure_airport_code?: string;
  departure_airport_name?: string;
  arrival_airport_code?: string;
  arrival_airport_name?: string;
  // Stay specific
  stay_type?: StayType;
  property_name?: string;
  // Car rental specific
  rental_company?: string;
  pickup_location?: string;
  return_location?: string;
  // Activity specific (Patch 2.1.17)
  activity_source?: 'explore' | 'confirmation' | null;
  ticket_required?: boolean;
  advance_recommended?: boolean;
  booking_pattern?: 'first-come' | 'time-slot' | 'lottery' | 'unknown' | null;
  booking_url?: string;
  tickets_purchased?: boolean;
  location_summary?: string;
  // Transport specific (Patch 2.1.37)
  transport_mode?: TransportModeType;
  from_location?: string;
  to_location?: string;
  operator?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  date: string;
  category: ExpenseCategory;
  sub_category?: ExpenseSubCategory;
  description?: string;
  amount: number;
  my_share: number;
  currency?: string; // v4.4.0: Multi-currency support (default 'USD')
  converted_amount?: number | null; // v4.4.2: User-entered converted amount in home currency
  converted_currency?: string | null; // v4.4.2: The home currency it was converted to
  notes?: string;
  receipt_url?: string;
  expense_purpose?: ExpensePurpose; // v1.3.0: For mixed trips only
  engagement_id?: string | null; // Patch 2.3.8: Optional Stop assignment
  created_at: string;
  updated_at: string;
}

export interface Parking {
  id: string;
  trip_id: string;
  parking_type: ParkingType;
  label: string;
  start_datetime: string;
  end_datetime?: string;
  billing_type: ParkingBilling;
  address?: string;
  level_section_space?: string;
  total_cost: number;
  my_share: number;
  // v3.9.7: Local wall-time columns (source of truth for display)
  end_local_datetime?: string;
  end_timezone?: string;
  start_local_datetime?: string;
  created_at: string;
  updated_at: string;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  category: string;
  item_name: string;
  quantity: number;
  is_packed: boolean;
  is_custom: boolean; // v1.3.3: true for user-added items, false for AI-generated
  created_at: string;
}

export interface Companion {
  id: string;
  trip_id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  tsa_precheck_number?: string;
  frequent_flyer_number?: string;
  airline?: string;
  flight_number?: string;
  seat_number?: string;
  portion_owed?: number;
  tsa_reviewed?: boolean;
  created_at: string;
}

export interface TripNotes {
  id: string;
  trip_id: string;
  general_notes?: string;
  emergency_numbers?: string;
  important_links?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name?: string;
  default_tsa_precheck?: string;
  default_frequent_flyer?: string;
  // v2.0.0a: Subscription tier and lifetime trip count
  subscription_tier?: 'free' | 'pro';
  subscription_started_at?: string;
  lifetime_trip_count?: number;
  // v2.0.13: Travel preferences
  preferred_home_airport?: string;
  preferred_currency?: string;
  preferred_datetime_format?: string;
  created_at: string;
  updated_at: string;
}
