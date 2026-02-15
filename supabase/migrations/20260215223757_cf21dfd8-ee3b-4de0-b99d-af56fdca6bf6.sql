
-- ============================================================================
-- 1. Email Ingestion Addresses (one per user, auto-generated)
-- ============================================================================
CREATE TABLE public.email_ingestion_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  ingestion_hash TEXT NOT NULL UNIQUE,
  ingestion_address TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_ingestion_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ingestion address"
  ON public.email_ingestion_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingestion address"
  ON public.email_ingestion_addresses FOR UPDATE
  USING (auth.uid() = user_id);

-- Block anonymous
CREATE POLICY "Block anonymous ingestion address access"
  ON public.email_ingestion_addresses FOR SELECT
  USING (false);

-- ============================================================================
-- 2. Pending Imports (parsed email results awaiting user confirmation)
-- ============================================================================
CREATE TABLE public.pending_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parsed_type TEXT NOT NULL, -- flight, stay, car_rental, parking, other
  parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0,
  provider_message_id TEXT,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, dismissed, failed
  error_code TEXT,
  subject TEXT,
  sender TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for dedup
CREATE UNIQUE INDEX idx_pending_imports_provider_msg
  ON public.pending_imports (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE UNIQUE INDEX idx_pending_imports_content_hash
  ON public.pending_imports (user_id, content_hash)
  WHERE content_hash IS NOT NULL AND status = 'pending';

ALTER TABLE public.pending_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending imports"
  ON public.pending_imports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending imports"
  ON public.pending_imports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending imports"
  ON public.pending_imports FOR DELETE
  USING (auth.uid() = user_id);

-- Block anonymous
CREATE POLICY "Block anonymous pending imports access"
  ON public.pending_imports FOR SELECT
  USING (false);

-- ============================================================================
-- 3. Auto-generate ingestion address on profile creation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_create_ingestion_address()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_hash TEXT;
  v_address TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_hash := substr(encode(gen_random_bytes(8), 'hex'), 1, 12);
    v_address := 'u_' || v_hash || '@ingest.realtravel2realplaces.app';
    
    BEGIN
      INSERT INTO email_ingestion_addresses (user_id, ingestion_hash, ingestion_address)
      VALUES (NEW.user_id, v_hash, v_address);
      EXIT; -- success
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'Failed to generate unique ingestion hash after 5 attempts';
      END IF;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_ingestion_address
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_ingestion_address();

-- ============================================================================
-- 4. Updated_at trigger for both tables
-- ============================================================================
CREATE TRIGGER update_email_ingestion_addresses_updated_at
  BEFORE UPDATE ON public.email_ingestion_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pending_imports_updated_at
  BEFORE UPDATE ON public.pending_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
