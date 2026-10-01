import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getConfiguredNotificationProviders } from "@/lib/notifications/provider";
import { getSiteUrl } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function hasValidBearer(request: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.CANCHEA_NOTIFICATION_CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const received = authorization.slice(7);
  const expectedBuffer = Buffer.from(secret);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function errorCode(error: unknown) {
  if (!(error instanceof Error)) return "UNKNOWN_PROVIDER_ERROR";
  return /^[A-Z0-9_]{3,80}$/.test(error.message) ? error.message : "PROVIDER_ERROR";
}

async function processDeliveries(request: Request) {
  if (!hasValidBearer(request)) {
    return NextResponse.json({ processed: 0 }, { status: 401 });
  }

  const providers = getConfiguredNotificationProviders();
  const channels = [...providers.keys()];
  if (!channels.length) {
    return NextResponse.json({ processed: 0, reason: "providers_not_configured" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: deliveries, error: claimError } = await admin.rpc("claim_notification_deliveries", {
    p_channels: channels,
    p_limit: 20,
  });

  if (claimError) {
    console.error("Notification delivery claim failed", claimError.code);
    return NextResponse.json({ processed: 0 }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const siteUrl = getSiteUrl();

  for (const delivery of deliveries ?? []) {
    const provider = providers.get(delivery.channel as "email" | "whatsapp");
    const recipient = delivery.channel === "email" ? delivery.recipient_email : delivery.recipient_phone;

    if (!provider || !recipient) {
      failed += 1;
      await admin.rpc("complete_notification_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_success: false,
        p_provider: provider?.name ?? "unconfigured",
        p_provider_message_id: null,
        p_error_code: recipient ? "PROVIDER_NOT_CONFIGURED" : "RECIPIENT_MISSING",
      });
      continue;
    }

    try {
      const result = await provider.send({
        recipient,
        title: delivery.title,
        body: delivery.body,
        actionUrl: delivery.action_url ? new URL(delivery.action_url, siteUrl).toString() : undefined,
      });
      const { error } = await admin.rpc("complete_notification_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_success: true,
        p_provider: provider.name,
        p_provider_message_id: result.providerMessageId,
        p_error_code: null,
      });
      if (error) throw new Error("DELIVERY_UPDATE_FAILED");
      sent += 1;
    } catch (error) {
      failed += 1;
      await admin.rpc("complete_notification_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_success: false,
        p_provider: provider.name,
        p_provider_message_id: null,
        p_error_code: errorCode(error),
      });
    }
  }

  return NextResponse.json({ processed: (deliveries ?? []).length, sent, failed });
}

export const GET = processDeliveries;
export const POST = processDeliveries;
