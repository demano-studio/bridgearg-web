import type { PiezaConjunto } from "@/lib/api";

export type AdminArtworkStatus = "available" | "reserved" | "sold";

export type AdminArtworkRow = {
  id: number;
  title: string;
  image_url: string;
  status: AdminArtworkStatus;
  price_usd: number | null;
  price_ref_usd: number | null;
  ubicacion: string | null;
  estado_pago: string | null;
  comprador: string | null;
  fecha_venta: string | null;
  certificado: boolean | null;
  notas: string | null;
  es_conjunto: boolean | null;
  piezas: PiezaConjunto[] | unknown;
  lote_id: number | null;
  dimensions: string | null;
  weight_kg: number | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  artist_id: number;
  year: string | null;
  medium: string | null;
  tipo: string | null;
  enmarque: string | null;
  materiales: string | null;
  extra_image_paths: string[] | unknown;
  artists: { id: number; name: string; slug?: string } | null;
};

export type AdminArtistRow = {
  id: number;
  name: string;
  slug: string;
  bio: string | null;
  statement: string | null;
  photo: string | null;
  profile_image_url?: string | null;
  email: string | null;
  telefono: string | null;
  instagram: string | null;
  comision_bridge: number | null;
  comision_artista: number | null;
};

export type AdminLoteRow = {
  id: number;
  nombre: string;
  fecha: string | null;
  created_at?: string;
};
