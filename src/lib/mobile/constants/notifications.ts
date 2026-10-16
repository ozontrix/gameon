/**
 * The notification vocabulary — the web twin of the app's
 * `constants/notifications.ts`.
 */

export type NotificationKind =
  | 'booking'
  | 'reminder'
  | 'tournament'
  | 'wallet'
  | 'facility'
  | 'offer'
  | 'general';

export type NotificationSection = 'today' | 'thisWeek' | 'earlier';

/** One row on the Notifications screen, built from the API's notification. */
export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  /** Body text. May contain `\n` for line breaks. */
  message: string;
  /** Optional substring of `message` to render in the brand accent colour. */
  highlight?: string;
  /** When true the row shows an orange unread dot instead of a chevron. */
  unread: boolean;
  /** Short, already-formatted timestamp, e.g. "6:45 PM" or "18 Sep". */
  time: string;
  /** Optional small label badge next to the title, e.g. "New". */
  badge?: string;
  section: NotificationSection;
  /** In-app route to open on tap. */
  link?: string | null;
};

/** The filter pills, and the kinds each one keeps. `null` shows everything. */
export const NOTIFICATION_FILTERS: {
  key: string;
  label: string;
  kinds: NotificationKind[] | null;
}[] = [
  { key: 'all', label: 'All', kinds: null },
  { key: 'bookings', label: 'Bookings', kinds: ['booking', 'reminder'] },
  { key: 'events', label: 'Events', kinds: ['tournament'] },
  { key: 'offers', label: 'Offers', kinds: ['offer'] },
  { key: 'updates', label: 'Updates', kinds: ['facility', 'general', 'wallet'] },
];

export const SECTION_TITLES: { key: NotificationSection; title: string }[] = [
  { key: 'today', title: 'Today' },
  { key: 'thisWeek', title: 'This Week' },
  { key: 'earlier', title: 'Earlier' },
];
