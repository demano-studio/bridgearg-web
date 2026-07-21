-- Campos CRM adicionales para el panel de administración (tipo, enmarque, materiales, galería).
alter table public.artworks
  add column if not exists tipo text,
  add column if not exists enmarque text,
  add column if not exists materiales text,
  add column if not exists extra_image_paths jsonb default '[]'::jsonb;

comment on column public.artworks.tipo is 'Cuadro | Escultura (CRM).';
comment on column public.artworks.extra_image_paths is 'Rutas adicionales en bucket artworks (json array de strings).';
