import "dotenv/config";
import express from "express";
import cors from "cors";
import checkoutRouter from "./routes/checkout.js";
import contactRouter from "./routes/contact.js";
import webhookRouter from "./routes/webhook.js";
import stripeWebhookRouter from "./routes/webhooks/stripe.js";
import worksRouter from "./routes/works.js";

const app = express();
const PORT = process.env.PORT ?? 3000;
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";

// Orígenes permitidos para CORS (frontend). Siempre trim para evitar espacios que rompan CORS.
const CORS_ORIGINS = CLIENT_URL.split(",").map((s) => s.trim()).filter(Boolean);
if (CORS_ORIGINS.length === 1 && CORS_ORIGINS[0] === "http://localhost:5173") {
  CORS_ORIGINS.push("http://localhost:8080");
}

app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  })
);

// Webhooks: body raw para verificar firma de Stripe
app.use(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookRouter
);
app.use(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookRouter
);

// Resto de rutas usan JSON
app.use(express.json());

app.use("/api", worksRouter);
app.use("/api", checkoutRouter);
app.use("/api", contactRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
