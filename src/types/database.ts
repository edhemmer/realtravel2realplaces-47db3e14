export type TripType = 'business' | 'personal' | 'mixed';
export type BookingType = 'flight' | 'stay' | 'car_rental' | 'activity';
export type StayType = 'hotel' | 'airbnb' | 'vrbo' | 'other';
export type ExpenseCategory = 'meals' | 'transport' | 'activity' | 'shopping' | 'parking' | 'other';
export type ParkingType = 'airport' | 'beach' | 'city_garage' | 'hotel' | 'other';
export type ParkingBilling = 'hourly' | 'daily' | 'per_trip' | 'other';
export type TransportationMode = 'flight' | 'drive' | 'unspecified';
export type DestinationType = 'beach' | 'mountain' | 'city' | 'unspecified';
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
  // Stay specific
  stay_type?: StayType;
  property_name?: string;
  // Car rental specific
  rental_company?: string;
  pickup_location?: string;
  return_location?: string;
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
  notes?: string;
  receipt_url?: string;
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
  created_at: string;
  updated_at: string;
}
