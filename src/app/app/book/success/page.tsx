'use client';

/**
 * What was just paid for — `/app/book/success?booking=<id>`. The web twin of the
 * handset app's `app/book/success.tsx`.
 *
 * The booking is re-read from the server rather than taken from the draft: the
 * draft is in-memory only, so a reload loses it, and the booking is the record
 * that matters either way.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { BookingSummaryCard, type SummaryFact } from '@/components/mobile/payment/booking-summary-card';
import { SuccessCheck } from '@/components/mobile/payment/success-check';
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  FadeUp,
  Ion,
  Screen,
  ScreenScroll,
  Spinner,
} from '@/components/mobile/ui';
import { useBookingDraft } from '@/components/mobile/booking-draft-provider';
import type { Booking } from '@/lib/mobile/constants/bookings';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';
import { useApi } from '@/lib/mobile/use-api';

/** The full-height spinner shown while the confirmed booking is being fetched. */
function LoadingScreen() {
  return (
    <Screen>
      <AppHeader showBell={false} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    </Screen>
  );
}

function BookingSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams?.get('booking') ?? null;

  const { summary, reset } = useBookingDraft();
  const { venue, itemTitle, total } = summary;

  // The server's copy of what was just paid for.
  const { data: booked, loading, error, refetch } = useApi<Booking>(
    bookingId ? `/user/bookings/${bookingId}` : null,
  );

  const sport = booked?.sport ?? venue?.sport;

  // Paid, but the record has not come back yet — wait rather than claim there is
  // nothing.
  if (bookingId && loading) return <LoadingScreen />;

  if (!sport || !booked) {
    return (
      <Screen>
        <AppHeader showBell={false} />
        <EmptyState
          icon="checkmarkCircleOutline"
          title="Check your booking confirmation"
          body={
            error ??
            'We could not retrieve a confirmed booking. Check My Bookings before paying again.'
          }
          actionLabel={bookingId ? 'Try Again' : 'My Bookings'}
          onAction={bookingId ? refetch : () => router.replace('/app/bookings')}
        />
      </Screen>
    );
  }

  const facts: SummaryFact[] = [
    { label: 'Date', value: booked.date, icon: <Ion name="calendarOutline" size={13} color={Brand.textSecondary} /> },
    { label: 'Time', value: booked.time, icon: <Ion name="timeOutline" size={13} color={Brand.textSecondary} /> },
    { label: 'Court', value: booked.court, icon: <Ion name="gridOutline" size={13} color={Brand.textSecondary} /> },
    {
      label: 'Booking ID',
      value: booked.bookingId,
      icon: <Ion name="receiptOutline" size={13} color={Brand.textSecondary} />,
    },
  ];

  const viewBookings = () => {
    reset();
    router.replace('/app/bookings');
  };

  const bookAnother = () => {
    const target = venue ? `/app/sport/${venue.key}` : '/app/sports';
    reset();
    router.replace(target);
  };

  return (
    <Screen>
      <AppHeader showBell={false} />

      <ScreenScroll gap={Spacing.lg}>
        <SuccessCheck />

        <FadeUp delay={260}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Spacing.sm }}>
            <span
              style={{ ...Typography.screenTitle, color: Brand.text, textAlign: 'center' }}>
              Booking Confirmed!
            </span>
            <span
              style={{ ...Typography.body, color: Brand.textSecondary, textAlign: 'center' }}>
              Your payment was successful.
              <br />
              We look forward to seeing you on the court!
            </span>
          </div>
        </FadeUp>

        <FadeUp delay={340}>
          <BookingSummaryCard
            title={booked.detailTitle || itemTitle}
            sport={sport}
            image={booked.image || venue?.image}
            facts={facts}
            totalLabel="Total Paid"
            total={booked.paid ?? total}
          />
        </FadeUp>

        <Button label="View My Bookings" icon={<Ion name="calendar" size={16} color={Brand.onAccent} />} onPress={viewBookings} fullWidth />
        <Button label="Book Another Slot" variant="secondary" onPress={bookAnother} fullWidth />

        <Card style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
          <Ion name="qrCode" size={16} color={Brand.success} />
          <div style={{ flex: 1 }}>
            <span style={{ ...Typography.caption, color: Brand.textMuted, display: 'block' }}>
              Your check-in QR code
            </span>
            <span style={{ ...Typography.label, color: Brand.text }}>
              Open this booking in My Bookings at the venue
            </span>
          </div>
        </Card>
      </ScreenScroll>
    </Screen>
  );
}

/**
 * `useSearchParams()` needs a Suspense boundary: the route is otherwise
 * prerendered, and reading the query string is what opts it out.
 */
export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <BookingSuccess />
    </Suspense>
  );
}
