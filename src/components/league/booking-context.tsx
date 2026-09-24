"use client";

/**
 * Game On Multisports League — booking draft.
 *
 * The flow (sport → category → details → review → payment) is a set of separate
 * screens, so the draft lives in one client-side context that the league layout
 * mounts above every screen. It is mirrored into sessionStorage so a refresh or
 * deep link during the flow keeps the entry.
 *
 * There is no date screen: the player never picks a match day, so the draft is
 * always pinned to the season's first day. Per-category match days will be shown
 * on the sport page and set here instead.
 *
 * UI only: nothing here talks to the API yet. When the flow goes live the
 * `pricing` block below is replaced by the server's quote.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ADD_ONS,
  entryFees,
  entryTickets,
  findCategories,
  findCoupon,
  findSport,
  type Category,
  type Sport,
  type SportId,
} from "./data";
import { LEAGUE_MATCH_DAYS } from "@/lib/league/constants";
import { quoteEntry } from "@/lib/league/entry";

export interface Draft {
  sport: SportId | null;
  /** Every bracket this entry holds — the player can pick more than one. */
  categoryIds: string[];
  date: string | null;
  slot: string | null;
  /** Headcount for the entry — tickets across every bracket, or the squad size. */
  squadSize: number;
  teamName: string;
  captainName: string;
  phone: string;
  email: string;
  city: string;
  notes: string;
  /** add-on id → quantity */
  addons: Record<string, number>;
  coupon: string | null;
  paymentMethod: string | null;
}

/**
 * The match day every entry is pinned to while the player never chooses one.
 * Per-category days will replace this once they are fixed.
 */
const DEFAULT_MATCH_DAY = LEAGUE_MATCH_DAYS[0].iso;

const EMPTY_DRAFT: Draft = {
  sport: null,
  categoryIds: [],
  date: DEFAULT_MATCH_DAY,
  slot: null,
  squadSize: 1,
  teamName: "",
  captainName: "",
  phone: "",
  email: "",
  city: "",
  notes: "",
  addons: {},
  coupon: null,
  paymentMethod: null,
};

export interface Pricing {
  entryFee: number;
  addOnsTotal: number;
  subtotal: number;
  discount: number;
  platformFee: number;
  gst: number;
  total: number;
  couponCode: string | null;
  couponLabel: string | null;
}

const STORAGE_KEY = "go-league-draft";

interface BookingContextValue {
  draft: Draft;
  /** False until the stored draft has been read — guards wait for this. */
  ready: boolean;
  sport: Sport | null;
  /** Every bracket in the entry, in the order the player picked them. */
  categories: Category[];
  pricing: Pricing;
  update: (patch: Partial<Draft>) => void;
  /** Picks a sport + its brackets and clears anything downstream of it. */
  startBooking: (sport: SportId, categoryIds: string[]) => void;
  toggleAddOn: (id: string) => void;
  setAddOnQty: (id: string, qty: number) => void;
  applyCoupon: (code: string) => { ok: boolean; message: string };
  removeCoupon: () => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function LeagueBookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false);

  // Restore the in-progress entry. Client-only on purpose: the server renders an
  // empty draft so hydration always matches, then this one-time sync fills it in.
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Re-pin the match day: nothing in the flow chooses it, so a stale draft
        // must not be able to leave the entry without a valid day.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of client-only storage
        setDraft({
          ...EMPTY_DRAFT,
          ...(JSON.parse(stored) as Partial<Draft>),
          date: DEFAULT_MATCH_DAY,
        });
      }
    } catch {
      // Unreadable storage simply means a fresh entry.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage can be blocked in private mode; the draft still works in memory.
    }
  }, [draft, ready]);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const startBooking = useCallback((sportId: SportId, categoryIds: string[]) => {
    setDraft((current) => {
      const nextSport = findSport(sportId);
      const nextCategories = findCategories(nextSport, categoryIds);
      const sportChanged = current.sport !== sportId;
      return {
        ...EMPTY_DRAFT,
        teamName: current.teamName,
        captainName: current.captainName,
        phone: current.phone,
        email: current.email,
        city: current.city,
        sport: sportId,
        categoryIds: nextCategories.map((category) => category.id),
        squadSize: Math.max(1, entryTickets(nextCategories)),
        // The player never picks a match day — every entry is pinned to the
        // season's first day. Switching sports invalidates the slot that was held.
        date: DEFAULT_MATCH_DAY,
        slot: sportChanged ? null : current.slot,
        addons: sportChanged ? {} : current.addons,
      };
    });
  }, []);

  const toggleAddOn = useCallback((id: string) => {
    setDraft((current) => {
      const addOn = ADD_ONS.find((item) => item.id === id);
      if (!addOn) return current;
      const addons = { ...current.addons };
      if (addons[id]) {
        delete addons[id];
      } else {
        addons[id] = addOn.unit === "player" ? Math.max(1, current.squadSize) : 1;
      }
      return { ...current, addons };
    });
  }, []);

  const setAddOnQty = useCallback((id: string, qty: number) => {
    setDraft((current) => {
      const addons = { ...current.addons };
      if (qty <= 0) delete addons[id];
      else addons[id] = qty;
      return { ...current, addons };
    });
  }, []);

  const applyCoupon = useCallback(
    (code: string) => {
      const coupon = findCoupon(code);
      if (!coupon) return { ok: false, message: "That code isn't valid for this event." };
      const activeSport = findSport(draft.sport);
      const entryFee = entryFees(findCategories(activeSport, draft.categoryIds));
      if (entryFee < coupon.minSubtotal) {
        return {
          ok: false,
          message: `${coupon.code} needs an entry of ₹${coupon.minSubtotal.toLocaleString("en-IN")} or more.`,
        };
      }
      setDraft((current) => ({ ...current, coupon: coupon.code }));
      return { ok: true, message: `${coupon.code} applied — ${coupon.label}.` };
    },
    [draft.categoryIds, draft.sport]
  );

  const removeCoupon = useCallback(() => {
    setDraft((current) => ({ ...current, coupon: null }));
  }, []);

  const reset = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const sport = useMemo(() => findSport(draft.sport), [draft.sport]);
  const categories = useMemo(
    () => findCategories(sport, draft.categoryIds),
    [sport, draft.categoryIds]
  );

  // The same maths the payment API runs, so the shown total is the charged total.
  const pricing = useMemo<Pricing>(
    () => quoteEntry({ categories, addons: draft.addons, coupon: draft.coupon }),
    [categories, draft.addons, draft.coupon]
  );

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      ready,
      sport,
      categories,
      pricing,
      update,
      startBooking,
      toggleAddOn,
      setAddOnQty,
      applyCoupon,
      removeCoupon,
      reset,
    }),
    [
      draft,
      ready,
      sport,
      categories,
      pricing,
      update,
      startBooking,
      toggleAddOn,
      setAddOnQty,
      applyCoupon,
      removeCoupon,
      reset,
    ]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useLeagueBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useLeagueBooking must be used inside <LeagueBookingProvider>");
  }
  return context;
}
