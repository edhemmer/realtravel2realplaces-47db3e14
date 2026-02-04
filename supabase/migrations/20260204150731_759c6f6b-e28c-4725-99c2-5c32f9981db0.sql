-- v1.3.3: Add is_custom flag to packing_items for distinguishing user-added vs AI-generated items
ALTER TABLE public.packing_items 
ADD COLUMN is_custom boolean NOT NULL DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN public.packing_items.is_custom IS 'True for user-added items, false for AI-generated items';