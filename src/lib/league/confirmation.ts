/**
 * Game On Multisports League — the receipt handed back after a paid entry.
 *
 * The confirm API returns this object, the pay flow stores it in sessionStorage
 * and the confirmation screen renders it, so the pass always reflects what was
 * actually charged — even after a refresh.
 */

import type { EntryQuote } from "./entry";

export const LEAGUE_CONFIRMATION_KEY = "go-league-confirmation";

export interface LeagueConfirmationAddOn {
  id: string;
  name: string;
  emoji: string;
  qty: number;
  amount: number;
}

export interface LeagueConfirmation {
  reference: string;
  orderId: string;
  paymentId: string;
  /** Amount actually charged, in rupees. */
  amount: number;
  currency: string;
  paidAt: string;
  /** False when SMTP refused the mail — the booking is still valid. */
  emailSent: boolean;
  entry: {
    sport: string;
    sportName: string;
    /** Every bracket the entry holds — one entry can cover several. */
    categories: { id: string; name: string }[];
    date: string;
    squadSize: number;
    teamName: string;
    captainName: string;
    email: string;
    phone: string;
    city: string;
    notes: string;
    addons: LeagueConfirmationAddOn[];
    coupon: string | null;
  };
  quote: EntryQuote;
}

/** "Men's Doubles + Men's Singles" — the brackets of an entry in one label. */
export function confirmationBrackets(entry: LeagueConfirmation["entry"]): string {
  return entry.categories.map((category) => category.name).join(" + ");
}
