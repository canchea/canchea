import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, WebhookVerification } from "@/lib/payments/types";
import type { Json } from "@/types/database";

function validSignature(rawBody: string, received: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const normalized = received.startsWith("sha256=") ? received.slice(7) : received;

  if (!/^[0-9a-f]{64}$/i.test(normalized)) return false;

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(normalized, "hex"));
}

export const mockPaymentProvider: PaymentProvider = {
  name: "mock",
  verifyWebhook(rawBody, signature): WebhookVerification {
    const secret = process.env.CANCHEA_MOCK_WEBHOOK_SECRET;
    if (!secret) return { ok: false, reason: "provider_not_configured" };
    if (!signature || !validSignature(rawBody, signature, secret)) {
      return { ok: false, reason: "invalid_signature" };
    }

    try {
      const payload = JSON.parse(rawBody) as Record<string, unknown>;
      const data = payload.data as Record<string, unknown> | undefined;
      const eventType = payload.type;
      const amountBob = data?.amount_bob;

      if (
        typeof payload.id !== "string" || payload.id.length < 8 || payload.id.length > 180 ||
        (eventType !== "payment.paid" && eventType !== "payment.failed") ||
        typeof data?.order_id !== "string" || data.order_id.length < 8 || data.order_id.length > 160 ||
        typeof amountBob !== "number" || !Number.isFinite(amountBob) || amountBob <= 0 || amountBob > 99_999_999.99 ||
        data.currency !== "BOB"
      ) {
        return { ok: false, reason: "invalid_payload" };
      }

      return {
        ok: true,
        event: {
          eventId: payload.id,
          eventType,
          providerOrderId: data.order_id,
          amountBob,
          currency: "BOB",
          payload: payload as Json,
        },
      };
    } catch {
      return { ok: false, reason: "invalid_payload" };
    }
  },
};
