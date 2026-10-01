import "server-only";

import { ResendNotificationProvider } from "@/lib/notifications/resend-provider";
import type { NotificationProvider } from "@/lib/notifications/types";
import { WhatsAppNotificationProvider } from "@/lib/notifications/whatsapp-provider";
import { getSiteUrl } from "@/lib/supabase/env";

export function getConfiguredNotificationProviders() {
  const providers = new Map<NotificationProvider["channel"], NotificationProvider>();
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.CANCHEA_EMAIL_FROM;

  if (resendApiKey && emailFrom) {
    providers.set("email", new ResendNotificationProvider(resendApiKey, emailFrom));
  }

  const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const whatsappTemplateName = process.env.WHATSAPP_NOTIFICATION_TEMPLATE;

  if (whatsappAccessToken && whatsappPhoneNumberId && whatsappTemplateName) {
    providers.set("whatsapp", new WhatsAppNotificationProvider(
      whatsappAccessToken,
      whatsappPhoneNumberId,
      process.env.WHATSAPP_API_VERSION ?? "v23.0",
      whatsappTemplateName,
      process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "es",
      getSiteUrl(),
    ));
  }

  return providers;
}
