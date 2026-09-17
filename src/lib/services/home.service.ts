import { supabaseAdmin } from '../db/supabase';
import { addDays, todayIn } from '../admin/format';
import { sportKeyFor } from '../utils/sport-key';

export type HomeBanner = {
  id: string;
  title: string;
  titleAccent: string | null;
  subtitle: string | null;
  badge: string | null;
  imageUrl: string | null;
  link: string | null;
};

export type HomeSport = {
  id: string;
  key: string | null;
  name: string;
  courtCount: number;
  priceFrom: number;
  bookingsLast30Days: number;
  imageUrl: string | null;
};

type CourtRow = {
  id: string;
  name: string;
  price_per_hour: number;
  is_indoor: boolean;
  has_ac: boolean;
  surface_type: string;
  sport_id: string | null;
  venues: { name: string; is_active: boolean | null } | null;
  sports: { id: string; name: string; is_active: boolean | null; image_url: string | null } | null;
};

/** Every court the app can book: active, at an active venue, with an active sport. */
async function bookableCourts(): Promise<CourtRow[]> {
  const { data, error } = await supabaseAdmin
    .from('facilities')
    .select(
      'id, name, price_per_hour, is_indoor, has_ac, surface_type, sport_id, venues!inner ( name, is_active ), sports!inner ( id, name, is_active, image_url )'
    )
    .eq('is_active', true)
    .eq('venues.is_active', true)
    .eq('sports.is_active', true)
    .order('name');
  if (error) throw error;
  return data as CourtRow[];
}

/** Courts grouped per sport, with the cheapest hourly rate. */
function summariseSports(courts: CourtRow[], bookingsBySport: Map<string, number>): HomeSport[] {
  const bySport = new Map<string, HomeSport>();
  for (const court of courts) {
    if (!court.sports) continue;
    const entry = bySport.get(court.sports.id) ?? {
      id: court.sports.id,
      key: sportKeyFor(court.sports.name),
      name: court.sports.name,
      courtCount: 0,
      priceFrom: Number.POSITIVE_INFINITY,
      bookingsLast30Days: bookingsBySport.get(court.sports.id) ?? 0,
      imageUrl: court.sports.image_url,
    };
    entry.courtCount += 1;
    entry.priceFrom = Math.min(entry.priceFrom, Number(court.price_per_hour));
    bySport.set(court.sports.id, entry);
  }
  return [...bySport.values()];
}

export class HomeService {
  /** Everything the app's Home screen shows that is not specific to the signed-in player. */
  static async getHome() {
    const now = new Date().toISOString();
    const today = todayIn();

    const [courts, banners, recentBookings] = await Promise.all([
      bookableCourts(),
      supabaseAdmin
        .from('home_banners')
        .select('id, placement, title, title_accent, subtitle, badge, image_url, link, starts_at, ends_at')
        .eq('is_active', true)
        .order('sort_order')
        .order('created_at'),
      supabaseAdmin
        .from('bookings')
        .select('facilities!inner ( sport_id )')
        .eq('status', 'CONFIRMED')
        .gte('booking_date', addDays(today, -30))
        .lte('booking_date', today),
    ]);

    if (banners.error) throw banners.error;
    if (recentBookings.error) throw recentBookings.error;

    const bookingsBySport = new Map<string, number>();
    for (const row of recentBookings.data) {
      const sportId = row.facilities.sport_id;
      if (sportId) bookingsBySport.set(sportId, (bookingsBySport.get(sportId) ?? 0) + 1);
    }

    // Most booked first; ties keep the more affordable sport first.
    const sports = summariseSports(courts, bookingsBySport).sort(
      (a, b) => b.bookingsLast30Days - a.bookingsLast30Days || a.priceFrom - b.priceFrom
    );

    const live = banners.data.filter(
      (banner) => (!banner.starts_at || banner.starts_at <= now) && (!banner.ends_at || banner.ends_at > now)
    );
    const toBanner = (banner: (typeof live)[number]): HomeBanner => ({
      id: banner.id,
      title: banner.title,
      titleAccent: banner.title_accent,
      subtitle: banner.subtitle,
      badge: banner.badge,
      imageUrl: banner.image_url,
      link: banner.link,
    });

    // The venue with the most bookable courts is the one the app presents.
    const courtsPerVenue = new Map<string, number>();
    for (const court of courts) {
      if (court.venues) courtsPerVenue.set(court.venues.name, (courtsPerVenue.get(court.venues.name) ?? 0) + 1);
    }
    const venueName = [...courtsPerVenue.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const { data: venue } = venueName
      ? await supabaseAdmin.from('venues').select('name, address').eq('name', venueName).limit(1).maybeSingle()
      : { data: null };

    return {
      venue: venue ? { name: venue.name, address: venue.address } : null,
      banners: {
        hero: live.filter((banner) => banner.placement === 'HERO').map(toBanner),
        promo: live.filter((banner) => banner.placement === 'PROMO').map(toBanner),
      },
      sports,
    };
  }

  /** Sports and courts whose name (or the court's surface) matches the query. */
  static async search(query: string) {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return { sports: [], courts: [] };

    const courts = await bookableCourts();
    const matches = (text: string | null | undefined) => (text ?? '').toLowerCase().includes(needle);

    // A few words describe the court rather than name it; they are matched on
    // those attributes only, so "ac" does not also match "Practice".
    const keywords: Record<string, (court: CourtRow) => boolean> = {
      indoor: (court) => court.is_indoor,
      outdoor: (court) => !court.is_indoor,
      ac: (court) => court.has_ac,
      'air-conditioned': (court) => court.has_ac,
    };
    const keyword: ((court: CourtRow) => boolean) | undefined = Object.hasOwn(keywords, needle) ? keywords[needle] : undefined;

    const matchedCourts = keyword
      ? courts.filter(keyword)
      : courts.filter((court) => matches(court.name) || matches(court.sports?.name) || matches(court.surface_type));

    const sports = keyword
      ? []
      : summariseSports(
          courts.filter((court) => matches(court.sports?.name)),
          new Map()
        ).sort((a, b) => a.name.localeCompare(b.name));

    return {
      sports: sports.map((sport) => ({
        id: sport.id,
        key: sport.key,
        name: sport.name,
        courtCount: sport.courtCount,
        priceFrom: sport.priceFrom,
        imageUrl: sport.imageUrl,
      })),
      courts: matchedCourts.slice(0, 30).map((court) => ({
        id: court.id,
        name: court.name,
        sportName: court.sports?.name ?? null,
        sportKey: sportKeyFor(court.sports?.name),
        pricePerHour: Number(court.price_per_hour),
        isIndoor: court.is_indoor,
        hasAc: court.has_ac,
        surface: court.surface_type,
        venueName: court.venues?.name ?? null,
      })),
    };
  }
}
