-- Patch 2.3.0: Engagement Backend Foundation
-- Create engagements table for Business-tier Stops functionality

-- Create engagements table
CREATE TABLE public.engagements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by trip and ordering
CREATE INDEX idx_engagements_trip_date_time ON public.engagements (trip_id, date, start_time);

-- Enable Row Level Security
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for engagements (following existing patterns)

-- Block anonymous access
CREATE POLICY "Block anonymous engagements access"
ON public.engagements
FOR SELECT
USING (false);

-- Users can view engagements for accessible trips
CREATE POLICY "Users can view engagements for accessible trips"
ON public.engagements
FOR SELECT
USING (user_has_trip_access(trip_id));

-- Users can create engagements for owned writable trips
CREATE POLICY "Users can create engagements for owned trips"
ON public.engagements
FOR INSERT
WITH CHECK (user_can_write_trip(trip_id));

-- Users can update engagements for owned writable trips
CREATE POLICY "Users can update engagements for owned trips"
ON public.engagements
FOR UPDATE
USING (user_can_write_trip(trip_id));

-- Users can delete engagements for owned writable trips
CREATE POLICY "Users can delete engagements for owned trips"
ON public.engagements
FOR DELETE
USING (user_can_write_trip(trip_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_engagements_updated_at
BEFORE UPDATE ON public.engagements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add engagement_id to expenses table (nullable, non-enforced)
ALTER TABLE public.expenses
ADD COLUMN engagement_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL;

-- Create index for expense-engagement lookups
CREATE INDEX idx_expenses_engagement ON public.expenses (engagement_id) WHERE engagement_id IS NOT NULL;