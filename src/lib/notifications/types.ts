export type NotificationMessage = {
  recipient: string;
  title: string;
  body: string;
  actionUrl?: string;
};

export type NotificationDeliveryResult = {
  providerMessageId: string;
};

export interface NotificationProvider {
  readonly channel: "email" | "whatsapp";
  readonly name: string;
  send(message: NotificationMessage): Promise<NotificationDeliveryResult>;
}
