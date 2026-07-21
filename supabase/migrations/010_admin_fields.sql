-- Tabla lotes
create table if not exists public.lotes (
  id bigint generated always as identity primary key,
  nombre text not null,
  fecha text,
  created_at timestamptz default now()
);
alter table public.lotes enable row level security;
create policy "Public read lotes" on public.lotes for select using (true);
create policy "Service write lotes" on public.lotes for all using (auth.role() = 'service_role');

-- Columnas nuevas en artworks
alter table public.artworks
  add column if not exists price_ref_usd numeric,
  add column if not exists ubicacion text default 'En Galería',
  add column if not exists estado_pago text default 'Pendiente',
  add column if not exists comprador text,
  add column if not exists fecha_venta date,
  add column if not exists certificado boolean default false,
  add column if not exists notas text,
  add column if not exists es_conjunto boolean default false,
  add column if not exists piezas jsonb default '[]'::jsonb,
  add column if not exists lote_id bigint references public.lotes(id);

-- Columnas nuevas en artists
alter table public.artists
  add column if not exists email text,
  add column if not exists telefono text,
  add column if not exists instagram text,
  add column if not exists comision_bridge numeric default 30,
  add column if not exists comision_artista numeric default 70;
