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

export function artistPhotoPath(row: { photo?: string | null; profile_image_url?: string | null }): string | null {
  const p = row.photo?.trim() || row.profile_image_url?.trim();
  return p || null;
}
