import type { AdminMessageStatus, AdminShippingStatus } from "@/features/admin/types";

export function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const slug = s
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "artista";
}

export function adminArtworkStatusLabel(status: string): string {
  if (status === "sold") return "Vendida";
  if (status === "reserved") return "Reservada";
  return "Stock";
}

export function adminStatusFromLabel(label: string): "available" | "reserved" | "sold" {
  if (label === "Vendida") return "sold";
  if (label === "Reservada") return "reserved";
  return "available";
}

export function artistPhotoPath(row: {
  image_url?: string | null;
  detail_image_url?: string | null;
  studio_image_url?: string | null;
}): string | null {
  const p = row.image_url?.trim() || row.detail_image_url?.trim() || row.studio_image_url?.trim();
  return p || null;
}

export function adminShippingLabel(status: AdminShippingStatus | string): string {
  switch (status) {
    case "preparing":
      return "Preparando";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregado";
    case "paid":
    default:
      return "Pagado";
  }
}

export function adminPaymentLabel(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "paid" || s === "complete" || s === "completed" || s === "succeeded") return "Pagado";
  if (s === "pending" || s === "unpaid" || s === "open") return "Pendiente";
  if (s === "failed" || s === "canceled" || s === "cancelled") return "Fallido";
  if (s === "refunded") return "Reembolsado";
  return status.trim() || "—";
}

export function isPurchasePaid(status: string): boolean {
  const s = status.trim().toLowerCase();
  return s === "paid" || s === "complete" || s === "completed" || s === "succeeded";
}

/** Next step in paid → preparing → shipped → delivered. */
export function nextShippingStatus(status: AdminShippingStatus | string): AdminShippingStatus | null {
  if (status === "paid") return "preparing";
  if (status === "preparing") return "shipped";
  if (status === "shipped") return "delivered";
  return null;
}

export function adminMessageStatusLabel(status: AdminMessageStatus | string): string {
  if (status === "responded") return "Respondido";
  if (status === "read") return "Leído";
  return "Nuevo";
}
