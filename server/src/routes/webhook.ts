import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma.js";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

type RequestWithRawBody = Request & { rawBody?: Buffer };

router.post("/webhook", async (req: RequestWithRawBody, res: Response): Promise<void> => {
  const rawBody = req.body;

  if (!rawBody) {
    res.status(400).send("Missing body");
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || !webhookSecret) {
    res.status(400).send("Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
    return;
  }

  let event: Stripe.Event;
  try {
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(rawBody));
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const artworkId = session.metadata?.artwork_id;

    if (artworkId) {
      const id = parseInt(artworkId, 10);
      if (!Number.isNaN(id)) {
        try {
          await prisma.artwork.update({
            where: { id },
            data: { status: "sold" },
          });
          console.log(`Artwork ${id} marked as sold.`);
        } catch (e) {
          console.error("Error updating artwork:", e);
        }
      }
    }
  }

  res.status(200).send("ok");
});

export default router;
