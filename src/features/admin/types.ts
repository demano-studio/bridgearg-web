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
  comprador_contacto: string | null;
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
  /** Public portrait path/URL (DB column; replaces legacy photo/profile_image_url). */
  image_url: string | null;
  detail_image_url?: string | null;
  studio_image_url?: string | null;
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

/** Fulfillment lifecycle on purchases.shipping_status */
export type AdminShippingStatus = "paid" | "preparing" | "shipped" | "delivered";

/** Contact inbox status on contact_messages */
export type AdminMessageStatus = "new" | "read" | "responded";

export type AdminContactMessageRow = {
  id: number;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  status: AdminMessageStatus;
  marketing_consent: boolean;
  read_at: string | null;
  responded_at: string | null;
  created_at: string;
};

export type AdminSubscriberRow = {
  id: number;
  email: string;
  source: string;
  consented_at: string | null;
  created_at: string;
  marketing_consent: boolean;
};

export type AdminPurchaseRow = {
  id: number;
  artwork_id: number;
  buyer_name: string | null;
  buyer_email: string | null;
  shipping_address: string | null;
  amount_usd: number;
  currency: string | null;
  payment_status: string;
  shipping_status: AdminShippingStatus;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  artworks?: {
    id: number;
    title: string;
    image_url?: string | null;
    artists?: { name: string } | null;
  } | null;
};
