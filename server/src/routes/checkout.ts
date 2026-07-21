import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

/** Creates a Stripe Checkout Session with price_usd and metadata (artworkId). */
async function createCheckoutSession(artworkId: number): Promise<{ url: string | null }> {
  const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";

  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    include: { artist: { select: { name: true } } },
  });

  if (!artwork) {
    throw new Error("Artwork not found");
  }

  const status = artwork.status?.toLowerCase() ?? "";
  const isAvailable = status === "available";
  const isSold = status === "sold";
  if (!isAvailable) {
    throw new Error(isSold ? "Artwork already sold" : "Artwork is not available for purchase");
  }

  const priceUsd = artwork.priceUsd != null ? Number(artwork.priceUsd) : 0;
  const unitAmountCents = Math.round(priceUsd * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: artwork.title,
            description: `${artwork.artist?.name ?? ""} · ${artwork.medium ?? ""}${artwork.year ? ` · ${artwork.year}` : ""}`.trim(),
            images: artwork.imageUrl.startsWith("http") ? [artwork.imageUrl] : undefined,
          },
          unit_amount: unitAmountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${clientUrl}/artworks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/artworks`,
    shipping_address_collection: {
      allowed_countries: ["AR", "US", "MX", "CO", "ES", "FR", "DE", "GB", "IT"],
    },
    metadata: {
      artwork_id: String(artwork.id),
    },
  });

  return { url: session.url };
}

router.post("/checkout", async (req: Request, res: Response): Promise<void> => {
  const { artworkId } = req.body as { artworkId?: number };

  if (typeof artworkId !== "number" || artworkId < 1) {
    res.status(400).json({ error: "Invalid artworkId" });
    return;
  }

  try {
    const { url } = await createCheckoutSession(artworkId);
    res.status(200).json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating checkout session";
    if (message === "Artwork not found") {
      res.status(404).json({ error: message });
      return;
    }
    if (message === "Artwork already sold" || message === "Artwork is not available for purchase") {
      res.status(400).json({ error: message });
      return;
    }
    console.error("checkout error:", err);
    res.status(500).json({ error: message });
  }
});

router.post("/create-checkout-session", async (req: Request, res: Response): Promise<void> => {
  const { artworkId } = req.body as { artworkId?: number };
  if (typeof artworkId !== "number" || artworkId < 1) {
    res.status(400).json({ error: "Invalid artworkId" });
    return;
  }
  try {
    const { url } = await createCheckoutSession(artworkId);
    res.status(200).json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error creating checkout session";
    if (message === "Artwork not found") {
      res.status(404).json({ error: message });
      return;
    }
    if (message === "Artwork already sold" || message === "Artwork is not available for purchase") {
      res.status(400).json({ error: message });
      return;
    }
    console.error("create-checkout-session error:", err);
    res.status(500).json({ error: message });
  }
});

export default router;
