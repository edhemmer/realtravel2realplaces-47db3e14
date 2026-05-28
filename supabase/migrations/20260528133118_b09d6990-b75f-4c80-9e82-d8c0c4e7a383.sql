-- Device tokens for APNs/FCM push delivery
CREATE TABLE public.device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  app_version text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX idx_device_tokens_user ON public.device_tokens(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous device_tokens access"
  ON public.device_tokens FOR SELECT TO anon USING (false);

CREATE POLICY "Users can view their own device tokens"
  ON public.device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register their own device tokens"
  ON public.device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
  ON public.device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
  ON public.device_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();