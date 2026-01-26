-- Create enum types
CREATE TYPE public.trip_type AS ENUM ('business', 'personal', 'mixed');
CREATE TYPE public.booking_type AS ENUM ('flight', 'stay', 'car_rental', 'activity');
CREATE TYPE public.stay_type AS ENUM ('hotel', 'airbnb', 'vrbo', 'other');
CREATE TYPE public.expense_category AS ENUM ('meals', 'transport', 'activity', 'shopping', 'parking', 'other');
CREATE TYPE public.parking_type AS ENUM ('airport', 'beach', 'city_garage', 'hotel', 'other');
CREATE TYPE public.parking_billing AS ENUM ('hourly', 'daily', 'per_trip', 'other');

-- Trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trip_type trip_type NOT NULL DEFAULT 'personal',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  booking_type booking_type NOT NULL,
  vendor_name TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  address TEXT,
  confirmation_number TEXT,
  total_cost DECIMAL(10,2) DEFAULT 0,
  my_share DECIMAL(10,2) DEFAULT 0,
  link_url TEXT,
  notes TEXT,
  -- Flight specific
  passenger_name TEXT,
  airline TEXT,
  tsa_precheck_number TEXT,
  frequent_flyer_number TEXT,
  -- Stay specific
  stay_type stay_type,
  property_name TEXT,
  -- Car rental specific
  rental_company TEXT,
  pickup_location TEXT,
  return_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category expense_category NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  my_share DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parking table
CREATE TABLE public.parking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  parking_type parking_type NOT NULL,
  label TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  billing_type parking_billing NOT NULL DEFAULT 'daily',
  address TEXT,
  level_section_space TEXT,
  total_cost DECIMAL(10,2) DEFAULT 0,
  my_share DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Packing list items
CREATE TABLE public.packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_packed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Companions table
CREATE TABLE public.companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trip notes and safety info
CREATE TABLE public.trip_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  general_notes TEXT,
  emergency_numbers TEXT,
  important_links TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles for storing user preferences
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  default_tsa_precheck TEXT,
  default_frequent_flyer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips" ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips" ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips" ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for bookings (via trip ownership)
CREATE POLICY "Users can view bookings for their trips" ON public.bookings FOR SELECT USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = bookings.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can create bookings for their trips" ON public.bookings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = bookings.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can update bookings for their trips" ON public.bookings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = bookings.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can delete bookings for their trips" ON public.bookings FOR DELETE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = bookings.trip_id AND trips.user_id = auth.uid()));

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses for their trips" ON public.expenses FOR SELECT USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = expenses.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can create expenses for their trips" ON public.expenses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = expenses.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can update expenses for their trips" ON public.expenses FOR UPDATE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = expenses.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can delete expenses for their trips" ON public.expenses FOR DELETE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = expenses.trip_id AND trips.user_id = auth.uid()));

-- RLS Policies for parking
CREATE POLICY "Users can view parking for their trips" ON public.parking FOR SELECT USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = parking.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can create parking for their trips" ON public.parking FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = parking.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can update parking for their trips" ON public.parking FOR UPDATE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = parking.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can delete parking for their trips" ON public.parking FOR DELETE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = parking.trip_id AND trips.user_id = auth.uid()));

-- RLS Policies for packing items
CREATE POLICY "Users can view packing items for their trips" ON public.packing_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = packing_items.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can create packing items for their trips" ON public.packing_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = packing_items.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can update packing items for their trips" ON public.packing_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = packing_items.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can delete packing items for their trips" ON public.packing_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = packing_items.trip_id AND trips.user_id = auth.uid()));

-- RLS Policies for companions
CREATE POLICY "Users can view companions for their trips" ON public.companions FOR SELECT USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = companions.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can create companions for their trips" ON public.companions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = companions.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can update companions for their trips" ON public.companions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = companions.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can delete companions for their trips" ON public.companions FOR DELETE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = companions.trip_id AND trips.user_id = auth.uid()));

-- RLS Policies for trip notes
CREATE POLICY "Users can view notes for their trips" ON public.trip_notes FOR SELECT USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_notes.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can create notes for their trips" ON public.trip_notes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_notes.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can update notes for their trips" ON public.trip_notes FOR UPDATE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_notes.trip_id AND trips.user_id = auth.uid()));
CREATE POLICY "Users can delete notes for their trips" ON public.trip_notes FOR DELETE USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_notes.trip_id AND trips.user_id = auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_dates ON public.trips(start_date, end_date);
CREATE INDEX idx_bookings_trip_id ON public.bookings(trip_id);
CREATE INDEX idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX idx_parking_trip_id ON public.parking(trip_id);
CREATE INDEX idx_packing_items_trip_id ON public.packing_items(trip_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parking_updated_at BEFORE UPDATE ON public.parking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trip_notes_updated_at BEFORE UPDATE ON public.trip_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();