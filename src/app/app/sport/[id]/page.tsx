'use client';

/**
 * The Sport Detail screen — `/app/sport/[id]`. The web twin of the handset app's
 * `app/sport/[id].tsx`: the same three ordered steps (court, date & time, booking
 * details), the same gallery, amenities and player rules, the same summary bar
 * above the CTA.
 *
 * Everything that decides money or availability comes from the server: the card
 * from `GET /public/sports/catalog/:id`, the courts from `GET /public/facilities`,
 * the slots from `GET /user/slots`. Nothing on this screen invents either.
 */

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BookingSummaryBar, type PriceLine } from '@/components/mobile/booking/booking-summary-bar';
import { DateSlotPicker } from '@/components/mobile/booking/date-slot-picker';
import { FacilityPicker, type Facility } from '@/components/mobile/booking/facility-picker';
import { StepHeader } from '@/components/mobile/booking/step-header';
import { AmenitiesRow } from '@/components/mobile/sports/amenities-row';
import { PhotoGallery } from '@/components/mobile/sports/photo-gallery';
import {
  AppHeader,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  Ion,
  PickerField,
  Screen,
  ScreenScroll,
  SignInGate,
  Spinner,
  SportPill,
  StickyFooter,
  TextField,
} from '@/components/mobile/ui';
import { useBookingDraft, type BookingDraft } from '@/components/mobile/booking-draft-provider';
import { useSession } from '@/components/mobile/session-provider';
import { useSportsCatalogCard } from '@/components/mobile/sports-catalog-provider';
import { price } from '@/lib/mobile/constants/config';
import {
  NOTES_MAX_LENGTH,
  PLAYER_OPTIONS,
  SLOT_DATES,
  clockLabel,
  type TimeSlot,
} from '@/lib/mobile/constants/slots';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';
import { useApi } from '@/lib/mobile/use-api';

const MOBILE_DIGITS = 10;

/**
 * Clearance below the scroll before the footer has been measured. The booking
 * footer is the summary band plus a CTA — taller than the shell's standard
 * footer — so the measured height replaces this once the observer has run.
 */
const FOOTER_MIN_HEIGHT = 170;

/** A slot as `GET /user/slots` returns it. */
type ApiSlot = {
  start_time: string;
  end_time: string;
  available: boolean;
};

/** `+919876543210` → `9876543210`, for the 10-digit mobile field. */
function nationalNumber(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '').slice(-MOBILE_DIGITS);
}

export default function SportDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string; court?: string }>();
  const id = params?.id;
  const courtParam = params?.court;

  const { card: routeVenue, loading: catalogLoading, refetch: refetchVenue } = useSportsCatalogCard(id);
  const { draft, update, summary } = useBookingDraft();
  const { isGuest, user, profile } = useSession();

  // Hand the fetched card to the booking draft, which checkout reads from. A
  // different card starts a fresh booking; the same card arriving from the Sports
  // tab keeps the date/time its filters carried in, and a refetch just refreshes
  // the stored copy (e.g. a new price).
  useEffect(() => {
    if (!routeVenue) return;
    if (draft.venueKey !== routeVenue.key) {
      update({
        venueKey: routeVenue.key,
        venue: routeVenue,
        facilityId: undefined,
        slotKey: undefined,
        slotEnd: undefined,
        dateKey: SLOT_DATES[0].key,
      });
    } else if (draft.venue !== routeVenue) {
      update({ venue: routeVenue });
    }
  }, [routeVenue, draft.venueKey, draft.venue, update]);

  const { venue: draftVenue, dateLabel, slotLabel, durationLabel: spanLabel, courtLabel, total } = summary;
  // Only ever render this route's own card, never one left over from a previous booking.
  const venue = draftVenue?.key === id ? draftVenue : undefined;

  // Contact details default to the signed-in player. Only filled when the field is
  // still empty, so a field the player clears stays clear.
  const identityName = profile?.full_name || user?.fullName || '';
  const identityMobile = nationalNumber(profile?.phone || user?.phoneNumber);
  const identityEmail = profile?.email || user?.email || '';
  useEffect(() => {
    const patch: Partial<BookingDraft> = {};
    if (!draft.contactName && identityName) patch.contactName = identityName;
    if (!draft.mobile && identityMobile) patch.mobile = identityMobile;
    if (!draft.email && identityEmail) patch.email = identityEmail;
    if (Object.keys(patch).length > 0) update(patch);
    // Keyed on the identity only: re-running on every draft change would fight the
    // player for the field they are typing in.
  }, [identityName, identityMobile, identityEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const [playersOpen, setPlayersOpen] = useState(false);
  // The date/time frame starts on the calendar and flips to slots once a day is chosen.
  const [showSlots, setShowSlots] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // The footer's real height, so the scroll clears it whether or not the summary
  // breakdown is expanded. Replaces the handset app's `onHeight` callback.
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | undefined>(undefined);
  // Scoped to this card's court type server-side, so what comes back is exactly
  // this card's courts — no over-fetching a whole sport to filter.
  const {
    data: facilitiesData,
    loading: facLoading,
    error: facError,
    refetch: refetchFacilities,
  } = useApi<Facility[]>(venue ? `/public/facilities?courtTypeId=${venue.key}` : null);
  const facilities = facilitiesData || [];

  // Pick the court arrived at from search, or the first one if the current choice
  // is not (or no longer) one of this card's courts.
  useEffect(() => {
    if (facilities.length === 0) return;
    if (draft.facilityId && facilities.some((facility) => facility.id === draft.facilityId)) return;

    const court = facilities.find((facility) => facility.id === courtParam) ?? facilities[0];
    update({
      facilityId: court.id,
      facilityName: court.name,
      slotKey: undefined,
      slotEnd: undefined,
    });
  }, [facilities, courtParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the chosen slot length one this card actually sells; default to its first
  // (shortest) option. A length the admin removed is dropped here.
  const slotOptions = venue?.slotOptions ?? [];
  useEffect(() => {
    if (slotOptions.length === 0) return;
    if (slotOptions.some((option) => option.durationMinutes === draft.slotMinutes)) return;
    update({ slotMinutes: slotOptions[0].durationMinutes, slotKey: undefined, slotEnd: undefined });
  }, [slotOptions, draft.slotMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shared reader retries transient failures, cancels stale requests and recovers
  // after reconnect/resume. Results remain scoped to this court/date/length.
  const slotsEndpoint =
    draft.facilityId && draft.dateKey && draft.slotMinutes
      ? `/user/slots?facilityId=${draft.facilityId}&date=${draft.dateKey}&duration=${draft.slotMinutes}`
      : null;
  const {
    data: slotData,
    loading: slotsLoading,
    error: slotError,
    refetch: fetchSlots,
  } = useApi<{ slots: ApiSlot[] }>(slotsEndpoint);

  const apiSlots = Array.isArray(slotData?.slots) ? slotData.slots : [];
  const slots: TimeSlot[] = apiSlots.map((slot) => ({
    key: slot.start_time,
    start: clockLabel(slot.start_time),
    end: clockLabel(slot.end_time),
    available: slot.available,
  }));
  const slotEnds = Object.fromEntries(apiSlots.map((slot) => [slot.start_time, slot.end_time]));

  // A slot that was taken between the fetch and now is not silently kept: the
  // grid decides, and a stale choice is cleared.
  useEffect(() => {
    if (slotsLoading || slotError || !slotData || !draft.slotKey) return;
    if (!slotData.slots.some((slot) => slot.start_time === draft.slotKey && slot.available)) {
      update({ slotKey: undefined, slotEnd: undefined });
    }
  }, [slotData, slotsLoading, slotError, draft.slotKey, update]);

  // This card (price, court count) is the one worth waiting on; courts and slots
  // have their own inline spinners, so they are kicked off but not awaited.
  const onRefresh = async () => {
    setRefreshing(true);
    await refetchVenue();
    refetchFacilities();
    fetchSlots();
    setRefreshing(false);
  };

  /**
   * The footer's real height, so the scroll clears it whether or not the summary
   * breakdown is expanded. This stands in for the handset app's `onHeight`
   * callback; until it has run, `bottomLayer="footer"` supplies the standard
   * clearance, so the content is never wrong even for a frame.
   */
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
        <AppHeader variant="back" showLocation={false} showBell={false} />
        <SignInGate
          icon="lockClosedOutline"
          title="Sign in to pick a slot"
          body="Booking a slot needs a verified mobile number, so we can send your confirmation and reminders."
        />
      </Screen>
    );
  }

  if (!venue) {
    // Still fetching, or fetched and about to land in the draft next render.
    if (catalogLoading || routeVenue) {
      return (
        <Screen>
          <AppHeader variant="back" showLocation={false} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner />
          </div>
        </Screen>
      );
    }
    return (
      <Screen>
        <AppHeader variant="back" showLocation={false} />
        <EmptyState
          icon="calendarOutline"
          title="Pick a sport first"
          body="Choose a court from the Sports tab to start a booking."
          actionLabel="Browse Sports"
          onAction={() => router.replace('/app/sports')}
        />
      </Screen>
    );
  }

  const pickDate = (dateKey: string) => update({ dateKey });

  const pickSlotLength = (minutes: number) =>
    update({ slotMinutes: minutes, slotKey: undefined, slotEnd: undefined });

  const pickFacility = (facilityId: string) => {
    const facility = facilities.find((entry) => entry.id === facilityId);
    if (!facility) return;
    update({
      facilityId,
      facilityName: facility.name,
      // The slot belongs to the court, so changing court clears it.
      slotKey: undefined,
      slotEnd: undefined,
    });
  };

  const digits = draft.mobile.replace(/\D/g, '');
  const slotChosen =
    !slotsLoading &&
    !slotError &&
    Boolean(draft.slotKey) &&
    slots.some((slot) => slot.key === draft.slotKey && slot.available);
  const nameError = submitted && draft.contactName.trim().length < 2 ? 'Enter the contact name' : undefined;
  const mobileError =
    submitted && digits.length !== MOBILE_DIGITS ? `Enter a ${MOBILE_DIGITS}-digit number` : undefined;
  const emailValid =
    !draft.email.trim() ||
    (draft.email.trim().length <= 200 && /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(draft.email.trim()));
  const complete =
    slotChosen &&
    Boolean(draft.facilityId) &&
    draft.contactName.trim().length >= 2 &&
    digits.length === MOBILE_DIGITS &&
    emailValid;

  const breakup: PriceLine[] = [
    { label: `Court fee (${spanLabel})`, amount: price(total) },
    { label: 'Taxes & fees', amount: 'Included' },
    { label: 'Total payable', amount: price(total) },
  ];

  const proceed = () => {
    setSubmitted(true);
    if (!complete) return;
    router.push('/app/book/payment');
  };

  return (
    <Screen>
      <AppHeader
        variant="back"
        showLocation={false}
        right={
          // The handset build refreshes by pulling down; a browser has no such
          // gesture, so the same reload lives one tap away in the header.
          <button
            type="button"
            aria-label="Refresh this court’s availability"
            onClick={() => void onRefresh()}
            className="mobile-press"
            style={{
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              opacity: refreshing ? 0.5 : 1,
            }}>
            <Ion name="refresh" size={18} color={Brand.text} />
          </button>
        }
      />

      <ScreenScroll
        bottomLayer="footer"
        bottomInset={footerHeight ?? FOOTER_MIN_HEIGHT}
        gap={Spacing.lg}>
        {/* Identity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <SportPill sport={venue.sport} />
          <span style={{ ...Typography.screenTitle, color: Brand.text }}>{venue.title}</span>
          {venue.description ? (
            <span style={{ ...Typography.bodySmall, color: Brand.textSecondary }}>
              {venue.description}
            </span>
          ) : null}
          <span style={{ ...Typography.caption, color: Brand.accent, fontWeight: 700 }}>
            {facilities.length || venue.courtsAvailable} Courts Available
          </span>
        </div>

        <PhotoGallery images={venue.gallery} label={venue.title} />

        {/* 1 · Court Selection */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <StepHeader step={1} title="Choose Court" />

          {facError ? (
            <span style={{ ...Typography.caption, color: Brand.danger }}>
              Error loading courts: {facError}
            </span>
          ) : (
            <div style={{ opacity: facLoading ? 0.4 : 1 }}>
              {facilities.length > 0 ? (
                <FacilityPicker
                  value={draft.facilityId}
                  onChange={pickFacility}
                  facilities={facilities}
                />
              ) : facLoading ? (
                <Spinner />
              ) : (
                <span
                  style={{
                    ...Typography.caption,
                    color: Brand.textMuted,
                    textAlign: 'center',
                    display: 'block',
                    marginTop: Spacing.md,
                    marginBottom: Spacing.md,
                  }}>
                  No courts found.
                </span>
              )}
            </div>
          )}

          {submitted && !draft.facilityId ? (
            <span style={{ ...Typography.caption, color: Brand.danger }}>
              Please select a court
            </span>
          ) : null}
        </Card>

        {/* 2 · Date, length & time, one frame */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <StepHeader step={2} title="Date & Time" />

          {!draft.facilityId ? (
            <span
              style={{
                ...Typography.caption,
                color: Brand.textMuted,
                textAlign: 'center',
                marginTop: Spacing.md,
                marginBottom: Spacing.md,
              }}>
              Select a court to see slots
            </span>
          ) : (
            <DateSlotPicker
              date={draft.dateKey}
              onChangeDate={pickDate}
              daysAhead={venue.bookingWindowDays}
              slots={slots}
              slotKey={draft.slotKey}
              onChangeSlot={(slotKey) => update({ slotKey, slotEnd: slotEnds[slotKey] })}
              loading={slotsLoading}
              error={slotError}
              showSlots={showSlots}
              onShowSlots={setShowSlots}
              slotOptions={slotOptions}
              slotMinutes={draft.slotMinutes}
              onChangeSlotLength={pickSlotLength}
            />
          )}

          {submitted && draft.facilityId && !slotChosen ? (
            <span style={{ ...Typography.caption, color: Brand.danger }}>
              Choose an available time slot
            </span>
          ) : null}
        </Card>

        {/* 3 · Booking details */}
        <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <StepHeader step={3} title="Booking Details" />

          <PickerField
            label="No. of Players"
            value={`${draft.players} Players`}
            icon={<Ion name="peopleOutline" size={16} color={Brand.textMuted} />}
            onPress={() => setPlayersOpen(true)}
          />

          <TextField
            label="Contact Name"
            icon={<Ion name="personOutline" size={16} color={Brand.textMuted} />}
            value={draft.contactName}
            onChange={(contactName) => update({ contactName })}
            error={nameError}
            placeholder="Your name"
            autoComplete="name"
          />

          <TextField
            label="Mobile Number"
            icon={<Ion name="callOutline" size={16} color={Brand.textMuted} />}
            value={draft.mobile}
            onChange={(mobile) => update({ mobile })}
            error={mobileError}
            placeholder="98765 43210"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />

          <TextField
            label="Email for booking confirmation (Optional)"
            icon={<Ion name="mailOutline" size={16} color={Brand.textMuted} />}
            value={draft.email}
            error={submitted && !emailValid ? 'Enter a valid email address' : undefined}
            onChange={(email) => update({ email })}
            placeholder="you@example.com"
            type="email"
            inputMode="email"
            autoComplete="email"
          />

          <TextField
            label="Any Notes (Optional)"
            icon={<Ion name="chatbubbleOutline" size={16} color={Brand.textMuted} />}
            value={draft.notes}
            onChange={(notes) => update({ notes: notes.slice(0, NOTES_MAX_LENGTH) })}
            counter={`${draft.notes.length}/${NOTES_MAX_LENGTH}`}
            placeholder="Add any notes for your booking"
            multilineRows={3}
          />
        </Card>

        {venue.amenities.length > 0 ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <span style={{ ...Typography.label, color: Brand.text }}>Amenities</span>
            <AmenitiesRow amenities={venue.amenities} />
          </Card>
        ) : null}

        {venue.eligibility.length > 0 ? (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
            <span style={{ ...Typography.label, color: Brand.text }}>Before you play</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              {venue.eligibility.map((rule) => (
                <div key={rule} style={{ display: 'flex', gap: Spacing.sm }}>
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      flexShrink: 0,
                      marginTop: 6,
                      borderRadius: '50%',
                      backgroundColor: Brand.accent,
                    }}
                  />
                  <span
                    style={{
                      ...Typography.caption,
                      color: Brand.textSecondary,
                      flex: 1,
                      lineHeight: '18px',
                    }}>
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </ScreenScroll>

      <StickyFooter>
        <div ref={footerRef} style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          <BookingSummaryBar
            dateTime={`${dateLabel} • ${slotLabel}`}
            court={courtLabel}
            total={total}
            breakup={breakup}
          />
          <Button
            label="Continue to Pay"
            icon={<Ion name="arrowForward" size={16} color={Brand.onAccent} />}
            iconPosition="right"
            onPress={proceed}
            disabled={slotsLoading || facLoading}
            fullWidth
          />
        </div>
      </StickyFooter>

      <BottomSheet
        visible={playersOpen}
        onClose={() => setPlayersOpen(false)}
        title="No. of Players"
        subtitle="How many of you are playing?">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
          {PLAYER_OPTIONS.map((count) => (
            <Chip
              key={count}
              label={`${count} Players`}
              selected={draft.players === count}
              onPress={() => {
                update({ players: count });
                setPlayersOpen(false);
              }}
            />
          ))}
        </div>
      </BottomSheet>
    </Screen>
  );
}

