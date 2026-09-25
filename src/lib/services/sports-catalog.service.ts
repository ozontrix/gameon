import { supabaseAdmin } from '@/lib/db/supabase';
import { sportKeyFor, type AppSportKey } from '@/lib/utils/sport-key';

/**
 * A card on the app's Sports tab. One row of `court_types` — the sellable
 * product — plus the courts that belong to it. Its price is its own, not the
 * cheapest of its courts, so two types at the same venue can be priced
 * independently.
 */
export type SportsCatalogCard = {
  /** `court_types.id`. What `/sport/[id]` routes on and the API fetches by. */
  key: string;
  /** Stable, human-readable identity within the venue. For links and admin. */
  slug: string;
  sport: AppSportKey;
  title: string;
  description: string | null;
  location: string;
  type: string;
  /** How many days ahead this card's venue takes bookings, today counting as day 1. */
  bookingWindowDays: number;
  /** Most players a single booking of this court type may have, set by the admin. */
  maxPlayers: number;
  badges: string[];
  /** The slot lengths a player can book and what each costs, shortest first. */
  slotOptions: { durationMinutes: number; price: number }[];
  /** The cheapest slot option, for "from ₹X" on the listing. */
  priceFrom: number;
  image: string | null;
  gallery: string[];
  courtsAvailable: number;
  courts: string[];
  amenities: { label: string; icon: { family: 'ion' | 'mci'; name: string } }[];
  eligibility: string[];
  facilityIds: string[];
};

/** Shape of one row of the join below, before it is flattened into a card. */
type CourtTypeRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  surface_type: string;
  is_indoor: boolean;
  has_ac: boolean;
  max_players: number;
  venues: { name: string; address: string | null; booking_window_days: number } | null;
  sports: { name: string; image_url: string | null } | null;
  facilities: { id: string; name: string; is_active: boolean | null }[];
  court_type_amenities: {
    amenities: { label: string; icon_family: string; icon_name: string; sort_order: number } | null;
  }[];
  court_type_rules: { rule: string; sort_order: number }[];
  court_type_images: { url: string; sort_order: number }[];
  court_type_slot_options: { duration_minutes: number; price: number; is_active: boolean }[];
};

const SELECT = `
  id, slug, name, description, surface_type, is_indoor, has_ac, max_players, sort_order,
  venues!inner ( name, address, is_active, booking_window_days ),
  sports!inner ( name, image_url, is_active ),
  facilities ( id, name, is_active ),
  court_type_amenities ( amenities ( label, icon_family, icon_name, sort_order ) ),
  court_type_rules ( rule, sort_order ),
  court_type_images ( url, sort_order ),
  court_type_slot_options ( duration_minutes, price, is_active )
`;

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function toCard(row: CourtTypeRow): SportsCatalogCard | null {
  const sportKey = sportKeyFor(row.sports?.name);
  // A sport the app has no screens for yet isn't bookable from it.
  if (!sportKey) return null;
  const slotOptions = row.court_type_slot_options
    .filter((option) => option.is_active)
    .sort((a, b) => a.duration_minutes - b.duration_minutes)
    .map((option) => ({ durationMinutes: option.duration_minutes, price: Number(option.price) }));
  // Without a slot option there is nothing to sell, so the card isn't bookable.
  if (slotOptions.length === 0) return null;

  const setting = row.is_indoor ? 'Indoor' : 'Outdoor';
  const climate = row.has_ac ? 'AC' : 'Non-AC';
  const surface = capitalize(row.surface_type);
  const courts = row.facilities.filter((facility) => facility.is_active !== false);
  // The type's own photos, in the order an admin arranged them; the sport's
  // photo stands in until the type has any.
  const photos = [...row.court_type_images].sort((a, b) => a.sort_order - b.sort_order).map((photo) => photo.url);
  const gallery = photos.length > 0 ? photos : row.sports?.image_url ? [row.sports.image_url] : [];

  return {
    key: row.id,
    slug: row.slug,
    sport: sportKey,
    title: row.name,
    description: row.description,
    location: [row.venues?.name, row.venues?.address].filter(Boolean).join(', '),
    bookingWindowDays: row.venues?.booking_window_days ?? 14,
    maxPlayers: row.max_players,
    type: `${setting} • ${surface} • ${climate}`,
    badges: [setting, climate],
    slotOptions,
    priceFrom: Math.min(...slotOptions.map((option) => option.price)),
    image: gallery[0] ?? null,
    gallery,
    courtsAvailable: courts.length,
    courts: courts.map((facility) => facility.name),
    amenities: row.court_type_amenities
      .map((link) => link.amenities)
      .filter((amenity) => amenity !== null)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((amenity) => ({
        label: amenity.label,
        icon: { family: amenity.icon_family as 'ion' | 'mci', name: amenity.icon_name },
      })),
    eligibility: [...row.court_type_rules]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((entry) => entry.rule),
    facilityIds: courts.map((facility) => facility.id),
  };
}

export class SportsCatalogService {
  /** Every bookable card, in the order an admin arranged them. */
  static async listCards(): Promise<SportsCatalogCard[]> {
    const { data, error } = await supabaseAdmin
      .from('court_types')
      .select(SELECT)
      .eq('is_active', true)
      .eq('venues.is_active', true)
      .eq('sports.is_active', true)
      .order('sort_order');

    if (error) throw error;
    return ((data ?? []) as unknown as CourtTypeRow[]).map(toCard).filter((card) => card !== null);
  }

  /** One card by its id. `null` for an unknown, inactive or unsupported one. */
  static async getCard(id: string): Promise<SportsCatalogCard | null> {
    const { data, error } = await supabaseAdmin
      .from('court_types')
      .select(SELECT)
      .eq('id', id)
      .eq('is_active', true)
      .eq('venues.is_active', true)
      .eq('sports.is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data ? toCard(data as unknown as CourtTypeRow) : null;
  }
}
