'use client';

/**
 * Checkout — `/app/book/payment`. The web twin of the handset app's
 * `app/book/payment.tsx`.
 *
 * The order of operations is the same, because it is the order that keeps money
 * and court time honest:
 *
 *   1. `POST /user/bookings` holds the slot. The *server* prices it and clamps the
 *      Points against the player's real balance, so neither figure is trusted from
 *      here.
 *   2. Points that cover the whole price confirm the booking outright — there is
 *      nothing left for the gateway to take, so no order is created.
 *   3. Otherwise a Razorpay order is created for what the Points did not cover.
 *
 * Abandoning checkout gives the slot back, so the player (or anyone else) can book
 * it straight away instead of waiting for the hold to lapse.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BookingSummaryCard, type SummaryFact } from '@/components/mobile/payment/booking-summary-card';
import {
  RazorpayCheckout,
  type RazorpayOptions,
  type RazorpaySuccess,
} from '@/components/mobile/payment/razorpay-checkout';
import { SecureBadge, TrustStrip } from '@/components/mobile/payment/trust-strip';
import { WalletBlock } from '@/components/mobile/payment/wallet-block';
import { WhatsAppConsent } from '@/components/mobile/payment/whatsapp-consent';
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  Ion,
  Screen,
  ScreenScroll,
  SignInGate,
  StickyFooter,
} from '@/components/mobile/ui';
import { useBookingDraft } from '@/components/mobile/booking-draft-provider';
import { useBookings } from '@/components/mobile/bookings-store';
import { useSession } from '@/components/mobile/session-provider';
import { useWallet } from '@/components/mobile/wallet-provider';
import { price } from '@/lib/mobile/constants/config';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';
import { ApiError, api } from '@/lib/mobile/api-client';

/** What `POST /user/bookings` answers with. */
type HoldResponse = {
  bookingId: string;
  amount?: number;
  remainingPayable?: number;
};

/** What `POST /user/payments/create-order` answers with. */
type OrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

export default function PaymentPage() {
  const router = useRouter();
  const { draft, update, summary } = useBookingDraft();
  const {
    venue,
    itemTitle,
    dateLabel,
    slotLabel,
    total,
    maxRedeemablePoints,
    walletPointsApplied,
    walletValue,
    amountToPay,
  } = summary;

  const { isGuest, user } = useSession();
  const [whatsappConsent, setWhatsAppConsent] = useState(false);
  const [paying, setPaying] = useState(false);
  const [rzpState, setRzpState] = useState<{ options: RazorpayOptions; bookingId: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { refresh: refreshBookings } = useBookings();
  const { summary: wallet, refresh: refreshWallet } = useWallet();

  const sport = venue?.sport;

  /**
   * Verifies the payment that just succeeded. Declared up here with the other
   * hooks — the guest and empty-draft guards below return early, and a hook must
   * not sit behind an early return.
   */
  const onPaid = useCallback(
    async (result: RazorpaySuccess) => {
      const bookingId = rzpState?.bookingId;
      if (!bookingId) return;
      setRzpState(null); // The gateway's modal closes itself; drop our reference.

      try {
        // Verify through the backend. Razorpay's webhook confirms it too, so a
        // dropped connection here does not lose the booking.
        await api.post('/user/payments/verify', { ...result, bookingId });

        void refreshBookings();
        void refreshWallet();
        update({ paymentId: result.razorpay_payment_id });
        // The id travels with the route so the success screen can show the
        // confirmed booking from the server rather than this in-memory draft.
        router.replace(`/app/book/success?booking=${bookingId}`);
      } catch (error) {
        setPaying(false);
        if (error instanceof ApiError && error.body?.code === 'SLOT_TAKEN') {
          setNotice(error.message);
          return;
        }
        void refreshBookings();
        setNotice(
          'We could not confirm your payment. Check My Bookings before paying again. If a deducted payment is still missing, contact info@gameonmultisports.com.',
        );
      }
    },
    [rzpState, update, refreshBookings, refreshWallet, router],
  );

  // The footer's real height, so the amount row and the CTA are never hidden by
  // the scroll. Stands in for the handset app's `onHeight` callback.
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const element = footerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setFooterHeight(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (isGuest) {
    return (
      <Screen>
        <AppHeader variant="back" showBell={false} />
        <SignInGate
          icon="lockClosedOutline"
          title="Sign in to pay"
          body="Checkout needs a verified mobile number, so we can send your confirmation and receipt."
        />
      </Screen>
    );
  }

  if (!sport) {
    return (
      <Screen>
        <AppHeader variant="back" />
        <EmptyState
          icon="cardOutline"
          title="Nothing to pay for yet"
          body="Pick a court and a time slot to continue to checkout."
          actionLabel="Browse Sports"
          onAction={() => router.replace('/app/sports')}
        />
      </Screen>
    );
  }

  const facts: SummaryFact[] = [
    { label: 'Date', value: dateLabel, icon: <Ion name="calendarOutline" size={13} color={Brand.textSecondary} /> },
    { label: 'Time', value: slotLabel, icon: <Ion name="timeOutline" size={13} color={Brand.textSecondary} /> },
    {
      label: 'Court',
      value: draft.facilityName ?? '—',
      icon: <Ion name="gridOutline" size={13} color={Brand.textSecondary} />,
    },
  ];

  /**
   * Gives the slot back when checkout is abandoned, so the player (or anyone else)
   * can book it straight away instead of waiting for the hold to lapse. The server
   * refuses if the booking has been paid in the meantime.
   */
  const releaseHold = (bookingId: string) => {
    api.post(`/user/bookings/${bookingId}/cancel`, {}).catch((error) => {
      console.warn('Could not release the slot hold', error);
    });
  };

  const closeCheckout = () => {
    if (rzpState) releaseHold(rzpState.bookingId);
    setRzpState(null);
    setPaying(false);
  };

  const pay = async () => {
    if (paying) return;
    setPaying(true);
    setNotice(null);
    let bookingId: string | null = null;

    try {
      // The draft must carry a court and a slot before any money moves; guarded here
      // rather than trusting the screen that set it up.
      if (!draft.facilityId || !draft.slotKey || !draft.slotEnd) {
        setPaying(false);
        setNotice('Choose a court and a time slot before paying.');
        return;
      }

      // 1. Hold the slot.
      const digits = draft.mobile.replace(/\D/g, '');
      const held = (await api.post('/user/bookings', {
        facilityId: draft.facilityId,
        date: draft.dateKey,
        startTime: draft.slotKey,
        endTime: draft.slotEnd,
        players: draft.players,
        contactName: draft.contactName.trim() || undefined,
        contactPhone: digits || undefined,
        contactEmail: draft.email.trim() || undefined,
        whatsappConsent,
        notes: draft.notes.trim() || undefined,
        walletPointsToUse: walletPointsApplied,
      })) as unknown as HoldResponse;

      bookingId = held.bookingId;

      // 2. Points that cover the whole price confirm the booking outright.
      const remainingPayable = Number(held.remainingPayable ?? held.amount ?? 0);
      if (remainingPayable <= 0) {
        await api.post(`/user/bookings/${held.bookingId}/confirm-with-wallet`, {});
        void refreshBookings();
        void refreshWallet();
        update({ paymentId: `WALLET-${held.bookingId.slice(0, 8).toUpperCase()}` });
        router.replace(`/app/book/success?booking=${held.bookingId}`);
        return;
      }

      // 3. Initialize a Razorpay Order for whatever the Points did not cover.
      const order = (await api.post('/user/payments/create-order', {
        bookingId: held.bookingId,
      })) as unknown as OrderResponse;

      setRzpState({
        bookingId: held.bookingId,
        options: {
          description: 'Court Booking',
          currency: order.currency,
          key: order.keyId,
          amount: order.amount,
          name: 'GameOn Multi-Sports',
          order_id: order.orderId,
          prefill: {
            name: draft.contactName.trim(),
            email: draft.email.trim() || user?.email || '',
            contact: digits,
          },
          theme: { color: '#28a745' },
        },
      });
    } catch (error) {
      console.error('Booking failed:', error);
      if (bookingId) releaseHold(bookingId);
      setPaying(false);
      setNotice(error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <Screen>
      <AppHeader variant="back" />

      <ScreenScroll bottomLayer="footer" bottomInset={footerHeight} gap={Spacing.lg}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: Spacing.md,
          }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
            <span style={{ ...Typography.screenTitle, color: Brand.text }}>Payment</span>
            <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
              Complete your payment to confirm your booking.
            </span>
          </div>
          <SecureBadge />
        </div>

        {/*
          Stands in for the handset app's `Alert`: a checkout problem has to be
          readable next to the thing it is about, and must survive being read twice.
        */}
        {notice ? (
          <Card style={{ display: 'flex', gap: Spacing.sm, alignItems: 'flex-start' }}>
            <Ion name="warningOutline" size={16} color={Brand.danger} />
            <span style={{ ...Typography.caption, color: Brand.text, flex: 1, lineHeight: '18px' }}>
              {notice}
            </span>
          </Card>
        ) : null}

        <BookingSummaryCard
          title={itemTitle}
          sport={sport}
          image={venue?.image}
          facts={facts}
          totalLabel="Total Amount"
          total={total}
          collapsible
        />

        <WalletBlock
          balance={wallet.balance}
          maxUsable={maxRedeemablePoints}
          enabled={draft.useWallet}
          onToggle={(enabled) =>
            update({ useWallet: enabled, walletPoints: enabled ? maxRedeemablePoints : 0 })
          }
          amount={walletPointsApplied}
          onAmountChange={(points) => update({ walletPoints: points })}
          walletValue={walletValue}
          amountToPay={amountToPay}
        />

        <WhatsAppConsent value={whatsappConsent} onChange={setWhatsAppConsent} disabled={paying} />
        <TrustStrip />
      </ScreenScroll>

      <StickyFooter>
        <div
          ref={footerRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: Spacing.md,
          }}>
          <div>
            <span
              style={{ ...Typography.priceSmall, color: Brand.text, display: 'block' }}>
              {price(amountToPay)}
            </span>
            <span style={{ ...Typography.caption, color: Brand.textMuted }}>Amount to Pay</span>
          </div>
          <Button
            label="Pay Securely"
            icon={<Ion name="lockClosed" size={14} color={Brand.onAccent} />}
            size="md"
            loading={paying}
            onPress={() => void pay()}
          />
        </div>
      </StickyFooter>

      <RazorpayCheckout
        options={rzpState?.options ?? null}
        onSuccess={(result) => void onPaid(result)}
        onDismiss={closeCheckout}
        onFailed={(message) => {
          closeCheckout();
          setNotice(message);
        }}
      />
    </Screen>
  );
}
