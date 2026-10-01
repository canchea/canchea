import "server-only";

import type { NotificationMessage, NotificationProvider } from "@/lib/notifications/types";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function emailHtml(message: NotificationMessage) {
  const action = message.actionUrl
    ? `<a href="${escapeHtml(message.actionUrl)}" style="display:inline-block;margin-top:24px;padding:12px 20px;border-radius:10px;background:#22c55e;color:#07110c;text-decoration:none;font-weight:700">Abrir en CANCHEA</a>`
    : "";

  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f6f5;font-family:Inter,Arial,sans-serif;color:#0b0f0e"><div style="max-width:600px;margin:0 auto;padding:32px 20px"><div style="background:#07110c;border-radius:16px 16px 0 0;padding:20px 24px;color:#fff"><strong style="font-size:22px;letter-spacing:.04em">CANCHEA<span style="color:#22c55e">.</span></strong><div style="font-size:11px;letter-spacing:.22em;margin-top:4px">RESERVA. JUEGA. DISFRUTA.</div></div><div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px"><h1 style="font-size:24px;line-height:1.25;margin:0 0 14px">${escapeHtml(message.title)}</h1><p style="font-size:16px;line-height:1.6;margin:0;color:#33413b">${escapeHtml(message.body)}</p>${action}</div><p style="font-size:12px;color:#6b7772;text-align:center;margin-top:18px">Mensaje automático de CANCHEA.</p></div></body></html>`;
}

export class ResendNotificationProvider implements NotificationProvider {
  readonly channel = "email" as const;
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: NotificationMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.recipient],
        subject: message.title,
        html: emailHtml(message),
        text: `${message.title}\n\n${message.body}${message.actionUrl ? `\n\n${message.actionUrl}` : ""}`,
      }),
    });

    const payload = await response.json().catch(() => null) as { id?: string } | null;
    if (!response.ok || !payload?.id) {
      throw new Error(`RESEND_HTTP_${response.status}`);
    }

    return { providerMessageId: payload.id };
  }
}
