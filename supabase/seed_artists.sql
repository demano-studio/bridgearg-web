-- Opcional: artistas de ejemplo. Ejecutar después de 002_create_artists.sql (y antes de seed_obras si usás ambos).

INSERT INTO public.artists (name, slug, featured) VALUES
  ('Artista Ejemplo 1', 'artista-ejemplo-1', true),
  ('Artista Ejemplo 2', 'artista-ejemplo-2', true),
  ('Artista Ejemplo 3', 'artista-ejemplo-3', true),
  ('Artista Ejemplo 4', 'artista-ejemplo-4', true)
ON CONFLICT (slug) DO NOTHING;
