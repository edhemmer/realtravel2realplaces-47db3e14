
-- v3.9.7: Add local wall-time columns to parking for display (no timezone math)
ALTER TABLE public.parking ADD COLUMN IF NOT EXISTS end_local_datetime text;
ALTER TABLE public.parking ADD COLUMN IF NOT EXISTS end_timezone text;
ALTER TABLE public.parking ADD COLUMN IF NOT EXISTS start_local_datetime text;

-- Backfill existing records: extract digits from stored timestamp at UTC
-- Post-v3.9.5 records store digits as-is (correct); older records may be off
-- but editing them will fix going forward
UPDATE public.parking
SET end_local_datetime = to_char(end_datetime AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI')
WHERE end_datetime IS NOT NULL AND end_local_datetime IS NULL;

UPDATE public.parking
SET start_local_datetime = to_char(start_datetime AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI')
WHERE start_datetime IS NOT NULL AND start_local_datetime IS NULL;
