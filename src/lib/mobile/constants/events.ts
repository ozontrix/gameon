/**
 * Events and tournaments, exactly as `GET /public/events` and
 * `GET /public/tournaments` return them — the web twin of the handset app's
 * `constants/events.ts`.
 *
 * Nothing here holds data: those two endpoints are the only source. These are the
 * shapes plus the display helpers both listing cards and both detail screens need,
 * so a date range or a countdown is never formatted twice.
 */

import { price } from './config';
import { clockLabel } from './slots';
import type { SportKind } from './sports';

export type { SportKind };

export type ActivityKind = 'event' | 'tournament';

/** A free-form block an admin wrote, e.g. prizes or "good to know". */
export type ActivitySection = { key: string; title: string; body: string };

/** What an event and a tournament both carry. */
type ActivityBase = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  format: string | null;
  /** Null when the sport is one the app carries no artwork for. */
  sport: SportKind | null;
  venue: string;
  address: string | null;
  /** Places on sale — tickets for an event, team slots for a tournament. */
  capacity: number;
  /** Places already held or sold. */
  taken: number;
  entryFee: number | null;
  /** e.g. "per person" / "per team". */
  feeUnit: string;
  /** `YYYY-MM-DD`, in the venue's own calendar. */
  startsOn: string;
  endsOn: string;
  /** `HH:MM:SS`. */
  dailyStartTime: string;
  dailyEndTime: string;
  /** ISO timestamp. */
  registrationClosesAt: string;
  /** `draft` | `published` | `registration_closed` | `completed` | `cancelled`. */
  status: string;
  images: string[];
  sections: ActivitySection[];
};

export type PublicEvent = ActivityBase & {
  kind: 'event';
  maxTicketsPerOrder: number;
};

export type PublicTournament = ActivityBase & {
  kind: 'tournament';
  teamSize: string | null;
  courtTypeLabel: string | null;
  /** e.g. "Indoor • Synthetic • AC". */
  courtTypeSummary: string | null;
  courtTypeBadges: string[];
};

export type PublicActivity = PublicEvent | PublicTournament;

export type ActivityStatus = 'ongoing' | 'upcoming' | 'past';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `YYYY-MM-DD` → a local midnight, so no timezone can shift the day. */
function parseDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Where the activity sits relative to today, in the venue's calendar. */
export function activityStatus(activity: PublicActivity): ActivityStatus {
  const start = parseDay(activity.startsOn);
  const end = parseDay(activity.endsOn);
  const today = startOfToday();

  if (end < today) return 'past';
  if (start <= today) return 'ongoing';
  return 'upcoming';
}

/** "24 May 2025" or "18 May – 26 May, 2025". */
export function dateRangeLabel(activity: PublicActivity): string {
  const start = parseDay(activity.startsOn);
  const end = parseDay(activity.endsOn);
  const from = `${start.getDate()} ${MONTHS[start.getMonth()]}`;

  if (activity.startsOn === activity.endsOn) {
    return `${from}, ${start.getFullYear()}`;
  }

  const to = `${end.getDate()} ${MONTHS[end.getMonth()]}`;
  if (start.getFullYear() === end.getFullYear()) {
    return `${from} – ${to}, ${end.getFullYear()}`;
  }
  return `${from}, ${start.getFullYear()} – ${to}, ${end.getFullYear()}`;
}

/** The shorter form a card has room for, e.g. "18 May – 26 May". */
export function dateRangeShort(activity: PublicActivity): string {
  const start = parseDay(activity.startsOn);
  const end = parseDay(activity.endsOn);
  const from = `${start.getDate()} ${MONTHS[start.getMonth()]}`;
  if (activity.startsOn === activity.endsOn) return from;
  return `${from} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

/** The month the activity starts in, e.g. "May" — what the filter chips match on. */
export function startMonthToken(activity: PublicActivity): string {
  return MONTHS[parseDay(activity.startsOn).getMonth()];
}

/** "5:00 PM – 10:00 PM", from the daily playing window. */
export function timeRangeLabel(activity: PublicActivity): string {
  return `${clockLabel(activity.dailyStartTime)} – ${clockLabel(activity.dailyEndTime)}`;
}

/**
 * The countdown, in a long form for the detail hero and a short one for a card.
 * Whole days only, matching how the dates themselves are stored.
 */
export function countdownLabel(activity: PublicActivity): { long: string; short: string } {
  const DAY = 86_400_000;
  const today = startOfToday();
  const days = (to: Date) => Math.round((to.getTime() - today.getTime()) / DAY);
  const status = activityStatus(activity);

  if (status === 'past') return { long: 'Finished', short: 'Finished' };

  if (status === 'ongoing') {
    const left = Math.max(days(parseDay(activity.endsOn)), 0);
    if (left === 0) return { long: 'Ends today', short: 'Ends today' };
    return { long: `Ends in ${left} ${left === 1 ? 'Day' : 'Days'}`, short: `${left}d left` };
  }

  const left = Math.max(days(parseDay(activity.startsOn)), 0);
  if (left === 0) return { long: 'Starts today', short: 'Today' };
  return { long: `Starts in ${left} ${left === 1 ? 'Day' : 'Days'}`, short: `in ${left}d` };
}

export function spotsLeft(activity: PublicActivity): number {
  return Math.max(activity.capacity - activity.taken, 0);
}

/** True while the server would still accept a new entry. */
export function registrationOpen(activity: PublicActivity): boolean {
  if (activity.status !== 'published') return false;
  if (spotsLeft(activity) <= 0) return false;
  return new Date(activity.registrationClosesAt).getTime() > Date.now();
}

/** "₹400 per person", or "Free entry" when there is no fee. */
export function entryFeeLabel(activity: PublicActivity): string {
  const fee = activity.entryFee ?? 0;
  return fee > 0 ? `${price(fee)} ${activity.feeUnit}` : 'Free entry';
}

/** What a place is called on this activity: tickets for an event, teams for a tournament. */
export function placeUnit(activity: PublicActivity, count = 1): string {
  if (activity.kind === 'tournament') return count === 1 ? 'team' : 'teams';
  return count === 1 ? 'ticket' : 'tickets';
}
