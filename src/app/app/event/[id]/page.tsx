'use client';

/**
 * Event detail — `/app/event/[id]`. The web twin of the handset app's
 * `app/event/[id].tsx`.
 *
 * The whole purchase is the same four steps as the handset build, and the server
 * owns every figure in them:
 *
 *   1. `POST /user/events/:id/tickets` holds the tickets for ten minutes and
 *      returns the order. A free event comes back already confirmed.
 *   2. `POST /user/event-orders/:id/payments/create-order` opens a Razorpay order
 *      for the fee the server set.
 *   3. `POST /user/event-orders/:id/payments/verify` is what actually issues the
 *      tickets — the gateway's word alone is not enough.
 *   4. Backing out calls `.../cancel`, so the tickets are on sale again at once
 *      rather than after the hold lapses.
 */

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ActivityBody } from '@/components/mobile/events/activity-body';
import { DetailHero } from '@/components/mobile/events/detail-hero';
import {
  RazorpayCheckout,
  type RazorpayOptions,
  type RazorpaySuccess,
} from '@/components/mobile/payment/razorpay-checkout';
import { WhatsAppConsent } from '@/components/mobile/payment/whatsapp-consent';
import {
  AppHeader,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  InfoNote,
  Ion,
  PressableScale,
  Screen,
  ScreenScroll,
  SignInSheet,
  Spinner,
  StickyFooter,
  TextField,
} from '@/components/mobile/ui';
import { useSession } from '@/components/mobile/session-provider';
import { price } from '@/lib/mobile/constants/config';
import {
  dateRangeLabel,
  entryFeeLabel,
  registrationOpen,
  spotsLeft,
  timeRangeLabel,
  type PublicEvent,
} from '@/lib/mobile/constants/events';
import { Brand, Layout, Spacing, Typography } from '@/lib/mobile/theme';
import { ApiError, api } from '@/lib/mobile/api-client';
import { useApi } from '@/lib/mobile/use-api';

/** The biggest order the server will accept, whatever the event allows. */
const HARD_MAX_TICKETS = 50;

/** `+919876543210` → `9876543210`, for the 10-digit mobile field. */
function nationalNumber(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '').slice(-10);
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { isGuest, user, profile } = useSession();

  // Read by id rather than out of the listing: a deep link should open an event
  // whatever its status, which is what the public endpoint allows.
  const { data: event, loading, error, refetch } = useApi<PublicEvent>(
    id ? `/public/events/${id}` : null,
  );

  const [sheet, setSheet] = useState<'none' | 'buy'>('none');
  const [signInOpen, setSignInOpen] = useState(false);
  const [tickets, setTickets] = useState(1);
  const [typed, setTyped] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [notes, setNotes] = useState('');
  const [whatsappConsent, setWhatsAppConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<RazorpayOptions | null>(null);
  const [heldOrderId, setHeldOrderId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ orderId: string; tickets: number } | null>(null);

  // The footer's real height, so the scroll clears it — the app's `onHeight`.
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const element = footerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setFooterHeight(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The account's own details show until the player edits a field, so nothing
  // re-seeds underneath them.
  const attendeeName = typed.name ?? profile?.full_name ?? user?.fullName ?? '';
  const contactPhone = typed.phone ?? nationalNumber(profile?.phone ?? user?.phoneNumber);
  const contactEmail = typed.email ?? profile?.email ?? user?.email ?? '';

  if (loading && !event) {
    return (
      <Screen>
        <AppHeader variant="back" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <AppHeader variant="back" />
        <EmptyState
          icon="alertCircleOutline"
          title="Event not found"
          body={error ?? 'This event is no longer listed.'}
          actionLabel="Try Again"
          onAction={refetch}
        />
      </Screen>
    );
  }

  const open = registrationOpen(event);
  const left = spotsLeft(event);
  const maxTickets = Math.min(event.maxTicketsPerOrder, HARD_MAX_TICKETS, Math.max(left, 1));
  const total = (event.entryFee ?? 0) * tickets;

  const digits = contactPhone.replace(/\D/g, '');

  const openBuy = () => {
    if (isGuest) {
      setSignInOpen(true);
      return;
    }
    setBuyError(null);
    setSheet('buy');
  };

  const closeBuy = () => {
    setSheet('none');
    setBuyError(null);
  };

  /** Holds the tickets, then opens the gateway for the balance. */
  const startPayment = async () => {
    if (submitting) return;
    setSubmitting(true);
    setBuyError(null);
    try {
      const held = (await api.post(`/user/events/${event.id}/tickets`, {
        tickets,
        attendeeName: attendeeName.trim(),
        contactPhone: digits,
        whatsappConsent,
        contactEmail: contactEmail.trim(),
        notes: notes.trim() || undefined,
      })) as { orderId: string; confirmed?: boolean };

      if (held.confirmed === true) {
        setConfirmed({ orderId: held.orderId, tickets });
        setSheet('none');
        setSubmitting(false);
        void refetch();
        return;
      }
      setHeldOrderId(held.orderId);

      const order = (await api.post(`/user/event-orders/${held.orderId}/payments/create-order`, {})) as {
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      };

      setCheckout({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'GameOn Multisports',
        description: `${tickets} × ${event.title}`,
        prefill: {
          name: attendeeName.trim(),
          contact: digits,
          email: contactEmail.trim() || undefined,
        },
        theme: { color: '#28a745' },
      });
    } catch (cause) {
      setBuyError(
        cause instanceof ApiError ? cause.message : 'Could not start the payment. Please try again.',
      );
      setSubmitting(false);
    }
  };

  /** Verifies with the server, which is what actually issues the tickets. */
  const onPaid = async (result: RazorpaySuccess) => {
    setCheckout(null);
    if (!heldOrderId) return;
    try {
      await api.post(`/user/event-orders/${heldOrderId}/payments/verify`, result);
      setConfirmed({ orderId: heldOrderId, tickets });
      setSheet('none');
      void refetch();
    } catch (cause) {
      setBuyError(
        cause instanceof ApiError
          ? cause.message
          : 'We could not confirm your payment. Check My Tickets before paying again. If a deducted payment is missing, contact info@gameonmultisports.com.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Backing out releases the hold so someone else can buy those tickets. */
  const onDismissed = () => {
    setCheckout(null);
    setSubmitting(false);
    if (heldOrderId) {
      api.post(`/user/event-orders/${heldOrderId}/cancel`, {}).catch(() => {
        // The hold expires on its own; nothing to tell the player.
      });
      setHeldOrderId(null);
    }
  };

  return (
    <Screen>
      <AppHeader variant="back" />

      <ScreenScroll gutter={false} bottomInset={footerHeight} gap={Spacing.lg}>
        <DetailHero
          activity={event}
          meta={[
            { icon: 'calendarOutline', text: dateRangeLabel(event) },
            { icon: 'timeOutline', text: timeRangeLabel(event) },
            { icon: 'location', text: event.venue },
          ]}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.lg,
            paddingLeft: Layout.gutter,
            paddingRight: Layout.gutter,
          }}>
          {confirmed ? (
            <InfoNote
              title="Tickets confirmed"
              body={`${confirmed.tickets} × ${event.title}. Reference: ${confirmed.orderId}. Your booking is listed under My Tickets & Entries.`}
              tone="success"
            />
          ) : null}

          <ActivityBody activity={event} />

          {!open ? (
            <InfoNote
              title="Booking closed"
              body={
                left <= 0 ? 'This event has sold out.' : 'Tickets for this event are no longer on sale.'
              }
            />
          ) : null}
        </div>
      </ScreenScroll>

      <StickyFooter>
        <div ref={footerRef} style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: Spacing.md,
            }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ ...Typography.priceSmall, color: Brand.accent }}>
                {entryFeeLabel(event)}
              </span>
              <span style={{ ...Typography.caption, color: Brand.textMuted }}>
                {open
                  ? left > 0
                    ? `${left} ${left === 1 ? 'ticket' : 'tickets'} left`
                    : 'Sold out'
                  : 'Sales closed'}
              </span>
            </div>
            <Button
              label={open ? 'Buy Tickets' : 'Sold Out'}
              icon={<Ion name="ticketOutline" size={14} color={Brand.onAccent} />}
              size="md"
              onPress={openBuy}
              disabled={!open}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xs,
            }}>
            <Ion name="shieldCheckmarkOutline" size={12} color={Brand.success} />
            <span style={{ ...Typography.caption, color: Brand.textMuted }}>
              Secure Payment | Instant Confirmation
            </span>
          </div>
        </div>
      </StickyFooter>

      <BottomSheet
        visible={sheet === 'buy'}
        onClose={closeBuy}
        title="Buy tickets"
        subtitle={event.title}
        footer={
          <>
            <Button label="Cancel" variant="secondary" size="md" onPress={closeBuy} style={{ flex: 1 }} />
            <Button
              label={total > 0 ? `Pay ${price(total)}` : 'Confirm'}
              size="md"
              onPress={() => void startPayment()}
              loading={submitting}
              style={{ flex: 1 }}
            />
          </>
        }>
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: Spacing.md,
            }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ ...Typography.label, color: Brand.text }}>Tickets</span>
              <span style={{ ...Typography.caption, color: Brand.textMuted }}>
                Up to {maxTickets} per order
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
              <PressableScale
                disabled={tickets <= 1}
                onPress={() => setTickets((count) => Math.max(1, count - 1))}
                label="One fewer ticket"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Brand.accentSoft,
                  border: 'none',
                  cursor: tickets <= 1 ? 'default' : 'pointer',
                  opacity: tickets <= 1 ? 0.5 : 1,
                }}>
                <Ion name="removeOutline" size={16} color={Brand.accent} />
              </PressableScale>

              <span
                style={{
                  ...Typography.cardTitle,
                  color: Brand.text,
                  minWidth: 20,
                  textAlign: 'center',
                }}>
                {tickets}
              </span>

              <PressableScale
                disabled={tickets >= maxTickets}
                onPress={() => setTickets((count) => Math.min(maxTickets, count + 1))}
                label="One more ticket"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Brand.accentSoft,
                  border: 'none',
                  cursor: tickets >= maxTickets ? 'default' : 'pointer',
                  opacity: tickets >= maxTickets ? 0.5 : 1,
                }}>
                <Ion name="addOutline" size={16} color={Brand.accent} />
              </PressableScale>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: Spacing.md,
              borderTop: `1px solid ${Brand.divider}`,
              paddingTop: Spacing.md,
              marginTop: Spacing.md,
            }}>
            <span style={{ ...Typography.label, color: Brand.text }}>Total</span>
            <span style={{ ...Typography.priceSmall, color: Brand.accent }}>
              {total > 0 ? price(total) : 'Free'}
            </span>
          </div>
        </Card>

        <TextField
          label="Attendee name"
          icon={<Ion name="personOutline" size={16} color={Brand.textMuted} />}
          value={attendeeName}
          onChange={(value) => setTyped((current) => ({ ...current, name: value }))}
          placeholder="Who are the tickets for?"
        />
        <TextField
          label="Mobile number"
          icon={<Ion name="callOutline" size={16} color={Brand.textMuted} />}
          value={contactPhone}
          onChange={(value) => setTyped((current) => ({ ...current, phone: value }))}
          type="tel"
          inputMode="tel"
          placeholder="10-digit mobile number"
        />
        <WhatsAppConsent value={whatsappConsent} onChange={setWhatsAppConsent} disabled={submitting} />
        <TextField
          label="Email for registration confirmation (optional)"
          icon={<Ion name="mailOutline" size={16} color={Brand.textMuted} />}
          value={contactEmail}
          onChange={(value) => setTyped((current) => ({ ...current, email: value }))}
          type="email"
          inputMode="email"
          placeholder="For your confirmation"
        />
        <TextField
          label="Notes (optional)"
          icon={<Ion name="chatbubbleOutline" size={16} color={Brand.textMuted} />}
          value={notes}
          onChange={setNotes}
          placeholder="Anything we should know?"
        />

        {buyError ? <InfoNote title="Payment not completed" body={buyError} tone="danger" /> : null}

        <InfoNote body="Your tickets are held for 10 minutes while you pay. Nothing is charged until the payment goes through." />
      </BottomSheet>

      <SignInSheet
        visible={signInOpen}
        onClose={() => setSignInOpen(false)}
        title="Sign in to buy tickets"
        body="Tickets are tied to an account, so we can send your confirmation and check you in at the door."
      />

      <RazorpayCheckout
        options={checkout}
        onSuccess={(result) => void onPaid(result)}
        onDismiss={onDismissed}
        onFailed={(message) => {
          setCheckout(null);
          setSubmitting(false);
          setBuyError(message);
        }}
      />
    </Screen>
  );
}

