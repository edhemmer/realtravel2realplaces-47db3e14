
ALTER TABLE public.packing_items ADD COLUMN IF NOT EXISTS color_tip text;
ALTER TABLE public.packing_items ADD COLUMN IF NOT EXISTS applies_to text[];
