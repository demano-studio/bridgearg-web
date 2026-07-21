import emailjs from "@emailjs/browser";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** Format price in USD with en-US locale (e.g. "USD 4,500.00"). */
export function formatPriceUSD(amountUsd: number): string {
  return `USD ${Number(amountUsd).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export const FALLBACK_ARTIST_NAME = "Unknown artist";

function getArtistDisplayName(artist: { name?: string | null } | null | undefined): string {
  const name = artist?.name?.trim();
  return name || FALLBACK_ARTIST_NAME;
}

/** Status for artworks (DB enum artwork_status_enum). */
export type WorkStatus = "available" | "reserved" | "sold";
export type ArtworkStatus = WorkStatus;

/** Treats legacy values (disponible/vendido) as available/sold for backward compatibility. */
export function isAvailableStatus(status: string): boolean {
  return status === "available" || status === "disponible";
}
export function isSoldStatus(status: string): boolean {
  return status === "sold" || status === "vendido";
}

export interface WorkFromApi {
  id: number;
  title: string;
  price_usd: number;
  priceDisplay: string;
  imagenUrl: string;
  galleryUrls: string[];
  status: WorkStatus;
  available: boolean;
  artistName: string;
  artistSlug: string;
  year: string | null;
  medium: string | null;
  /** Descripción libre de dimensiones (ej. "50 x 70 cm"). */
  dimensions: string | null;
  /** Peso en kg (logística). */
  weight_kg: number | null;
  /** Dimensiones en cm (logística). */
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
}

// --- Artworks / artists tables ---

/** Artist row from DB for artist pages/listing. */
export interface ArtistRow {
  id: number;
  name: string;
  slug: string;
  bio: string | null;
  description?: string | null;
  image_url: string | null;
  discipline?: string | null;
  origin?: string | null;
  statement?: string | null;
  studio_image_url?: string | null;
  detail_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ArtistFromApi {
  id: number;
  name: string;
  slug: string;
  bio: string | null;
  description: string | null;
  imageUrl: string | null;
  discipline: string | null;
  origin: string | null;
  statement: string | null;
  studioImageUrl: string | null;
  detailImageUrl: string | null;
}

/** Relation when selecting artworks with artists (slug for routing). */
export type ArtworkRowArtist = { name: string; bio: string | null; image_url: string | null; slug?: string } | null;

export interface PiezaConjunto {
  nombre: string;
  largo: string | null;
  ancho: string | null;
  profundidad: string | null;
  peso: string | null;
}

export interface LoteRow {
  id: number;
  nombre: string;
  fecha: string | null;
  created_at?: string;
}

/** Row from artworks table (snake_case). Use with .select(..., artists(name,bio,image_url,slug)). */
export interface ArtworkRow {
  id: number;
  title: string;
  image_url: string;
  gallery_urls: string[] | null;
  status: ArtworkStatus;
  price_usd: number | null;
  price_ref_usd: number | null;
  ubicacion: string | null;
  estado_pago: string | null;
  comprador: string | null;
  fecha_venta: string | null;
  certificado: boolean | null;
  notas: string | null;
  es_conjunto: boolean;
  piezas: PiezaConjunto[];
  lote_id: number | null;
  dimensions?: string | null;
  weight_kg?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
  artist_id: number;
  year?: string | null;
  medium?: string | null;
  created_at?: string;
  updated_at?: string;
  artists: ArtworkRowArtist;
}

function mapArtistRowToArtist(row: ArtistRow): ArtistFromApi {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bio: row.bio ?? null,
    description: row.description?.trim() || null,
    imageUrl: row.image_url?.trim() || null,
    discipline: row.discipline ?? null,
    origin: row.origin ?? null,
    statement: row.statement ?? null,
    studioImageUrl: row.studio_image_url?.trim() || null,
    detailImageUrl: row.detail_image_url?.trim() || null,
  };
}

/** Normalized artwork for UI (from artworks table). */
export interface ArtworkFromApi {
  id: number;
  title: string;
  imageUrl: string;
  status: ArtworkStatus;
  price_usd: number | null;
  priceDisplay: string;
  priceRefUsd: number | null;
  ubicacion: string | null;
  estadoPago: string | null;
  comprador: string | null;
  fechaVenta: string | null;
  certificado: boolean | null;
  notas: string | null;
  esConjunto: boolean;
  piezas: PiezaConjunto[];
  loteId: number | null;
  dimensions: string | null;
  weight_kg: number | null;
  artistId: number;
  artistName: string;
  artistBio: string | null;
  artistPhoto: string | null;
  year: string | null;
  medium: string | null;
  available: boolean;
}

function mapPiezasConjunto(raw: unknown): PiezaConjunto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (!item || typeof item !== "object") {
      return { nombre: "", largo: null, ancho: null, profundidad: null, peso: null };
    }
    const o = item as Record<string, unknown>;
    return {
      nombre: typeof o.nombre === "string" ? o.nombre : String(o.nombre ?? ""),
      largo: o.largo != null ? String(o.largo) : null,
      ancho: o.ancho != null ? String(o.ancho) : null,
      profundidad: o.profundidad != null ? String(o.profundidad) : null,
      peso: o.peso != null ? String(o.peso) : null,
    };
  });
}

function mapArtworkRowToArtwork(row: ArtworkRow): ArtworkFromApi {
  const priceUsd = row.price_usd ?? 0;
  const priceRefRaw = row.price_ref_usd;
  const priceRefNum =
    priceRefRaw != null && priceRefRaw !== ""
      ? Number(priceRefRaw)
      : null;
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    status: row.status,
    price_usd: row.price_usd ?? null,
    priceDisplay: formatPriceUSD(priceUsd),
    priceRefUsd: priceRefNum != null && Number.isFinite(priceRefNum) ? priceRefNum : null,
    ubicacion: row.ubicacion ?? null,
    estadoPago: row.estado_pago ?? null,
    comprador: row.comprador ?? null,
    fechaVenta: row.fecha_venta ?? null,
    certificado: row.certificado ?? null,
    notas: row.notas ?? null,
    esConjunto: row.es_conjunto ?? false,
    piezas: mapPiezasConjunto(row.piezas),
    loteId: row.lote_id ?? null,
    dimensions: row.dimensions ?? null,
    weight_kg: row.weight_kg ?? null,
    artistId: row.artist_id,
    artistName: getArtistDisplayName(row.artists),
    artistBio: row.artists?.bio ?? null,
    artistPhoto: row.artists?.image_url ?? null,
    year: row.year ?? null,
    medium: row.medium ?? null,
    available: isAvailableStatus(row.status),
  };
}

/** Maps artwork row to WorkFromApi. */
function mapArtworkRowToWork(row: ArtworkRow): WorkFromApi {
  const priceUsd = row.price_usd ?? 0;
  const artistSlug = (row.artists as { slug?: string } | null)?.slug ?? "";
  return {
    id: row.id,
    title: row.title,
    price_usd: priceUsd,
    priceDisplay: formatPriceUSD(priceUsd),
    imagenUrl: row.image_url,
    galleryUrls: row.gallery_urls ?? [],
    status: row.status,
    available: isAvailableStatus(row.status),
    artistName: getArtistDisplayName(row.artists),
    artistSlug,
    year: row.year ?? null,
    medium: row.medium ?? null,
    dimensions: row.dimensions ?? null,
    weight_kg: row.weight_kg ?? null,
    width_cm: row.width_cm != null ? Number(row.width_cm) : null,
    height_cm: row.height_cm != null ? Number(row.height_cm) : null,
    depth_cm: row.depth_cm != null ? Number(row.depth_cm) : null,
  };
}

/** Fetches works from artworks table. */
async function fetchWorksFromArtworks(sb: import("@supabase/supabase-js").SupabaseClient, artistSlug?: string): Promise<WorkFromApi[]> {
  const select = artistSlug
    ? "id,title,image_url,gallery_urls,status,price_usd,artist_id,year,medium,dimensions,weight_kg,width_cm,height_cm,depth_cm,artists!inner(name,slug)"
    : "id,title,image_url,gallery_urls,status,price_usd,artist_id,year,medium,dimensions,weight_kg,width_cm,height_cm,depth_cm,artists(name,slug)";
  let query = sb.from("artworks").select(select).order("id", { ascending: true });
  if (artistSlug) query = query.eq("artists.slug", artistSlug);
  const { data, error } = await query;
  if (error) throw new Error(error.message ?? "Could not load works from artworks");
  return ((data ?? []) as ArtworkRow[]).map((row) => mapArtworkRowToWork(row));
}

/** Fetches a single work from artworks by id. */
async function fetchWorkFromArtworks(sb: import("@supabase/supabase-js").SupabaseClient, id: number): Promise<WorkFromApi | null> {
  const select =
    "id,title,image_url,gallery_urls,status,price_usd,artist_id,year,medium,dimensions,weight_kg,width_cm,height_cm,depth_cm,artists(name,slug)";
  const { data, error } = await sb.from("artworks").select(select).eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message ?? "Could not load work from artworks");
  }
  if (!data) return null;
  return mapArtworkRowToWork(data as ArtworkRow);
}

/** Fetch artworks from Supabase (table artworks). */
export async function getArtworks(artistId?: number): Promise<ArtworkFromApi[]> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return [];
  const select =
    "id,title,image_url,status,price_usd,price_ref_usd,ubicacion,estado_pago,comprador,fecha_venta,certificado,notas,es_conjunto,piezas,lote_id,artist_id,year,medium,artists(name,bio,image_url)";
  let query = supabase.from("artworks").select(select).order("id", { ascending: true });
  if (artistId != null) query = query.eq("artist_id", artistId);
  const { data, error } = await query;
  if (error) throw new Error(error.message ?? "Could not load artworks");
  return (data ?? []).map(mapArtworkRowToArtwork);
}

export async function getArtists(): Promise<ArtistFromApi[]> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("artists").select("id,name,slug,bio,description,image_url,discipline,origin,statement,studio_image_url,detail_image_url").order("name", { ascending: true });
  if (error) throw new Error(error.message ?? "Could not load artists");
  return (data ?? []).map((row) => mapArtistRowToArtist(row as ArtistRow));
}

export async function getLotes(): Promise<LoteRow[]> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("lotes").select("id,nombre,fecha,created_at").order("id", { ascending: true });
  if (error) throw new Error(error.message ?? "Could not load lotes");
  return (data ?? []) as LoteRow[];
}

export async function getAvailableCount(): Promise<number> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return 0;

  const { count, error } = await supabase
    .from("artworks")
    .select("id", { count: "exact", head: true })
    .eq("status", "available");

  if (error) throw new Error(error.message ?? "Could not load available artworks count");
  return count ?? 0;
}

export async function getArtistBySlug(slug: string): Promise<ArtistFromApi | null> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.from("artists").select("id,name,slug,bio,description,image_url,discipline,origin,statement,studio_image_url,detail_image_url").eq("slug", slug).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message ?? "Could not load artist");
  }
  return data ? mapArtistRowToArtist(data as ArtistRow) : null;
}

/** Total rows in `artworks` (no filters, no join). Prefer for stats; avoids empty client arrays from RLS/join issues. */
export async function getWorksTotalCount(): Promise<number | null> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return null;
  const { count, error } = await supabase
    .from("artworks")
    .select("*", { count: "exact", head: true });
  if (error) return null;
  return count ?? null;
}

export async function getWorks(artistSlug?: string): Promise<WorkFromApi[]> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return [];
  return fetchWorksFromArtworks(supabase, artistSlug);
}

export async function getLatestWorks(limit = 20): Promise<WorkFromApi[]> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("artworks")
    .select(
      "id,title,image_url,gallery_urls,status,price_usd,artist_id,year,medium,dimensions,weight_kg,width_cm,height_cm,depth_cm,artists(name,slug)"
    )
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message ?? "Could not load latest works");

  return ((data ?? []) as ArtworkRow[]).map((row) => mapArtworkRowToWork(row));
}

/** Fetches a single work by id for the detail/sales page. */
export async function getWork(id: number): Promise<WorkFromApi | null> {
  const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
  if (!isSupabaseConfigured || !supabase) return null;
  return fetchWorkFromArtworks(supabase, id);
}

export async function adminWrite(action: string, payload: unknown): Promise<unknown> {
  const { getSupabase } = await import("@/lib/supabaseClient");
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("admin-write", {
    body: { action, payload },
  });

  if (error) {
    throw new Error(error.message ?? "Admin write failed");
  }

  const result = data as { ok?: boolean; data?: unknown; error?: string } | null;
  if (!result || result.ok !== true) {
    throw new Error(result?.error ?? "Admin write failed");
  }

  return result.data;
}

export interface CheckoutInput {
  artworkId: number;
  verificationId?: string;
}

export interface DiditSessionResult {
  url: string;
  verificationId: string;
}

export async function createDiditSession(artworkId: number): Promise<DiditSessionResult> {
  const { getSupabase } = await import("@/lib/supabaseClient");
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke("didit-session", {
    body: { artworkId },
  });

  if (error) {
    throw new Error(error.message ?? "Could not create Didit session");
  }

  const result = (data ?? {}) as { url?: string | null; verificationId?: string | null; error?: string };
  if (result.error) {
    throw new Error(result.error);
  }
  if (!result.url || !result.verificationId) {
    throw new Error("Could not create Didit session");
  }

  return {
    url: result.url,
    verificationId: result.verificationId,
  };
}

export async function getPurchaseVerificationStatus(
  verificationId: string,
): Promise<"pending" | "approved" | "declined" | "in_review" | "abandoned" | null> {
  const { getSupabase } = await import("@/lib/supabaseClient");
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("purchase_verifications")
    .select("status")
    .eq("id", verificationId)
    .single();

  if (error || !data || typeof data.status !== "string") return null;
  return data.status as "pending" | "approved" | "declined" | "in_review" | "abandoned";
}

/** Creates a Checkout Session via the backend API (Express). */
export async function createCheckoutSession(input: CheckoutInput | number): Promise<{ url: string | null }> {
  const payload = typeof input === "number" ? { artworkId: input } : input;
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not create checkout session");
  return { url: data.url ?? null };
}

export type CheckoutErrorKind = "connection" | "stock" | "unknown";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public readonly kind: CheckoutErrorKind = "unknown"
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

/**
 * Creates a Stripe Checkout Session. Tries Supabase Edge Function when configured;
 * falls back to Express POST /api/checkout when Supabase is not configured or Edge Function fails.
 * Use this for checkout to support both Supabase-only and Express-only deployments.
 */
export async function createCheckout(input: CheckoutInput | number): Promise<{ url: string | null }> {
  const payload = typeof input === "number" ? { artworkId: input } : input;
  const { isSupabaseConfigured } = await import("@/lib/supabaseClient");

  if (isSupabaseConfigured) {
    try {
      // ⚠️ Asegurate de que STRIPE_SECRET_KEY sea la clave live antes de producción.
      return await createStripeCheckoutViaEdgeFunction(payload);
    } catch (err) {
      console.warn("Supabase Edge Function checkout failed, falling back to Express:", err);
      // ⚠️ Asegurate de que STRIPE_SECRET_KEY sea la clave live antes de producción.
      return createCheckoutSession(payload);
    }
  }

  // ⚠️ Asegurate de que STRIPE_SECRET_KEY sea la clave live antes de producción.
  return createCheckoutSession(payload);
}

/**
 * Creates a Stripe Checkout Session via Supabase Edge Function "stripe-checkout".
 * Invokes supabase.functions.invoke("stripe-checkout", { body: { artworkId } }).
 * Returns the Stripe URL for redirect; throws CheckoutError with kind for friendly UI.
 */
export async function createStripeCheckoutViaEdgeFunction(input: CheckoutInput | number): Promise<{ url: string | null }> {
  const payload = typeof input === "number" ? { artworkId: input } : input;
  const { getSupabase } = await import("@/lib/supabaseClient");
  const supabase = getSupabase();
  // ⚠️ Asegurate de que STRIPE_SECRET_KEY sea la clave live antes de producción.
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: payload,
  });
  if (error) {
    const msg = error.message ?? "Could not create checkout session";
    const kind: CheckoutErrorKind =
      /fetch|network|connection|conexión|timeout/i.test(msg) ? "connection"
      : /not available|not found|vendida|sold|no longer available|no encontrad/i.test(msg) ? "stock"
      : "unknown";
    throw new CheckoutError(msg, kind);
  }
  const result = (data ?? {}) as { url?: string | null; error?: string };
  if (result.error) {
    const msg = result.error;
    const kind: CheckoutErrorKind =
      /not available|not found|vendida|sold|no longer available|no encontrad/i.test(msg) ? "stock"
      : "unknown";
    throw new CheckoutError(msg, kind);
  }
  return { url: result.url ?? null };
}

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function submitContact(payload: ContactPayload): Promise<void> {
  const result = await emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    {
      from_name: payload.name,
      from_email: payload.email,
      subject: payload.subject,
      message: payload.message,
    },
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  );

  if (result.status !== 200) {
    throw new Error("Could not send your message");
  }
}
