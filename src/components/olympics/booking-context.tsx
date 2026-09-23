"use client";

/**
 * Game On Olympics — booking draft.
 *
 * The flow (sport → category → slot → details → payment) is a set of separate
 * screens, so the draft lives in one client-side context that the
 * `gameon-olympics` layout mounts above every screen. It is mirrored into
 * sessionStorage so a refresh or deep link during the flow keeps the entry.
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
  GST_RATE,
  PLATFORM_FEE,
  findCategory,
  findCoupon,
  findSport,
  type Category,
  type Sport,
  type SportId,
} from "./data";

export interface Draft {
  sport: SportId | null;
  categoryId: string | null;
  date: string | null;
  slot: string | null;
  /** Headcount for the entry — squad size for team sports. */
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

const EMPTY_DRAFT: Draft = {
  sport: null,
  categoryId: null,
  date: null,
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

const STORAGE_KEY = "go-olympics-draft";

interface BookingContextValue {
  draft: Draft;
  /** False until the stored draft has been read — guards wait for this. */
  ready: boolean;
  sport: Sport | null;
  category: Category | null;
  pricing: Pricing;
  update: (patch: Partial<Draft>) => void;
  /** Picks a sport + category and clears anything downstream of it. */
  startBooking: (sport: SportId, categoryId: string) => void;
  toggleAddOn: (id: string) => void;
  setAddOnQty: (id: string, qty: number) => void;
  applyCoupon: (code: string) => { ok: boolean; message: string };
  removeCoupon: () => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function OlympicsBookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false);

  // Restore the in-progress entry. Client-only on purpose: the server renders an
  // empty draft so hydration always matches, then this one-time sync fills it in.
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of client-only storage
      if (stored) setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(stored) as Partial<Draft>) });
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

  const startBooking = useCallback((sportId: SportId, categoryId: string) => {
    setDraft((current) => {
      const nextSport = findSport(sportId);
      const nextCategory = findCategory(nextSport, categoryId);
      const sportChanged = current.sport !== sportId;
      return {
        ...EMPTY_DRAFT,
        teamName: current.teamName,
        captainName: current.captainName,
        phone: current.phone,
        email: current.email,
        city: current.city,
        sport: sportId,
        categoryId,
        squadSize: nextCategory?.squadSize ?? 1,
        // Switching sports invalidates the slot that was held.
        date: sportChanged ? null : current.date,
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
      const entryFee = findCategory(activeSport, draft.categoryId)?.fee ?? 0;
      if (entryFee < coupon.minSubtotal) {
        return {
          ok: false,
          message: `${coupon.code} needs an entry of ₹${coupon.minSubtotal.toLocaleString("en-IN")} or more.`,
        };
      }
      setDraft((current) => ({ ...current, coupon: coupon.code }));
      return { ok: true, message: `${coupon.code} applied — ${coupon.label}.` };
    },
    [draft.categoryId, draft.sport]
  );

  const removeCoupon = useCallback(() => {
    setDraft((current) => ({ ...current, coupon: null }));
  }, []);

  const reset = useCallback(() => setDraft(EMPTY_DRAFT), []);

  const sport = useMemo(() => findSport(draft.sport), [draft.sport]);
  const category = useMemo(() => findCategory(sport, draft.categoryId), [sport, draft.categoryId]);

  const pricing = useMemo<Pricing>(() => {
    const entryFee = category?.fee ?? 0;
    const addOnsTotal = Object.entries(draft.addons).reduce((sum, [id, qty]) => {
      const addOn = ADD_ONS.find((item) => item.id === id);
      return addOn ? sum + addOn.price * qty : sum;
    }, 0);
    const subtotal = entryFee + addOnsTotal;
    const coupon = draft.coupon ? findCoupon(draft.coupon) : null;
    const discount = coupon ? Math.round((subtotal * coupon.percent) / 100) : 0;
    const platformFee = subtotal > 0 ? PLATFORM_FEE : 0;
    const taxable = Math.max(0, subtotal - discount) + platformFee;
    const gst = Math.round(taxable * GST_RATE);
    return {
      entryFee,
      addOnsTotal,
      subtotal,
      discount,
      platformFee,
      gst,
      total: taxable + gst,
      couponCode: coupon?.code ?? null,
      couponLabel: coupon?.label ?? null,
    };
  }, [category, draft.addons, draft.coupon]);

  const value = useMemo<BookingContextValue>(
    () => ({
      draft,
      ready,
      sport,
      category,
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
      category,
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

export function useOlympicsBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useOlympicsBooking must be used inside <OlympicsBookingProvider>");
  }
  return context;
}
