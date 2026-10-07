import { z } from 'zod';
import { OPEN_PLAY_SPORT_IDS } from './constants';

/** Accept common Indian mobile formats but store one canonical 10-digit value. */
export function normalizeOpenPlayPhone(value: string): string {
  const digits = value.replace(/[\s()+-]/g, '');
  if (/^\+?91[6-9]\d{9}$/.test(digits)) return digits.replace(/^\+?91/, '');
  if (/^0[6-9]\d{9}$/.test(digits)) return digits.slice(1);
  return digits;
}

const campaign = z.string().trim().max(120).regex(/^[\p{L}\p{N} ._:/-]*$/u).optional().default('');
export const OpenPlayRegistrationSchema = z.object({
  sport: z.enum(OPEN_PLAY_SPORT_IDS, { error: 'Choose your preferred sport.' }),
  fullName: z.string().trim().min(2, 'Please enter your name.').max(80, 'Please use 80 characters or fewer.')
    .regex(/^[\p{L}\p{M} .'-]+$/u, 'Please enter a name using letters.'),
  phone: z.string().max(24).transform(normalizeOpenPlayPhone).pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.')),
  email: z.string().trim().max(254).pipe(z.union([z.email('Enter a valid email address.'), z.literal('')])).optional().default('').transform(value => value.toLowerCase()),
  city: z.string().trim().max(80).optional().default(''),
  contactConsent: z.literal(true, { error: 'Please agree so we can contact you about open play.' }),
  marketingConsent: z.boolean().optional().default(false),
  website: z.string().max(0, 'Unable to submit this registration.').optional().default(''),
  attribution: z.object({ utm_source: campaign, utm_medium: campaign, utm_campaign: campaign, utm_content: campaign, utm_term: campaign }).optional(),
});
export type OpenPlayRegistrationInput = z.infer<typeof OpenPlayRegistrationSchema>;

/** Only bounded campaign labels, never the full URL, referrer or fbclid. */
export function openPlayAttribution(search: string) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].map(key => [
    key, (params.get(key) ?? '').replace(/[^\p{L}\p{N} ._:/-]/gu, '').slice(0, 120),
  ]));
}