-- Table 'artworks' with status enum, price_usd, dimensions, weight_kg, artist_id.
-- Artists table created if not exists (name, bio, photo).
-- Run in Supabase → SQL Editor.

-- 1. Status enum (safe create)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artwork_status_enum') THEN
    CREATE TYPE public.artwork_status_enum AS ENUM ('available', 'reserved', 'sold');
  END IF;
END $$;

-- 2. Artists: create if not exists (name, bio, photo)
CREATE TABLE IF NOT EXISTS public.artists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If artists already exists (e.g. from 002) with profile_image_url, add photo and sync
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS photo TEXT;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artists' AND column_name = 'profile_image_url') THEN
    UPDATE public.artists SET photo = profile_image_url WHERE photo IS NULL AND profile_image_url IS NOT NULL;
  END IF;
END $$;

-- Ensure set_updated_at exists (from earlier migrations)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS artists_updated_at ON public.artists;
CREATE TRIGGER artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Artworks table
CREATE TABLE IF NOT EXISTS public.artworks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status public.artwork_status_enum NOT NULL DEFAULT 'available',
  price_usd NUMERIC(12, 2),
  dimensions TEXT,
  weight_kg NUMERIC(10, 3),
  artist_id BIGINT NOT NULL,
  year TEXT,
  medium TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_artworks_artist FOREIGN KEY (artist_id) REFERENCES public.artists(id)
);

CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON public.artworks (artist_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON public.artworks (status);

DROP TRIGGER IF EXISTS artworks_updated_at ON public.artworks;
CREATE TRIGGER artworks_updated_at
  BEFORE UPDATE ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artworks are readable by everyone"
  ON public.artworks FOR SELECT USING (true);

CREATE POLICY "Only service_role can write artworks"
  ON public.artworks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.artworks IS 'Artworks catalog: status enum, price_usd (numeric), dimensions (text), weight_kg (numeric), artist_id → artists.';
COMMENT ON COLUMN public.artworks.price_usd IS 'Price in USD (numeric to avoid rounding).';
COMMENT ON COLUMN public.artworks.dimensions IS 'Free text e.g. 120x90 cm.';
COMMENT ON COLUMN public.artworks.weight_kg IS 'Weight in kg for logistics.';
