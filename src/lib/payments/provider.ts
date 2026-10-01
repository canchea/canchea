import "server-only";

import { mockPaymentProvider } from "@/lib/payments/mock-provider";
import type { PaymentProvider, PaymentProviderName } from "@/lib/payments/types";

const providers: Record<PaymentProviderName, PaymentProvider> = {
  mock: mockPaymentProvider,
};

export function getPaymentProvider(name: string) {
  return providers[name as PaymentProviderName] ?? null;
}
