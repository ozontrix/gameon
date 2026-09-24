/**
 * Game On Multisports League — locked event identity.
 *
 * Shared by the booking flow, the payment APIs and the confirmation email, so
 * the dates, venue and contact details can never drift apart.
 */

export const LEAGUE_NAME = "Game On Multisports League";
export const LEAGUE_TAGLINE = "Season 1 · 17 & 18 October 2026";
export const LEAGUE_VENUE = "GameOn Multisports Complex, Sector 70, Gurugram";
export const LEAGUE_HELP_PHONE = "+91 98110 00000";
export const LEAGUE_HELP_EMAIL = "info@gameonmultisports.com";

export interface LeagueMatchDay {
  iso: string;
  label: string;
}

/** The two match days. The draft pins the first; the APIs and email read them all. */
export const LEAGUE_MATCH_DAYS: LeagueMatchDay[] = [
  { iso: "2026-10-17", label: "Day 1" },
  { iso: "2026-10-18", label: "Day 2" },
];

export function findMatchDay(iso: string | null | undefined): LeagueMatchDay | null {
  return LEAGUE_MATCH_DAYS.find((day) => day.iso === iso) ?? null;
}

/** "Saturday, 17 October 2026" — used by the email and the pass. */
export function matchDayLabel(iso: string | null | undefined): string {
  if (!iso) return "Match day to be confirmed";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
