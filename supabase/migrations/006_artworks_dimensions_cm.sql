-- Add width_cm, height_cm, depth_cm to artworks (logistics dimensions).
-- Adds logistics dimensions to artworks. Run after 005_create_artworks.sql.

ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS width_cm  NUMERIC(8, 2);
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS height_cm NUMERIC(8, 2);
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS depth_cm  NUMERIC(8, 2);

COMMENT ON COLUMN public.artworks.width_cm  IS 'Width in cm (logistics).';
COMMENT ON COLUMN public.artworks.height_cm IS 'Height in cm (logistics).';
COMMENT ON COLUMN public.artworks.depth_cm  IS 'Depth in cm (logistics).';
