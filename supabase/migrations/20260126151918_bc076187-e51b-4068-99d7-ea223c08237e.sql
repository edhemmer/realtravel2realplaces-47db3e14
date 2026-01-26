-- Add destination_state column to trips table
ALTER TABLE public.trips 
ADD COLUMN destination_state TEXT;

-- Create expense_sub_category enum
CREATE TYPE public.expense_sub_category AS ENUM (
  'breakfast', 'lunch', 'dinner', 'snacks', 'coffee', 'groceries',
  'uber', 'taxi', 'gas', 'tolls', 'public_transit', 'parking_expense',
  'tours', 'entertainment', 'tickets', 'sports',
  'souvenirs', 'clothing', 'gifts',
  'tips', 'fees', 'insurance', 'miscellaneous'
);

-- Add sub_category column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN sub_category expense_sub_category;

-- Create trip_shares table for secure sharing
CREATE TABLE public.trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  shared_with_email TEXT,
  shared_with_user_id UUID,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trip_shares
ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Trip owners can manage shares
CREATE POLICY "Trip owners can manage shares"
ON public.trip_shares
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.trips 
    WHERE trips.id = trip_shares.trip_id 
    AND trips.user_id = auth.uid()
  )
);

-- Policy: Users can view shares sent to them
CREATE POLICY "Users can view their shares"
ON public.trip_shares
FOR SELECT
USING (
  shared_with_user_id = auth.uid() OR
  shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_trip_shares_trip_id ON public.trip_shares(trip_id);
CREATE INDEX idx_trip_shares_token ON public.trip_shares(share_token);
CREATE INDEX idx_trip_shares_email ON public.trip_shares(shared_with_email);
CREATE INDEX idx_trip_shares_user_id ON public.trip_shares(shared_with_user_id);

-- Update trips RLS to allow shared access
CREATE POLICY "Users can view shared trips"
ON public.trips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trip_shares
    WHERE trip_shares.trip_id = trips.id
    AND (
      trip_shares.shared_with_user_id = auth.uid() OR
      trip_shares.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND trip_shares.accepted_at IS NOT NULL
  )
);

-- Add trigger for updated_at on trip_shares
CREATE TRIGGER update_trip_shares_updated_at
BEFORE UPDATE ON public.trip_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();