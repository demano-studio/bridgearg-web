import { Router, Request, Response } from "express";
import { Resend } from "resend";
import { contactEmailHtml } from "../lib/email-template.js";

const router = Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const FROM = process.env.RESEND_FROM_EMAIL?.trim() ?? "onboarding@resend.dev";
const TO = process.env.RESEND_TO_EMAIL?.trim() ?? "";

function isResendConfigured(): boolean {
  return Boolean(RESEND_API_KEY && TO);
}

function validateContactBody(body: unknown): { name: string; email: string; subject: string; message: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name.trim()) return null;
  if (typeof b.email !== "string" || !b.email.trim()) return null;
  if (typeof b.message !== "string" || !b.message.trim()) return null;
  const subject = typeof b.subject === "string" ? b.subject.trim() : "";
  return {
    name: (b.name as string).trim(),
    email: (b.email as string).trim(),
    subject: subject || "Contacto BridgeArg",
    message: (b.message as string).trim(),
  };
}

router.post("/contact", async (req: Request, res: Response): Promise<void> => {
  const payload = validateContactBody(req.body);

  if (!payload) {
    res.status(400).json({ error: "Campos requeridos: nombre, email, mensaje" });
    return;
  }

  if (!isResendConfigured()) {
    console.error("Resend no configurado: definí RESEND_API_KEY y RESEND_TO_EMAIL en server/.env");
    res.status(503).json({ error: "Servicio de contacto no configurado" });
    return;
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const html = contactEmailHtml(payload);
    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      subject: `[BridgeArg] ${payload.subject}`,
      html,
      reply_to: payload.email,
    });

    if (error) {
      console.error("Resend error:", error);
      res.status(500).json({ error: "Error al enviar el mensaje" });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("contact error:", err);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
});

export default router;
