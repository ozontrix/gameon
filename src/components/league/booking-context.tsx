"use client";

/** Persistent multi-sport cart shared by every league route. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { entryFees, findCoupon, findSport, type Sport, type SportId } from "./data";
import {
  cartCategories, EMPTY_DRAFT, replaceSportSelections, restoreDraft, selectionKey,
  toggleCartSelection, withSelections, type CartCategory, type CartSelection, type Draft,
} from "./cart";
import { quoteEntry, type EntryQuote } from "@/lib/league/entry";

export type { Draft } from "./cart";
export type Pricing = EntryQuote;
const STORAGE_KEY = "go-league-draft";

interface BookingContextValue {
  draft: Draft;
  ready: boolean;
  sport: Sport | null;
  sports: Sport[];
  categories: CartCategory[];
  pricing: Pricing;
  update: (patch: Partial<Draft>) => void;
  startBooking: (sport: SportId, categoryIds: string[]) => void;
  toggleSelection: (sportId: SportId, categoryId: string) => void;
  removeSelection: (selection: CartSelection) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => { ok: boolean; message: string };
  removeCoupon: () => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function LeagueBookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        if (stored) setDraft(restoreDraft(JSON.parse(stored)));
      } catch {
        // Invalid/private session storage must not prevent a fresh booking.
      }
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); }
    catch { /* The in-memory cart still works when storage is unavailable. */ }
  }, [draft, ready]);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((current) => patch.selections
      ? withSelections({ ...current, ...patch }, patch.selections)
      : { ...current, ...patch, addons: {} });
  }, []);
  const startBooking = useCallback((sportId: SportId, categoryIds: string[]) => {
    setDraft((current) => withSelections(current, replaceSportSelections(current.selections, sportId, categoryIds)));
  }, []);
  const toggleSelection = useCallback((sportId: SportId, categoryId: string) => {
    setDraft((current) => withSelections(current, toggleCartSelection(current.selections, { sportId, categoryId })));
  }, []);
  const removeSelection = useCallback((selection: CartSelection) => {
    setDraft((current) => withSelections(current, current.selections.filter((item) => selectionKey(item) !== selectionKey(selection))));
  }, []);
  const clearCart = useCallback(() => setDraft((current) => withSelections(current, [])), []);
  const categories = useMemo(() => cartCategories(draft.selections), [draft.selections]);
  const sports = useMemo(() => [...new Set(categories.map((item) => item.sportId))]
    .map((id) => findSport(id)!), [categories]);
  const sport = sports[0] ?? null;
  const pricing = useMemo(() => quoteEntry({ categories, addons: {}, coupon: draft.coupon }), [categories, draft.coupon]);

  const applyCoupon = useCallback((code: string) => {
    const coupon = findCoupon(code);
    if (!coupon) return { ok: false, message: "That code isn't valid for this event." };
    if (entryFees(categories) < coupon.minSubtotal) {
      return { ok: false, message: `${coupon.code} needs an entry of ₹${coupon.minSubtotal.toLocaleString("en-IN")} or more.` };
    }
    setDraft((current) => ({ ...current, coupon: coupon.code }));
    return { ok: true, message: `${coupon.code} applied — ${coupon.label}.` };
  }, [categories]);
  const removeCoupon = useCallback(() => setDraft((current) => ({ ...current, coupon: null })), []);
  const reset = useCallback(() => setDraft({ ...EMPTY_DRAFT }), []);
  const value = useMemo<BookingContextValue>(() => ({
    draft, ready, sport, sports, categories, pricing, update, startBooking, toggleSelection,
    removeSelection, clearCart, applyCoupon, removeCoupon, reset,
  }), [draft, ready, sport, sports, categories, pricing, update, startBooking, toggleSelection,
    removeSelection, clearCart, applyCoupon, removeCoupon, reset]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useLeagueBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useLeagueBooking must be used inside <LeagueBookingProvider>");
  return context;
}