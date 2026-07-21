-- Seed ejecutado por `supabase db reset`. Inserta artists y artworks de prueba.
-- Mismo contenido que seed_artworks.sql para que el reset deje la DB lista en local.

-- 1) Artistas (con o sin slug según migraciones)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artists' AND column_name = 'slug') THEN
    INSERT INTO public.artists (name, slug, bio, photo)
    VALUES
      ('Artist Example 1', 'artista-ejemplo-1', 'Contemporary artist specializing in abstract painting.', NULL),
      ('Artist Example 2', 'artista-ejemplo-2', 'Explorer of new visual narratives.', NULL),
      ('Artist Example 3', 'artista-ejemplo-3', 'Sculptor working with organic materials and metals.', NULL),
      ('Artist Example 4', 'artista-ejemplo-4', 'Multidisciplinary artist fusing painting and collage.', NULL)
    ON CONFLICT (slug) DO NOTHING;
  ELSE
    INSERT INTO public.artists (name, bio, photo)
    SELECT v.name, v.bio, v.photo FROM (VALUES
      ('Artist Example 1', 'Contemporary artist specializing in abstract painting.', NULL),
      ('Artist Example 2', 'Explorer of new visual narratives.', NULL),
      ('Artist Example 3', 'Sculptor working with organic materials and metals.', NULL),
      ('Artist Example 4', 'Multidisciplinary artist fusing painting and collage.', NULL)
    ) AS v(name, bio, photo)
    WHERE NOT EXISTS (SELECT 1 FROM public.artists a WHERE a.name = v.name);
  END IF;
END $$;

-- 2) Artworks de prueba
INSERT INTO public.artworks (title, image_url, status, price_usd, dimensions, weight_kg, artist_id, year, medium)
SELECT 'Untitled I', 'bridgearg-work1.jpg', 'available'::public.artwork_status_enum, 4500.00, '120 x 150 cm', 5.2, a.id, '2024', 'Oil on canvas'
FROM public.artists a WHERE a.name = 'Artist Example 1' LIMIT 1;
INSERT INTO public.artworks (title, image_url, status, price_usd, dimensions, weight_kg, artist_id, year, medium)
SELECT 'Dialogue I', 'bridgearg-work2.jpg', 'available'::public.artwork_status_enum, 8000.00, 'Variable', NULL, a.id, '2024', 'Installation'
FROM public.artists a WHERE a.name = 'Artist Example 2' LIMIT 1;
INSERT INTO public.artworks (title, image_url, status, price_usd, dimensions, weight_kg, artist_id, year, medium)
SELECT 'Volume I', 'bridgearg-work3.jpg', 'available'::public.artwork_status_enum, 12000.00, '45 x 30 x 30 cm', 12.0, a.id, '2024', 'Bronze'
FROM public.artists a WHERE a.name = 'Artist Example 3' LIMIT 1;
INSERT INTO public.artworks (title, image_url, status, price_usd, dimensions, weight_kg, artist_id, year, medium)
SELECT 'Accumulation', 'bridgearg-work4.jpg', 'available'::public.artwork_status_enum, 1800.00, '60 x 80 cm', 2.1, a.id, '2024', 'Mixed media'
FROM public.artists a WHERE a.name = 'Artist Example 4' LIMIT 1;
INSERT INTO public.artworks (title, image_url, status, price_usd, dimensions, weight_kg, artist_id, year, medium)
SELECT 'Composition in Blue', 'bridgearg-work2.jpg', 'sold'::public.artwork_status_enum, 3200.00, '100 x 100 cm', 3.0, a.id, '2024', 'Acrylic on canvas'
FROM public.artists a WHERE a.name = 'Artist Example 1' LIMIT 1;
INSERT INTO public.artworks (title, image_url, status, price_usd, dimensions, weight_kg, artist_id, year, medium)
SELECT 'Resonances', 'bridgearg-work3.jpg', 'available'::public.artwork_status_enum, 5500.00, '12 min loop', NULL, a.id, '2024', 'Video art'
FROM public.artists a WHERE a.name = 'Artist Example 2' LIMIT 1;
