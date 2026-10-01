import "server-only";

import type { NotificationMessage, NotificationProvider } from "@/lib/notifications/types";

export class UnconfiguredNotificationProvider implements NotificationProvider {
  constructor(public readonly channel: "email" | "whatsapp") {}

  readonly name = "unconfigured";

  async send(message: NotificationMessage): Promise<never> {
    void message;
    throw new Error(`${this.channel.toUpperCase()}_PROVIDER_NOT_CONFIGURED`);
  }
}
