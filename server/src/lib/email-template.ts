export function contactEmailHtml(payload: { name: string; email: string; subject: string; message: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contacto BridgeArg</title>
</head>
<body style="margin:0; padding:0; font-family: system-ui, -apple-system, sans-serif; background:#f5f5f5;">
  <div style="max-width:560px; margin:24px auto; padding:32px; background:#fff; border-radius:8px;">
    <h1 style="margin:0 0 24px; font-size:20px; font-weight:600; color:#111;">Nuevo mensaje de contacto</h1>
    <table style="width:100%; border-collapse:collapse;">
      <tr><td style="padding:8px 0; color:#666; width:100px;">Nombre</td><td style="padding:8px 0;">${escapeHtml(payload.name)}</td></tr>
      <tr><td style="padding:8px 0; color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(payload.email)}">${escapeHtml(payload.email)}</a></td></tr>
      <tr><td style="padding:8px 0; color:#666;">Asunto</td><td style="padding:8px 0;">${escapeHtml(payload.subject)}</td></tr>
    </table>
    <div style="margin-top:24px; padding-top:24px; border-top:1px solid #eee;">
      <p style="margin:0 0 8px; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Mensaje</p>
      <p style="margin:0; white-space:pre-wrap; line-height:1.6;">${escapeHtml(payload.message)}</p>
    </div>
    <p style="margin-top:24px; font-size:12px; color:#999;">BridgeArg — formulario de contacto</p>
  </div>
</body>
</html>
`.trim();
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}
