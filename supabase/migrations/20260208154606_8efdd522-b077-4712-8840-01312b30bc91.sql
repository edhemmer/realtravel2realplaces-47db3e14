-- Patch 2.1.26: Extend engagements table for rich stop details and origin tracking

-- Add origin column to track manual vs parsed stops
ALTER TABLE public.engagements
ADD COLUMN origin text NOT NULL DEFAULT 'manual';

-- Add structured address field for better Maps linking
ALTER TABLE public.engagements
ADD COLUMN address text;

-- Add store/location number for retail/business stops
ALTER TABLE public.engagements
ADD COLUMN store_number text;

-- Create stop_reminders table for 1-hour pre-stop reminders
CREATE TABLE public.stop_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_stop_reminders_engagement ON public.stop_reminders(engagement_id);
CREATE INDEX idx_stop_reminders_user ON public.stop_reminders(user_id);
CREATE INDEX idx_stop_reminders_datetime ON public.stop_reminders(reminder_datetime) WHERE reminder_sent = false;
CREATE INDEX idx_engagements_origin ON public.engagements(origin);

-- Enable RLS on stop_reminders
ALTER TABLE public.stop_reminders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own stop reminders
CREATE POLICY "Users can view their own stop reminders"
ON public.stop_reminders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create reminders for trips they can write to
CREATE POLICY "Users can create stop reminders for their trips"
ON public.stop_reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id AND user_can_write_trip(trip_id));

-- Users can update their own reminders
CREATE POLICY "Users can update their own stop reminders"
ON public.stop_reminders
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete their own stop reminders"
ON public.stop_reminders
FOR DELETE
USING (auth.uid() = user_id);

-- Add comment for origin column
COMMENT ON COLUMN public.engagements.origin IS 'Origin of the stop: manual (user-created) or parsed (bulk import)';
COMMENT ON COLUMN public.engagements.address IS 'Full address string for Maps linking';
COMMENT ON COLUMN public.engagements.store_number IS 'Store or location number for retail/business stops';