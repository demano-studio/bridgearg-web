-- 014: cerrar el acceso público a columnas internas + lectura segura del estado de verificación.
-- Ejecutar en Supabase -> SQL Editor (todo junto). Es una sola transacción: si algo falla, no queda nada a medias.
--
-- Problema: las políticas RLS de artists/artworks son "SELECT using (true)" para todos. RLS filtra FILAS, no
-- columnas, así que cualquiera con la anon key (que va dentro del JS del sitio) podía pedir también
-- artists.email / telefono / comisiones y artworks.comprador / notas / price_ref_usd, aunque el sitio no los muestre.
--
-- Solución: al rol anon (visitantes) se le dan permisos SOLO sobre las columnas que el sitio público usa.
-- El rol authenticated (el admin logueado) no cambia y sigue viendo todo. Escritura sigue siendo solo service_role.

begin;

-- 1) artists: anon solo ve las columnas públicas
revoke select on public.artists from anon;
grant select (
  id, name, slug, bio, description, image_url, discipline, origin,
  statement, studio_image_url, detail_image_url
) on public.artists to anon;

-- 2) artworks: anon solo ve las columnas públicas
revoke select on public.artworks from anon;
grant select (
  id, title, image_url, gallery_urls, status, price_usd, artist_id,
  year, medium, dimensions, weight_kg, width_cm, height_cm, depth_cm
) on public.artworks to anon;

-- 3) Estado de una verificación: purchase_verifications es solo service_role (guarda datos del KYC), así que el
--    navegador no podía leerla y el sondeo de estado siempre daba "pendiente". Esta función devuelve ÚNICAMENTE
--    el estado de UNA verificación por su id (uuid imposible de adivinar), nunca nombres ni documentos.
create or replace function public.get_verification_status(p_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select status::text from public.purchase_verifications where id = p_id;
$$;

revoke all on function public.get_verification_status(uuid) from public;
grant execute on function public.get_verification_status(uuid) to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------------------------
-- COMO VERIFICAR (correr después, por separado):
--   set role anon;
--   select id, name, slug from public.artists limit 1;      -- debe funcionar
--   select email from public.artists limit 1;               -- debe dar: permission denied
--   select comprador from public.artworks limit 1;          -- debe dar: permission denied
--   reset role;
--
-- COMO DESHACER (si algo del sitio se rompe):
--   grant select on public.artists to anon;
--   grant select on public.artworks to anon;
--
-- OJO a futuro: si agregás una columna NUEVA que el sitio público tiene que mostrar, hay que darle permiso:
--   grant select (nueva_columna) on public.artworks to anon;
-- ---------------------------------------------------------------------------------------------
