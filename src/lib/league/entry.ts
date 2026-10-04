/**
 * Game On Multisports League — entry shape, server-side quote and reference.
 *
 * One implementation of the money maths is shared by the review screen (what the
 * player sees) and the payment APIs (what Razorpay charges), so the two can
 * never disagree. The server always recomputes the amount — the client's figure
 * is only ever used for display.
 */

import { z } from "zod";
import {
  ADD_ONS,
  categoryDates,
  entryFees,
  entryTickets,
  findSport,
  type Category,
  type Sport,
} from "@/components/league/data";
import { findMatchDay } from "./constants";
import { cartCategories, normalizeSelections, type CartCategory } from "@/components/league/cart";
import { couponDiscount, type PublicCoupon } from "./coupons";

/* ───────────────────────────── Shape ───────────────────────────── */

export const LEAGUE_SPORT_IDS = ["badminton", "pickleball", "cricket", "football"] as const;

export const LeagueEntrySchema = z.object({
  sport: z.enum(LEAGUE_SPORT_IDS).optional(),
  /** Every bracket the player is entering — one entry can hold several. */
  categoryIds: z.array(z.string().trim().min(1).max(40)).min(1).max(7).optional(),
  selections: z.array(z.object({
    sportId: z.enum(LEAGUE_SPORT_IDS),
    categoryId: z.string().trim().min(1).max(40),
  })).min(1).max(14).optional(),
  date: z.string().trim().min(8).max(10),
  squadSize: z.number().int().min(1).max(30).optional(),
  teamName: z.string().trim().max(60).optional().default(""),
  captainName: z.string().trim().min(3, "Please enter the player's full name.").max(80),
  phone: z.string().trim().min(10, "Please enter a valid mobile number.").max(18),
  email: z.email("Please enter a valid email address."),
  city: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(400).optional().default(""),
  addons: z.record(z.string().max(40), z.number().int().min(0).max(30)).optional().default({}),
  coupon: z.string().trim().max(20).nullish(),
});

export type LeagueEntryInput = z.infer<typeof LeagueEntrySchema>;

/** The normalised entry that the APIs, the email and the pass all agree on. */
export interface LeagueEntry {
  sport: Sport;
  sports: Sport[];
  /** The brackets in this entry, in the order the player picked them. */
  categories: CartCategory[];
  date: string;
  dates: string[];
  squadSize: number;
  teamName: string;
  captainName: string;
  phone: string;
  email: string;
  city: string;
  notes: string;
  addons: { id: string; name: string; emoji: string; qty: number; amount: number }[];
  coupon: string | null;
}

export interface EntryQuote {
  entryFee: number;
  addOnsTotal: number;
  subtotal: number;
  discount: number;
  total: number;
  couponCode: string | null;
  couponLabel: string | null;
}

/* ───────────────────────────── Validation ───────────────────────────── */

export type ParseResult =
  | { ok: true; entry: LeagueEntry; quote: EntryQuote }
  | { ok: false; error: string };

/**
 * Validates an untrusted payload, pins the numbers the player cannot choose
 * (squad size comes from the bracket, never from the client) and quotes it.
 */
export function parseLeagueEntry(input: unknown): ParseResult {
  const parsed = LeagueEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid entry details." };
  }

  const data = parsed.data;
  const requested = data.selections ?? (data.categoryIds ?? []).map((categoryId) => ({ sportId: data.sport, categoryId }));
  const selections = normalizeSelections(requested);
  const requestedKeys = new Set(requested.map((item) => `${item.sportId}:${item.categoryId}`));
  if (!selections.length || selections.length !== requestedKeys.size) {
    return { ok: false, error: "One of your sport categories is no longer on the board." };
  }
  const categories = cartCategories(selections);
  const sports = [...new Set(categories.map((item) => item.sportId))].map((id) => findSport(id)!);
  const sport = sports[0];

  if (!findMatchDay(data.date)) return { ok: false, error: "Please pick one of the two match days." };
  const dates = categoryDates(categories);
  if (data.date !== dates[0]) {
    return { ok: false, error: "The match date does not match your categories. Please select your categories again." };
  }

  if (sports.some((item) => item.mode === "team") && data.teamName.trim().length < 2) {
    return { ok: false, error: "Please enter a team name." };
  }

  const addons = Object.entries(data.addons)
    .map(([id, qty]) => {
      const addOn = ADD_ONS.find((item) => item.id === id);
      if (!addOn || qty <= 0) return null;
      return {
        id: addOn.id,
        name: addOn.name,
        emoji: addOn.emoji,
        qty,
        amount: addOn.price * qty,
      };
    })
    .filter((line): line is LeagueEntry["addons"][number] => line !== null);

  const entry: LeagueEntry = {
    sport,
    sports,
    categories,
    date: dates[0],
    dates,
    // Team sports: the minimum required squad. Individual brackets: one ticket
    // per player, summed across every bracket in the entry.
    squadSize: entryTickets(categories),
    teamName: data.teamName.trim(),
    captainName: data.captainName.trim(),
    phone: data.phone.trim(),
    email: data.email.trim().toLowerCase(),
    city: data.city.trim(),
    notes: data.notes.trim(),
    addons: data.selections ? [] : addons,
    coupon: data.coupon?.trim().toUpperCase() || null,
  };

  return { ok: true, entry, quote: quoteEntry({ categories: entry.categories, addons: data.selections ? {} : data.addons, coupon: entry.coupon }) };
}

/* ───────────────────────────── Money ───────────────────────────── */

/** Everything the money maths needs — the client draft and the server entry both fit. */
export interface QuoteInput {
  categories: Category[] | null;
  addons: Record<string, number>;
  coupon: string | null;
  /** A code alone never changes the price. */
  couponDefinition?: PublicCoupon | null;
}

/**
 * The single source of truth for what a league entry costs.
 *
 * There are no extra charges: the brackets' entry fees plus any add-ons, less
 * the coupon, are the whole bill. No platform fee and no GST is added on top.
 */
export function quoteEntry(input: QuoteInput): EntryQuote {
  const entryFee = entryFees(input.categories ?? []);
  const addOnsTotal = Object.entries(input.addons).reduce((sum, [id, qty]) => {
    const addOn = ADD_ONS.find((item) => item.id === id);
    return addOn && qty > 0 ? sum + addOn.price * qty : sum;
  }, 0);
  const subtotal = entryFee + addOnsTotal;

  const coupon = input.couponDefinition?.code === input.coupon ? input.couponDefinition : null;
  const eligible = Boolean(coupon && entryFee >= coupon.min_entry_fee);
  const discount = couponDiscount(entryFee, eligible ? coupon : null);

  return {
    entryFee,
    addOnsTotal,
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount),
    couponCode: eligible && coupon ? coupon.code : null,
    couponLabel: eligible && coupon ? coupon.label : null,
  };
}

/* ───────────────────────────── Reference ───────────────────────────── */

/**
 * The player-facing reference on the pass and the email. Derived from the
 * Razorpay payment id, so the same payment always produces the same reference.
 */
export function entryReference(orderId: string, paymentId: string): string {
  const seed = `${orderId}|${paymentId}`;
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return `GOL-${Math.abs(value).toString(36).toUpperCase().slice(0, 6).padEnd(6, "0")}`;
}
