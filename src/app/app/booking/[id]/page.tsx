'use client';

/**
 * Booking detail — `/app/booking/[id]`. The web twin of the handset app's
 * `app/booking/[id].tsx`: the check-in QR staff scan, the court and slot facts,
 * the invoice, and cancelling with the refund priced by policy.
 *
 * Cancelling is deliberately three states in one sheet — preview, confirm, outcome
 * — because the refund percentage is policy-driven and only the server knows it.
 * `GET /user/bookings/:id/cancellation-preview` is asked *before* anything is
 * shown, so the player sees the exact amount and the tier that produced it before
 * they confirm. The refund itself is credited as GameOn Points inside the same
 * request, which is why both the bookings list and the wallet are refreshed
 * afterwards.
 */

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { CheckInQr } from '@/components/mobile/bookings/check-in-qr';
import { InvoiceCard } from '@/components/mobile/bookings/invoice-card';
import { RefundPolicyTable } from '@/components/mobile/bookings/refund-policy-table';
import {
  AppHeader,
  Badge,
  BottomSheet,
  Button,
  Card,
  DetailRow,
  EmptyState,
  InfoNote,
  Ion,
  Screen,
  ScreenScroll,
  Spinner,
} from '@/components/mobile/ui';
import { useBookings } from '@/components/mobile/bookings-store';
import { useWallet } from '@/components/mobile/wallet-provider';
import {
  activeCancellationTier,
  REFUND_NOTE,
  type Booking,
  type BookingStatus,
  type CancellationTier,
} from '@/lib/mobile/constants/bookings';
import { price } from '@/lib/mobile/constants/config';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';
import { ApiError, api } from '@/lib/mobile/api-client';
import { useApi } from '@/lib/mobile/use-api';

const STATUS_TONE: Record<BookingStatus, 'success' | 'info' | 'neutral'> = {
  upcoming: 'success',
  ongoing: 'info',
  past: 'neutral',
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  past: 'Completed',
};

/** `GET /user/bookings/:id/cancellation-preview`. */
type CancellationPreview = {
  hoursBeforeStart: number;
  refundPercent: number;
  refundDueAmount: number;
  amountPaid: number;
};

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { refresh } = useBookings();
  const { refresh: refreshWallet } = useWallet();

  const { data: booking, loading, error, refetch } = useApi<Booking>(
    id ? `/user/bookings/${id}` : null,
  );

  const [sheet, setSheet] = useState<'none' | 'invoice'>('none');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  /** Set once the server has confirmed the cancellation; drives the result view. */
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  // The configured refund tiers, shown beside the preview. Read before any early
  // return so the hook order never changes.
  const { data: tiers } = useApi<CancellationTier[]>('/public/cancellation-policy');

  if (!booking && loading) {
    return (
      <Screen>
        <AppHeader variant="back" showBell={false} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen>
        <AppHeader variant="back" showBell={false} />
        <EmptyState
          icon="alertCircleOutline"
          title="Booking not found"
          body={error ?? "We couldn't find this booking on your account."}
          actionLabel="Try Again"
          onAction={refetch}
        />
      </Screen>
    );
  }

  const close = () => setSheet('none');

  /** The tier in force for this booking right now, highlighted in the table. */
  const policyTier =
    tiers && preview ? activeCancellationTier(tiers, preview.hoursBeforeStart) : undefined;

  const resetCancelSheet = () => {
    setPreview(null);
    setPreviewError(null);
  };

  /**
   * Asks the server what cancelling would refund *before* showing the confirm —
   * the percentage is policy-driven, so only the server knows it.
   */
  const openCancel = async () => {
    setCancelOpen(true);
    resetCancelSheet();
    setCancelMessage(null);
    try {
      const res = (await api.get(`/user/bookings/${id}/cancellation-preview`)) as {
        data?: CancellationPreview;
      };
      setPreview(res?.data ?? null);
    } catch (cause) {
      setPreviewError(
        cause instanceof Error ? cause.message : 'Could not work out what this cancellation refunds.',
      );
    }
  };

  /**
   * Cancels, then reloads both the bookings and the wallet: the refund is credited
   * as Points inside the same request, so both views are stale the moment it
   * succeeds.
   */
  const confirmCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setPreviewError(null);
    try {
      const res = (await api.post(`/user/bookings/${id}/cancel`, {})) as { message?: string };
      await Promise.all([refresh(), refreshWallet()]);
      setCancelMessage(res?.message ?? 'Booking cancelled.');
    } catch (cause) {
      setPreviewError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not cancel this booking. Please try again.',
      );
    } finally {
      setCancelling(false);
    }
  };

  /** Closing after a cancellation means the booking has left this screen. */
  const closeCancel = () => {
    setCancelOpen(false);
    if (cancelMessage) {
      router.replace('/app/bookings');
      return;
    }
    resetCancelSheet();
  };

  return (
    <Screen>
      <AppHeader variant="back" showBell={false} />

      <ScreenScroll gap={Spacing.lg}>
        {/* Header block */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: Spacing.md,
          }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
            <span
              style={{
                ...Typography.micro,
                color: Brand.accent,
                textTransform: 'uppercase',
              }}>
              Booking Details
            </span>
            <span style={{ ...Typography.screenTitle, color: Brand.text }}>
              {booking.detailTitle}
            </span>
            <Badge label={STATUS_LABEL[booking.status]} tone={STATUS_TONE[booking.status]} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: Spacing.xxs }}>
            <span style={{ ...Typography.caption, color: Brand.textMuted }}>Booking ID</span>
            <span style={{ ...Typography.label, color: Brand.accent }}>{booking.bookingId}</span>
            <span style={{ ...Typography.caption, color: Brand.textMuted }}>
              Booked on {booking.bookedOn}
            </span>
          </div>
        </div>

        {/* QR beside the court details */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.md }}>
          {/* The full booking ID: the short one on screen is not what staff scan. */}
          <CheckInQr payload={booking.key} validTill={booking.qrValidTill} />

          <Card style={{ flex: 1, minWidth: 170 }}>
            <span style={{ ...Typography.label, color: Brand.text }}>Court Details</span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: Spacing.sm,
                paddingTop: Spacing.md,
              }}>
              <DetailRow
                label="Court"
                value={booking.court}
                icon={<Ion name="gridOutline" size={13} color={Brand.textSecondary} />}
              />
              <DetailRow
                label="Floor"
                value={booking.floor}
                icon={<Ion name="layersOutline" size={13} color={Brand.textSecondary} />}
              />
              <DetailRow
                label="Setting"
                value={booking.setting}
                icon={<Ion name="homeOutline" size={13} color={Brand.textSecondary} />}
              />
              <DetailRow
                label="Climate"
                value={booking.climate}
                icon={<Ion name="sunnyOutline" size={13} color={Brand.textSecondary} />}
              />
            </div>
          </Card>
        </div>

        {/* Date & time */}
        <Card style={{ display: 'flex', alignItems: 'flex-start', gap: Spacing.md }}>
          <Ion name="calendarOutline" size={16} color={Brand.accent} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: Spacing.xxs }}>
            <span style={{ ...Typography.label, color: Brand.text }}>Date &amp; Time</span>
            <span style={{ ...Typography.cardTitle, color: Brand.text }}>{booking.date}</span>
            <span style={{ ...Typography.caption, color: Brand.textSecondary }}>
              {booking.time} ({booking.duration})
            </span>
          </div>
        </Card>

        {/* Booking summary */}
        <Card>
          <span style={{ ...Typography.label, color: Brand.text }}>Booking Summary</span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: Spacing.md,
              paddingTop: Spacing.md,
            }}>
            <Summary label="Sport" value={booking.detailTitle.split(' – ')[0]} />
            <Summary
              label="Players"
              value={booking.players ? `${booking.players} Players` : '—'}
            />
            <Summary label="Booking Type" value={booking.bookingType} />
            <Summary label="Total Amount" value={`${price(booking.paid)} Paid`} accent />
          </div>
        </Card>

        <InvoiceCard invoice={booking.invoice} onViewInvoice={() => setSheet('invoice')} />

        {booking.status === 'upcoming' ? (
          <Card>
            <span style={{ ...Typography.label, color: Brand.text }}>
              Need to change this booking?
            </span>
            <span
              style={{
                ...Typography.caption,
                color: Brand.textSecondary,
                lineHeight: '18px',
                display: 'block',
                paddingTop: Spacing.xs,
              }}>
              Cancelling credits your refund back as GameOn Points, according to the cancellation
              policy. You&rsquo;ll see the exact amount before anything is confirmed.
            </span>
            <Button
              label="Cancel booking"
              variant="danger"
              icon={<Ion name="close" size={16} color={Brand.danger} />}
              size="md"
              onPress={() => void openCancel()}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        ) : null}
      </ScreenScroll>

      {/* Invoice sheet */}
      <BottomSheet
        visible={sheet === 'invoice'}
        onClose={close}
        title="Invoice"
        subtitle={booking.invoice.orderId}
        footer={<Button label="Done" size="md" onPress={close} style={{ flex: 1 }} />}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            <DetailRow label="Booking" value={booking.detailTitle} />
            <DetailRow label="Date" value={booking.date} />
            <DetailRow label="Time" value={booking.time} />
            <DetailRow label="Method" value={booking.invoice.paymentMethod} />
            <DetailRow
              label="Paid"
              value={price(booking.invoice.amountPaid)}
              emphasis="accent"
            />
          </div>
        </Card>
      </BottomSheet>

      {/* Cancellation: preview → confirm → outcome, all in one sheet */}
      <BottomSheet
        visible={cancelOpen}
        onClose={closeCancel}
        title={cancelMessage ? 'Booking cancelled' : 'Cancel this booking?'}
        subtitle={cancelMessage ? undefined : booking.detailTitle}
        footer={
          cancelMessage ? (
            <Button label="Done" size="md" onPress={closeCancel} style={{ flex: 1 }} />
          ) : (
            <>
              <Button
                label="Keep booking"
                variant="secondary"
                size="md"
                onPress={closeCancel}
                style={{ flex: 1 }}
              />
              <Button
                label="Confirm cancellation"
                variant="danger"
                size="md"
                onPress={() => void confirmCancel()}
                loading={cancelling}
                disabled={!preview}
                style={{ flex: 1 }}
              />
            </>
          )
        }>
        {cancelMessage ? (
          <InfoNote title="Your refund is on its way" body={cancelMessage} tone="success" />
        ) : previewError ? (
          <InfoNote title="Couldn't load your refund" body={previewError} tone="danger" />
        ) : !preview ? (
          <div style={{ paddingTop: Spacing.five, display: 'flex', justifyContent: 'center' }}>
            <Spinner />
          </div>
        ) : (
          <>
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                <DetailRow label="Amount paid" value={price(preview.amountPaid)} />
                <DetailRow
                  label="Refund as Points"
                  value={
                    preview.refundDueAmount > 0
                      ? `${price(preview.refundDueAmount)} (${preview.refundPercent}%)`
                      : 'No refund'
                  }
                  emphasis={preview.refundDueAmount > 0 ? 'accent' : undefined}
                />
              </div>
            </Card>

            {tiers && tiers.length > 0 ? (
              <RefundPolicyTable tiers={tiers} activeMinHours={policyTier?.minHoursBefore} />
            ) : null}

            <InfoNote body={REFUND_NOTE} />
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span
      style={{
        flexBasis: '44%',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: Spacing.xxs,
        minWidth: 0,
      }}>
      <span style={{ ...Typography.caption, color: Brand.textMuted }}>{label}</span>
      <span
        style={{
          ...Typography.caption,
          color: accent ? Brand.accent : Brand.text,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
        {value}
      </span>
    </span>
  );
}
