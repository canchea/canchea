import type { Json } from "@/types/database";

export type PaymentProviderName = "mock";

export type VerifiedPaymentEvent = {
  eventId: string;
  eventType: "payment.paid" | "payment.failed";
  providerOrderId: string;
  amountBob: number;
  currency: "BOB";
  payload: Json;
};

export type WebhookVerification =
  | { ok: true; event: VerifiedPaymentEvent }
  | { ok: false; reason: "invalid_signature" | "invalid_payload" | "provider_not_configured" };

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  verifyWebhook(rawBody: string, signature: string | null): WebhookVerification;
}
