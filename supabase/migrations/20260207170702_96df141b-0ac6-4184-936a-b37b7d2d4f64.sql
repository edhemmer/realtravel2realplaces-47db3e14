-- Create table to capture upgrade intent signals
-- v2.6.5: Non-intrusive tracking for billing decision support

CREATE TABLE public.upgrade_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_plan TEXT NOT NULL,
  target_plan TEXT NOT NULL,
  entry_point TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.upgrade_intents IS 'Captures user upgrade intent signals for billing planning. No PII stored.';
COMMENT ON COLUMN public.upgrade_intents.entry_point IS 'Where the user clicked: account_page, plans_page, contextual_message';

-- Enable RLS
ALTER TABLE public.upgrade_intents ENABLE ROW LEVEL SECURITY;

-- Users can insert their own intent signals
CREATE POLICY "Users can insert their own upgrade intents"
ON public.upgrade_intents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own intents (for debugging)
CREATE POLICY "Users can view their own upgrade intents"
ON public.upgrade_intents
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all intents for analytics
CREATE POLICY "Admins can view all upgrade intents"
ON public.upgrade_intents
FOR SELECT
USING (is_admin());

-- Create index for admin analytics queries
CREATE INDEX idx_upgrade_intents_created_at ON public.upgrade_intents(created_at DESC);
CREATE INDEX idx_upgrade_intents_target_plan ON public.upgrade_intents(target_plan);