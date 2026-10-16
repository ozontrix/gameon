/**
 * The sports offered at the facility, per the written brief (Section 5):
 * badminton, pickleball, cricket and football. Nothing else is bookable.
 *
 * The web twin of `gameon-multisports/src/constants/sports.ts`. The one
 * difference is `SPORT_TILES`: a handset bundles the artwork as a local
 * `require()`, a browser fetches it, and the four PNGs are the same files —
 * copied into `public/sports/` so this route owns its own asset namespace.
 */

export type SportKind = 'badminton' | 'pickleball' | 'cricket' | 'football';

export const SPORT_LABELS: Record<SportKind, string> = {
  badminton: 'Badminton',
  pickleball: 'Pickleball',
  cricket: 'Cricket',
  football: 'Football',
};

/** Artwork for a sport tile, served from `public/sports/`. */
export const SPORT_TILES: Record<SportKind, string> = {
  badminton: '/sports/badminton.png',
  pickleball: '/sports/pickleball.png',
  cricket: '/sports/cricket.png',
  football: '/sports/football.png',
};

/** One amenity tile on the Sport Detail screen, as the API sends it. */
export type Amenity = {
  label: string;
  /**
   * The admin picks an icon per amenity from an icon-font list, so the name is a
   * free-form string. `AmenitiesRow` resolves it against the glyph registry and
   * falls back to a neutral glyph for one this build does not draw.
   */
  icon: { family: 'ion' | 'mci'; name: string };
};

/** A slot length a card sells and what one slot of it costs. */
export type SlotOption = { durationMinutes: number; price: number };

/**
 * A bookable card, as `GET /public/sports/catalog` returns it — one per
 * distinct (venue, sport, indoor/outdoor, AC, surface) combination.
 */
export type Venue = {
  /** The `court_types` row id this card is. What `/app/sport/[id]` routes on. */
  key: string;
  /** Stable, readable identity within the venue, e.g. `badminton-wooden-ac`. */
  slug: string;
  sport: SportKind;
  title: string;
  description: string | null;
  /** Facility name and city, e.g. "GameOn Arena, Gurgaon". */
  location: string;
  /** e.g. "Indoor • Wooden • AC" */
  type: string;
  /** How far ahead this card's venue takes bookings, today counting as day 1. */
  bookingWindowDays: number;
  /** Most players a single booking of this court type may have, set by the admin. */
  maxPlayers: number;
  /** The slot lengths a player can book, shortest first, each with its own price. */
  slotOptions: SlotOption[];
  /** The cheapest slot option, for "from ₹X" on the listing. */
  priceFrom: number;
  image: string;
  /** Sliding photo gallery on the detail screen; `image` is the first frame. */
  gallery: string[];
  badges: string[];
  /** Number of individual courts/screens bookable for this sport. */
  courtsAvailable: number;
  /** Court/screen names offered in the slot-selection step. */
  courts: string[];
  amenities: Amenity[];
  eligibility: string[];
  /** The real facility rows behind this card. */
  facilityIds: string[];
};

/**
 * The facility photo set, used as the fallback whenever a sport has no
 * `image_url` set in the backend. Copied from the handset app so both builds
 * show the same photographs.
 */
export const SPORT_PHOTOS = {
  badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80&auto=format&fit=crop',
  badmintonAlt: 'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?w=800&q=80&auto=format&fit=crop',
  pickleball: 'https://images.unsplash.com/photo-1614294148960-9aa740632a87?w=800&q=80&auto=format&fit=crop',
  pickleballAlt: 'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=800&q=80&auto=format&fit=crop',
  cricket: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80&auto=format&fit=crop',
  cricketAlt: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80&auto=format&fit=crop',
  football: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80&auto=format&fit=crop',
  footballAlt: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&q=80&auto=format&fit=crop',
  stadium: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800&q=80&auto=format&fit=crop',
  court: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=800&q=80&auto=format&fit=crop',
} as const;

/** The photo a card shows when the sport has none of its own. */
export function fallbackPhoto(sport: SportKind): string {
  return SPORT_PHOTOS[sport];
}
