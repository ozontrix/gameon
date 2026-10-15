/**
 * Canonical digits-only form for normalization and opt-out matching:
 * `+91 85720 05698` becomes `918572005698`. A local number is completed with
 * India's country code; anything ambiguous is refused rather than sent
 * to a wrong person. The sender adds '+' for the API and delivery log.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, '');
  // `00` is the international access prefix, not part of the number.
  if (digits.startsWith('00')) digits = digits.slice(2);
  // A single leading zero is a national trunk prefix.
  digits = digits.replace(/^0+/, '');
  if (!digits) return null;

  const cc = '91';
  if (digits.length === 10) digits = `${cc}${digits}`;

  // India only: 91 followed by exactly the ten national-number digits.
  if (digits.length !== 12 || !digits.startsWith(cc)) return null;
  return digits;
}

/** `918572005698` → `+91 85720 05698`, for display only. */
export function prettyWhatsAppNumber(phone: string): string {
  const digits = toWhatsAppNumber(phone) ?? phone.replace(/\D/g, '');
  if (digits.length === 12) return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}
