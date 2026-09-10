/** Strips a formatted phone string down to digits only, e.g. "(781) 555-0102" -> "7815550102". */
export function toDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Normalizes a 10-digit US number to E.164 (+1XXXXXXXXXX) for HubSpot lookups/storage. */
export function normalizePhoneE164(phone: string): string {
  const digits = toDigits(phone);
  const tenDigit = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (tenDigit.length !== 10) {
    throw new Error(`Cannot normalize phone number: "${phone}"`);
  }
  return `+1${tenDigit}`;
}

/** Formats digits as the user types into "(XXX) XXX-XXXX". */
export function formatPhoneInput(rawDigits: string): string {
  const digits = toDigits(rawDigits).slice(0, 10);
  const len = digits.length;
  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
