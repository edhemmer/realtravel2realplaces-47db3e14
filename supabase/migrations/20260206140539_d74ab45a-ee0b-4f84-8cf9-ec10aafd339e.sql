-- Patch 2.1.17: Add activity-specific fields to bookings table for Explore feature

-- Add new columns to bookings for activity/attraction tracking
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS activity_source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ticket_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_recommended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_pattern TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS booking_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tickets_purchased BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_summary TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.activity_source IS 'Source of activity: explore (from Explore feature), confirmation (from parsed confirmation), or null for other bookings';
COMMENT ON COLUMN public.bookings.ticket_required IS 'Whether tickets are required for this activity/attraction';
COMMENT ON COLUMN public.bookings.advance_recommended IS 'Whether advance booking is recommended';
COMMENT ON COLUMN public.bookings.booking_pattern IS 'Booking pattern: first-come, time-slot, lottery, or unknown';
COMMENT ON COLUMN public.bookings.booking_url IS 'Official booking URL for the activity/attraction';
COMMENT ON COLUMN public.bookings.tickets_purchased IS 'Whether tickets have been purchased for this activity';
COMMENT ON COLUMN public.bookings.location_summary IS 'Brief location summary (e.g., Near Kanab, AZ)';

-- Create ticket_reminders table for scheduled reminders
CREATE TABLE IF NOT EXISTS public.ticket_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ticket_reminders
ALTER TABLE public.ticket_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_reminders
CREATE POLICY "Users can view their own ticket reminders"
  ON public.ticket_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ticket reminders"
  ON public.ticket_reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ticket reminders"
  ON public.ticket_reminders
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ticket reminders"
  ON public.ticket_reminders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_ticket_reminders_reminder_date ON public.ticket_reminders(reminder_date) WHERE reminder_sent = false;
CREATE INDEX IF NOT EXISTS idx_ticket_reminders_booking_id ON public.ticket_reminders(booking_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_ticket_reminders_updated_at
  BEFORE UPDATE ON public.ticket_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();