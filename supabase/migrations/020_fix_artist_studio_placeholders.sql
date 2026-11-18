-- Replace broken studio placeholders with each artist's valid profile photo.
-- Format matches existing rows: full public Storage URLs.

UPDATE public.artists
SET studio_image_url = 'https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/artists/boyo.jpg'
WHERE slug = 'boyo-quintana'
  AND studio_image_url ILIKE '%artista-ejemplo%';

UPDATE public.artists
SET studio_image_url = 'https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/artists/caro.jpg'
WHERE slug = 'caro-caeiro'
  AND studio_image_url ILIKE '%artista-ejemplo%';

UPDATE public.artists
SET studio_image_url = 'https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/artists/mariano.jpg'
WHERE slug = 'mariano-castaneda'
  AND studio_image_url ILIKE '%artista-ejemplo%';

UPDATE public.artists
SET studio_image_url = 'https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/artists/tulio.jpg'
WHERE slug = 'tulio-romano'
  AND studio_image_url ILIKE '%artista-ejemplo%';
