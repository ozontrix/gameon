"use client";

/** Persistent multi-sport cart shared by every league route. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { entryFees, findSport, type Sport, type SportId } from "./data";
import type { PublicCoupon } from "@/lib/league/coupons";
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
  coupons: PublicCoupon[];
  couponsLoading: boolean;
  couponError: string | null;
  update: (patch: Partial<Draft>) => void;
  startBooking: (sport: SportId, categoryIds: string[]) => void;
  toggleSelection: (sportId: SportId, categoryId: string) => void;
  removeSelection: (selection: CartSelection) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function LeagueBookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false);
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatedCoupon, setValidatedCoupon] = useState<{ key: string; coupon: PublicCoupon } | null>(null);

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
  const entryFee = entryFees(categories);
  const couponKey = JSON.stringify([draft.coupon, entryFee, draft.email, draft.phone]);
  const couponDefinition = validatedCoupon?.key === couponKey ? validatedCoupon.coupon : null;
  const pricing = useMemo(() => quoteEntry({ categories, addons: {}, coupon: draft.coupon, couponDefinition }), [categories, draft.coupon, couponDefinition]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch('/api/v1/public/league/coupons', { cache: 'no-store', signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) { setCoupons(result.coupons); setCouponError(null); }
      } catch {
        if (active) { setCoupons([]); setCouponError('Coupons could not be loaded. Try applying your code again shortly.'); }
      } finally { if (active) setCouponsLoading(false); }
    }
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  useEffect(() => {
    if (!ready || !draft.coupon || !entryFee || !draft.email || !draft.phone) return;
    const controller = new AbortController();
    let active = true;
    async function validate() {
      try {
        const response = await fetch('/api/v1/public/league/coupons', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ code: draft.coupon, entryFee, email: draft.email, phone: draft.phone }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) { setValidatedCoupon({ key: couponKey, coupon: result.coupon }); setCouponError(null); }
      } catch (error) {
        if (active) { setValidatedCoupon(null); setCouponError(error instanceof Error ? error.message : 'Coupon could not be checked.'); }
      }
    }
    void validate();
    const timer = window.setInterval(validate, 30000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [ready, draft.coupon, draft.email, draft.phone, entryFee, couponKey]);

  const applyCoupon = useCallback(async (code: string) => {
    try {
      const response = await fetch('/api/v1/public/league/coupons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, entryFee, email: draft.email, phone: draft.phone }),
      });
      const result = await response.json();
      if (!response.ok) return { ok: false, message: result.error ?? 'Coupon unavailable.' };
      const coupon = result.coupon as PublicCoupon;
      setValidatedCoupon({ key: JSON.stringify([coupon.code, entryFee, draft.email, draft.phone]), coupon });
      setDraft((current) => ({ ...current, coupon: coupon.code }));
      setCouponError(null);
      return { ok: true, message: `${coupon.code} applied — ${coupon.label}.` };
    } catch {
      return { ok: false, message: 'Coupon could not be checked. Please try again.' };
    }
  }, [entryFee, draft.email, draft.phone]);
  const removeCoupon = useCallback(() => setDraft((current) => ({ ...current, coupon: null })), []);
  const reset = useCallback(() => setDraft({ ...EMPTY_DRAFT }), []);
  const value = useMemo<BookingContextValue>(() => ({
    draft, ready, sport, sports, categories, pricing, coupons, couponsLoading, couponError, update, startBooking, toggleSelection,
    removeSelection, clearCart, applyCoupon, removeCoupon, reset,
  }), [draft, ready, sport, sports, categories, pricing, coupons, couponsLoading, couponError, update, startBooking, toggleSelection,
    removeSelection, clearCart, applyCoupon, removeCoupon, reset]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useLeagueBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) throw new Error("useLeagueBooking must be used inside <LeagueBookingProvider>");
  return context;
}