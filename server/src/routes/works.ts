import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

function mapArtworkToJson(artwork: {
  id: number;
  title: string;
  priceUsd: unknown;
  imageUrl: string;
  status: string;
  artist: { name: string; slug: string } | null;
  year: string | null;
  medium: string | null;
  dimensions: string | null;
  weightKg: unknown;
  widthCm: unknown;
  heightCm: unknown;
  depthCm: unknown;
}) {
  const priceUsd = artwork.priceUsd != null ? Number(artwork.priceUsd) : 0;
  return {
    id: artwork.id,
    title: artwork.title,
    price_usd: priceUsd,
    priceDisplay: `USD ${Number(priceUsd).toLocaleString("en-US")}`,
    imagenUrl: artwork.imageUrl,
    status: artwork.status,
    available: artwork.status === "available",
    artistName: artwork.artist?.name ?? "",
    artistSlug: artwork.artist?.slug ?? "",
    year: artwork.year,
    medium: artwork.medium,
    dimensions: artwork.dimensions,
    weight_kg: artwork.weightKg != null ? Number(artwork.weightKg) : null,
    width_cm: artwork.widthCm != null ? Number(artwork.widthCm) : null,
    height_cm: artwork.heightCm != null ? Number(artwork.heightCm) : null,
    depth_cm: artwork.depthCm != null ? Number(artwork.depthCm) : null,
  };
}

router.get("/works", async (req: Request, res: Response): Promise<void> => {
  const artistSlug = typeof req.query.artistSlug === "string" ? req.query.artistSlug : undefined;

  try {
    const artworks = await prisma.artwork.findMany({
      where: artistSlug ? { artist: { slug: artistSlug } } : undefined,
      orderBy: { id: "asc" },
      include: { artist: { select: { name: true, slug: true } } },
    });
    res.status(200).json(artworks.map(mapArtworkToJson));
  } catch (err) {
    console.error("GET /works error:", err);
    res.status(500).json({ error: "Error listing artworks" });
  }
});

router.get("/works/:id", async (req: Request, res: Response): Promise<void> => {
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id) || id < 1) {
    res.status(400).json({ error: "Invalid work id" });
    return;
  }
  try {
    const artwork = await prisma.artwork.findUnique({
      where: { id },
      include: { artist: { select: { name: true, slug: true } } },
    });
    if (!artwork) {
      res.status(404).json({ error: "Work not found" });
      return;
    }
    res.status(200).json(mapArtworkToJson(artwork));
  } catch (err) {
    console.error("GET /works/:id error:", err);
    res.status(500).json({ error: "Error loading work" });
  }
});

export default router;
