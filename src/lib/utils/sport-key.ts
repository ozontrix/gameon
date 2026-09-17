/** The sport keys the mobile app has icons, photos and screens for. */
export type AppSportKey = 'badminton' | 'pickleball' | 'football' | 'cricket';

/**
 * Maps a sport's display name to the app's sport key, e.g.
 * "Box Football / Cricket" → football, "Cricket Practice Nets" → cricket.
 * Returns null for a sport the app has no key for yet.
 */
export function sportKeyFor(name: string | null | undefined): AppSportKey | null {
  const lower = (name ?? '').toLowerCase();
  if (lower.includes('badminton')) return 'badminton';
  if (lower.includes('pickleball')) return 'pickleball';
  if (lower.includes('football')) return 'football';
  if (lower.includes('cricket')) return 'cricket';
  return null;
}
