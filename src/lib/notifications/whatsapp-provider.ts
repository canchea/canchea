import "server-only";

import type { NotificationMessage, NotificationProvider } from "@/lib/notifications/types";

type WhatsAppResponse = {
  messages?: Array<{ id?: string }>;
};

export class WhatsAppNotificationProvider implements NotificationProvider {
  readonly channel = "whatsapp" as const;
  readonly name = "meta-whatsapp-cloud";

  constructor(
    private readonly accessToken: string,
    private readonly phoneNumberId: string,
    private readonly apiVersion: string,
    private readonly templateName: string,
    private readonly templateLanguage: string,
    private readonly fallbackUrl: string,
  ) {}

  async send(message: NotificationMessage) {
    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: message.recipient.replace(/^\+/, ""),
          type: "template",
          template: {
            name: this.templateName,
            language: { code: this.templateLanguage },
            components: [{
              type: "body",
              parameters: [
                { type: "text", text: message.title },
                { type: "text", text: message.body },
                { type: "text", text: message.actionUrl ?? this.fallbackUrl },
              ],
            }],
          },
        }),
      },
    );

    const payload = await response.json().catch(() => null) as WhatsAppResponse | null;
    const providerMessageId = payload?.messages?.[0]?.id;
    if (!response.ok || !providerMessageId) {
      throw new Error(`WHATSAPP_HTTP_${response.status}`);
    }

    return { providerMessageId };
  }
}
