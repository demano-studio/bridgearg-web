-- Tabla artists. Ejecutar antes de 005_create_artworks.sql.
-- https://supabase.com/dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.artists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  profile_image_url TEXT,
  instagram TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artists_slug ON public.artists (slug);
CREATE INDEX IF NOT EXISTS idx_artists_featured ON public.artists (featured);

DROP TRIGGER IF EXISTS artists_updated_at ON public.artists;
CREATE TRIGGER artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists son públicos de lectura"
  ON public.artists FOR SELECT
  USING (true);

CREATE POLICY "Solo service_role puede escribir artists"
  ON public.artists FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.artists IS 'Artistas representados; slug único para routing.';
