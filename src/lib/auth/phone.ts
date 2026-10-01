export function normalizePhoneE164(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length === 8) {
    return `+591${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("591")) {
    return `+${digits}`;
  }

  return null;
}
