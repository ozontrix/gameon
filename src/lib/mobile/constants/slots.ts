/**
 * Dates, times and slot lengths — the web twin of the handset app's
 * `constants/slots.ts`.
 *
 * The important rule in this file is what is *not* here: there is no
 * `slotsForDate()`. Availability comes from `GET /user/slots` and from nothing
 * else. The handset app once derived fake availability from a hash of the date,
 * hour and venue so a day "looked different" each time, producing "Booked" cells
 * with no relation to the database; it was removed, and this port never grew it.
 */

/** Days offered in the date picker before the venue's own window takes over. */
export const SLOT_DAY_COUNT = 14;

/** `60` → `"1 hr"`, `90` → `"1 hr 30 min"`. */
export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} hr` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ') || '0 min';
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** One day in the date picker. */
export type SlotDate = {
  /** `YYYY-MM-DD`, the stable identity used everywhere else. */
  key: string;
  /** "Today", "Tomorrow", or the weekday. */
  day: string;
  date: string;
  month: string;
  weekday: string;
  /** Summary form, e.g. "15 Sep, Mon". */
  label: string;
  isToday: boolean;
  isWeekend: boolean;
};

/** `YYYY-MM-DD`, read from the local date rather than UTC. */
export function dateKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Midnight today, so day comparisons ignore the time of day. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Builds a {@link SlotDate} from a `Date`. */
export function toSlotDate(date: Date, today: Date = startOfToday()): SlotDate {
  const key = dateKeyOf(date);
  const weekday = WEEKDAYS[date.getDay()];
  const month = SHORT_MONTHS[date.getMonth()];
  const dayNumber = date.getDate();
  const dayDiff = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  return {
    key,
    day: dayDiff === 0 ? 'Today' : dayDiff === 1 ? 'Tomorrow' : weekday,
    date: String(dayNumber),
    month,
    weekday,
    label: `${dayNumber} ${month}, ${weekday}`,
    isToday: dayDiff === 0,
    isWeekend: date.getDay() === 0 || date.getDay() === 6,
  };
}

/**
 * The next `count` days starting today. Generated rather than hardcoded: an
 * earlier fixed list in the handset app was pinned to May 2024, so "Today"
 * pointed at a date long past and every booking carried it.
 */
export function buildSlotDates(count: number = SLOT_DAY_COUNT, from?: Date): SlotDate[] {
  const today = from ?? startOfToday();
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return toSlotDate(date, today);
  });
}

/**
 * The window the picker offers, computed once per page load like the handset
 * app. Safe at module scope because nothing renders from it until a court has
 * been chosen — which only happens after the courts fetch, on the client — so
 * the server never renders a day the browser would disagree about.
 */
export const SLOT_DATES: SlotDate[] = buildSlotDates();

/** One bookable slot, once the server has said so. */
export type TimeSlot = {
  key: string;
  /** Start time, the grid cell's first line. */
  start: string;
  /** End time, the grid cell's second line. */
  end: string;
  available: boolean;
};

/** `"18:30:00"` → `"6:30 PM"`. */
export function clockLabel(time: string): string {
  const [hours, minutes = '00'] = time.split(':');
  const hour = Number(hours);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minutes} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Minutes between two `HH:MM:SS` times on the same day. */
export function slotMinutes(start: string, end: string): number {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  return toMinutes(end) - toMinutes(start);
}

/**
 * The glyph for a preference option. A handset names an icon-font glyph; the web
 * kit renders components, so a group names the family and the glyph and
 * `PreferenceGroups` resolves it.
 */
export type PreferenceIcon =
  | { family: 'ion'; name: 'layersOutline' | 'homeOutline' | 'sunnyOutline' }
  | { family: 'mdi'; name: 'textureBox' | 'snowflake' | 'fan' };

/** A court-preference group: floor type, setting, or climate control. */
export type PreferenceGroup = {
  key: 'floor' | 'setting' | 'climate';
  label: string;
  options: { key: string; label: string; icon: PreferenceIcon }[];
};

export const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    key: 'floor',
    label: 'Floor Type',
    options: [
      { key: 'wooden', label: 'Wooden Floor', icon: { family: 'mdi', name: 'textureBox' } },
      { key: 'synthetic', label: 'Synthetic Floor', icon: { family: 'ion', name: 'layersOutline' } },
    ],
  },
  {
    key: 'setting',
    label: 'Setting',
    options: [
      { key: 'indoor', label: 'Indoor', icon: { family: 'ion', name: 'homeOutline' } },
      { key: 'outdoor', label: 'Outdoor', icon: { family: 'ion', name: 'sunnyOutline' } },
    ],
  },
  {
    key: 'climate',
    label: 'Climate',
    options: [
      { key: 'ac', label: 'AC', icon: { family: 'mdi', name: 'snowflake' } },
      { key: 'non-ac', label: 'Non-AC', icon: { family: 'mdi', name: 'fan' } },
    ],
  },
];

/** Party sizes offered by the "No. of Players" picker. */
export const PLAYER_OPTIONS = [2, 4, 6, 8, 10, 12] as const;

/** Character budget for the notes field, mirrored in its "0/100" counter. */
export const NOTES_MAX_LENGTH = 100;

