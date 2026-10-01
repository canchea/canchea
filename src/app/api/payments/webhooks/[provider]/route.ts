import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerName } = await params;
  const provider = getPaymentProvider(providerName);
  if (!provider) return NextResponse.json({ received: false }, { status: 404 });

  const rawBody = await request.text();
  const verification = provider.verifyWebhook(
    rawBody,
    request.headers.get("x-canchea-signature"),
  );

  if (!verification.ok) {
    const status = verification.reason === "provider_not_configured" ? 503 : 401;
    return NextResponse.json({ received: false }, { status });
  }

  try {
    const admin = createAdminClient();
    const event = verification.event;
    const { data, error } = await admin.rpc("process_payment_webhook", {
      p_provider: provider.name,
      p_provider_event_id: event.eventId,
      p_provider_order_id: event.providerOrderId,
      p_event_type: event.eventType,
      p_amount_bob: event.amountBob,
      p_currency: event.currency,
      p_payload: event.payload,
    });

    if (error) {
      console.error("Payment webhook processing failed", error.code);
      return NextResponse.json({ received: false }, { status: 500 });
    }

    return NextResponse.json({ received: true, result: data });
  } catch {
    return NextResponse.json({ received: false }, { status: 503 });
  }
}
