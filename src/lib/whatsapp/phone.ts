/**
 * WhatsApp addresses a recipient as digits only, in full international form:
 * `+91 85720 05698` becomes `918572005698`. A local number is completed with
 * the configured country code; anything ambiguous is refused rather than sent
 * to a wrong person.
 */
export function toWhatsAppNumber(phone: string | null | undefined, countryCode = '91'): string | null {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, '');
  // `00` is the international access prefix, not part of the number.
  if (digits.startsWith('00')) digits = digits.slice(2);
  // A single leading zero is a national trunk prefix.
  digits = digits.replace(/^0+/, '');
  if (!digits) return null;

  const cc = countryCode.replace(/\D/g, '');
  if (digits.length === 10) digits = `${cc}${digits}`;

  // E.164 allows at most 15 digits including the country code.
  if (digits.length < 11 || digits.length > 15) return null;
  // Every number this club serves is a national number behind the country code.
  if (!digits.startsWith(cc)) return null;
  return digits;
}

/** `918572005698` → `+91 85720 05698`, for display only. */
export function prettyWhatsAppNumber(digits: string): string {
  if (digits.length === 12) return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}
