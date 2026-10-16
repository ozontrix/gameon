'use client';

/**
 * The booking being assembled — the web twin of the app `context/booking-draft.tsx`.
 *
 * It is a cart: the sport detail screen puts the card, the court, the slot and
 * the contact details in; checkout reads them out. Nothing is persisted, which is
 * why the success screen re-reads the confirmed booking from the server rather
 * than trusting anything here.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { pointsToRupees, rupeesToPoints } from '@/lib/mobile/constants/payment';
import { SLOT_DATES, clockLabel, durationLabel, slotMinutes } from '@/lib/mobile/constants/slots';
import type { Venue } from '@/lib/mobile/constants/sports';
import { useWallet } from './wallet-provider';

export type BookingDraft = {
  venueKey?: string;
  /**
   * The card being booked, as the sport detail screen fetched it by id. Held
   * here like a cart holds its product, so checkout never has to find it again in
   * some other list that may be stale or still loading.
   */
  venue?: Venue;
  dateKey: string;
  /** Slot start as the API sends it, e.g. `"18:00:00"`. */
  slotKey?: string;
  /** Slot end, e.g. `"19:00:00"`. */
  slotEnd?: string;
  facilityId?: string;
  facilityName?: string;
  /** The slot length the player picked, one of the card's slot options. */
  slotMinutes?: number;
  players: number;
  contactName: string;
  mobile: string;
  email: string;
  notes: string;
  useWallet: boolean;
  walletPoints: number;
  paymentMethod: string;
  promoCode: string;
  paymentId?: string;
};

const INITIAL_DRAFT: BookingDraft = {
  dateKey: SLOT_DATES[0].key,
  players: 4,
  // Prefilled from the signed-in player on the court screen.
  contactName: '',
  mobile: '',
  email: '',
  notes: '',
  useWallet: false,
  /**
   * Points the player asked for. 0 means "as many as the booking can absorb",
   * which is what the checkout toggle sets; the wallet block's EDIT fields an
   * explicit figure here.
   */
  walletPoints: 0,
  paymentMethod: 'upi',
  promoCode: '',
};

export type BookingSummary = {
  venue?: Venue;
  itemTitle: string;
  dateLabel: string;
  slotLabel: string;
  /** e.g. "1 hr" — the length of the chosen slot. */
  durationLabel: string;
  courtLabel: string;
  total: number;
  maxRedeemablePoints: number;
  walletPointsApplied: number;
  walletValue: number;
  amountToPay: number;
};

type BookingDraftValue = {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
  summary: BookingSummary;
};

const BookingDraftContext = createContext<BookingDraftValue | null>(null);

export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(INITIAL_DRAFT);
  // The live Points balance, read from the wallet rather than a constant, so the
  // wallet screen and checkout can never disagree about what is available.
  const { summary: wallet } = useWallet();
  const walletBalance = wallet.balance;

  const value = useMemo<BookingDraftValue>(() => {
    const venue = draft.venueKey && draft.venue?.key === draft.venueKey ? draft.venue : undefined;
    const date = SLOT_DATES.find((entry) => entry.key === draft.dateKey);
    // The chosen slot length's own price — the same the server charges. Before a
    // length is picked, the card's first (shortest) option stands in for display.
    const slotOption =
      venue?.slotOptions.find((option) => option.durationMinutes === draft.slotMinutes) ??
      venue?.slotOptions[0];
    const minutes =
      draft.slotKey && draft.slotEnd
        ? slotMinutes(draft.slotKey, draft.slotEnd)
        : slotOption?.durationMinutes ?? 60;

    const total = slotOption?.price ?? 0;

    const maxRedeemablePoints = Math.min(walletBalance, rupeesToPoints(total));
    const walletPointsApplied = draft.useWallet
      ? draft.walletPoints > 0
        ? Math.min(draft.walletPoints, maxRedeemablePoints)
        : maxRedeemablePoints
      : 0;
    const walletValue = pointsToRupees(walletPointsApplied);

    return {
      draft,
      update: (patch) => setDraft((current) => ({ ...current, ...patch })),
      reset: () => setDraft(INITIAL_DRAFT),
      summary: {
        venue,
        itemTitle: venue?.title ?? '',
        dateLabel: date?.label ?? draft.dateKey,
        slotLabel:
          draft.slotKey && draft.slotEnd
            ? `${clockLabel(draft.slotKey)} – ${clockLabel(draft.slotEnd)}`
            : 'No slot chosen',
        durationLabel: durationLabel(minutes),
        courtLabel: draft.facilityName ?? 'Choose a court',
        total,
        maxRedeemablePoints,
        walletPointsApplied,
        walletValue,
        amountToPay: Math.max(total - walletValue, 0),
      },
    };
  }, [draft, walletBalance]);

  return <BookingDraftContext.Provider value={value}>{children}</BookingDraftContext.Provider>;
}

export function useBookingDraft(): BookingDraftValue {
  const value = useContext(BookingDraftContext);
  if (!value) throw new Error('useBookingDraft must be used inside a BookingDraftProvider');
  return value;
}
