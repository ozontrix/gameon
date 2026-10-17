/** The sport keys the mobile app has icons, photos and screens for. */
export type AppSportKey = 'badminton' | 'pickleball' | 'football' | 'cricket';

/** The app's chips, in the order they are shown on the Sports tab. */
export const APP_SPORT_KEYS: readonly AppSportKey[] = ['badminton', 'pickleball', 'cricket', 'football'];

export const APP_SPORT_LABELS: Record<AppSportKey, string> = {
  badminton: 'Badminton',
  pickleball: 'Pickleball',
  cricket: 'Cricket',
  football: 'Football',
};

/**
 * The order a display name is read in. A combined name such as
 * "Box Football / Cricket" keeps football as its primary sport, which is what
 * `court_types.sport_id` and the card's sport pill used before categories
 * existed.
 */
const NAME_ORDER: readonly AppSportKey[] = ['badminton', 'pickleball', 'football', 'cricket'];

export function isAppSportKey(value: unknown): value is AppSportKey {
  return typeof value === 'string' && (APP_SPORT_KEYS as readonly string[]).includes(value);
}

/**
 * Every category a sport's display name mentions, e.g.
 * "Box Football / Cricket" → ['football', 'cricket']. Unlike
 * {@link sportKeyFor}, this does not stop at the first match: the box turf is
 * genuinely both sports and should be found under either filter.
 */
export function sportKeysFor(name: string | null | undefined): AppSportKey[] {
  const lower = (name ?? '').toLowerCase();
  return NAME_ORDER.filter((key) => lower.includes(key));
}

/**
 * Maps a sport's display name to the card's primary sport key, e.g.
 * "Box Football / Cricket" → football, "Cricket Practice Nets" → cricket.
 * Returns null for a sport the app has no key for yet.
 */
export function sportKeyFor(name: string | null | undefined): AppSportKey | null {
  return sportKeysFor(name)[0] ?? null;
}

/**
 * A court type's category column, in app order. An empty or invalid column
 * (an older row, before the categories migration) falls back to the categories
 * named by the primary sport, so a card never disappears from the app.
 */
export function sportKeysFromColumn(
  value: readonly string[] | null | undefined,
  fallbackName: string | null | undefined,
): AppSportKey[] {
  const categories = new Set((value ?? []).filter(isAppSportKey));
  if (categories.size === 0) return sportKeysFor(fallbackName);
  return APP_SPORT_KEYS.filter((key) => categories.has(key));
}

/**
 * What an admin's category choices become: their picks plus the primary
 * sport's main key. The primary category can never be left out, so a card
 * cannot be saved without a way to appear in the app; every other category is
 * the admin's choice, so a combined turf can be narrowed to one sport later.
 */
export function mergeSportKeys(
  primaryName: string | null | undefined,
  selected: readonly string[],
): AppSportKey[] {
  const categories = new Set<AppSportKey>();
  for (const key of selected) if (isAppSportKey(key)) categories.add(key);
  const primary = sportKeyFor(primaryName);
  if (primary) categories.add(primary);
  return APP_SPORT_KEYS.filter((key) => categories.has(key));
}

/**
 * Whether a card belongs under any of the requested filters. The API treats
 * multiple picks as OR, exactly like the Sports tab chips: a football+cricket
 * turf is returned once for either, and still once when both are selected.
 */
export function cardMatchesSports(
  categories: readonly AppSportKey[],
  requested: readonly string[],
): boolean {
  return requested.some((sport) => isAppSportKey(sport) && categories.includes(sport));
}
