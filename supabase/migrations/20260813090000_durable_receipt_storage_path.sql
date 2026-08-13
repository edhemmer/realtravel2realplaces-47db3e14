-- RT2RP Phase 3: durable private receipt identity.
-- `receipt_url` may contain an expiring access URL. The canonical durable
-- identifier is the private storage object path captured separately.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS receipt_storage_path text;

CREATE OR REPLACE FUNCTION public.rt2rp_extract_receipt_storage_path(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_path text;
BEGIN
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RETURN NULL;
  END IF;

  -- Current private signed URL shape.
  v_path := substring(p_url from '/object/sign/receipts/([^?]+)');

  -- Historical public-URL shape used by older clients.
  IF v_path IS NULL THEN
    v_path := substring(p_url from '/object/public/receipts/([^?]+)');
  END IF;

  RETURN v_path;
END;
$$;

-- Recover the durable object identity from existing receipt URLs where the
-- URL shape is recognizable. Values remain URL-encoded if the source URL was.
UPDATE public.expenses
SET receipt_storage_path = public.rt2rp_extract_receipt_storage_path(receipt_url)
WHERE receipt_storage_path IS NULL
  AND receipt_url IS NOT NULL
  AND public.rt2rp_extract_receipt_storage_path(receipt_url) IS NOT NULL;

CREATE OR REPLACE FUNCTION public.rt2rp_capture_receipt_storage_path()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_derived text;
BEGIN
  IF NEW.receipt_url IS NOT NULL THEN
    v_derived := public.rt2rp_extract_receipt_storage_path(NEW.receipt_url);
    IF v_derived IS NOT NULL THEN
      NEW.receipt_storage_path := v_derived;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rt2rp_capture_receipt_storage_path ON public.expenses;
CREATE TRIGGER rt2rp_capture_receipt_storage_path
BEFORE INSERT OR UPDATE OF receipt_url ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.rt2rp_capture_receipt_storage_path();

CREATE INDEX IF NOT EXISTS idx_expenses_receipt_storage_path
ON public.expenses(receipt_storage_path)
WHERE receipt_storage_path IS NOT NULL;
