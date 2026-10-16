'use client';

/**
 * Tournament detail — `/app/tournament/[id]`. The web twin of the handset app's
 * `app/tournament/[id].tsx`.
 *
 * The registration flow mirrors the event ticket flow, with a team in place of a
 * ticket count:
 *
 *   1. `POST /user/tournaments/:id/register` holds a team slot for ten minutes and
 *      returns the registration. A free tournament comes back already confirmed.
 *   2. `POST /user/tournament-registrations/:id/payments/create-order` opens the
 *      gateway for the per-team fee the server set.
 *   3. `.../payments/verify` is what actually confirms the entry.
 *   4. Backing out calls `.../cancel`, so the slot is available to another team at
 *      once rather than after the hold lapses.
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
  Button,
  EmptyState,
  InfoNote,
  Ion,
  Screen,
  ScreenScroll,
  SignInSheet,
  Spinner,
  StickyFooter,
  TextField,
} from '@/components/mobile/ui';
import { BottomSheet } from '@/components/mobile/ui';
import { useSession } from '@/components/mobile/session-provider';
import {
  dateRangeLabel,
  entryFeeLabel,
  registrationOpen,
  spotsLeft,
  type PublicTournament,
} from '@/lib/mobile/constants/events';
import { Brand, Layout, Spacing, Typography } from '@/lib/mobile/theme';
import { price } from '@/lib/mobile/constants/config';
import { ApiError, api } from '@/lib/mobile/api-client';
import { useApi } from '@/lib/mobile/use-api';

/** `+919876543210` → `9876543210`. */
function nationalNumber(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '').slice(-10);
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { isGuest, user, profile } = useSession();

  const { data: tournament, loading, error, refetch } = useApi<PublicTournament>(
    id ? `/public/tournaments/${id}` : null,
  );

  const [sheet, setSheet] = useState<'none' | 'register'>('none');
  const [signInOpen, setSignInOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [typedCaptain, setTypedCaptain] = useState<string | null>(null);
  const [typedPhone, setTypedPhone] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [whatsappConsent, setWhatsAppConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<RazorpayOptions | null>(null);
  const [heldRegistrationId, setHeldRegistrationId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ teamName: string } | null>(null);

  const footerRef = useRef<HTMLDivElement | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const element = footerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setFooterHeight(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The account's own details until the captain edits a field.
  const captainName = typedCaptain ?? profile?.full_name ?? user?.fullName ?? '';
  const contactPhone = typedPhone ?? nationalNumber(profile?.phone ?? user?.phoneNumber);
  const contactEmail = profile?.email ?? user?.email ?? '';

  if (loading && !tournament) {
    return (
      <Screen>
        <AppHeader variant="back" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      </Screen>
    );
  }

  if (!tournament) {
    return (
      <Screen>
        <AppHeader variant="back" />
        <EmptyState
          icon="alertCircleOutline"
          title="Tournament not found"
          body={error ?? 'This tournament is no longer listed.'}
          actionLabel="Try Again"
          onAction={refetch}
        />
      </Screen>
    );
  }

  const open = registrationOpen(tournament);
  const left = spotsLeft(tournament);

  const openRegister = () => {
    if (isGuest) {
      setSignInOpen(true);
      return;
    }
    setFormError(null);
    setSheet('register');
  };

  const closeRegister = () => {
    setSheet('none');
    setFormError(null);
  };

  /**
   * Holds a team slot, then opens the gateway. The fee is a per-team price the
   * server sets, so nothing about the amount comes from here.
   */
  const startPayment = async () => {
    if (submitting) return;

    // The two fields the server requires, checked here so the player gets a reason
    // before a round trip.
    if (teamName.trim().length < 2) {
      setFormError('Please enter your team name.');
      return;
    }
    if (captainName.trim().length < 2) {
      setFormError("Please enter the captain's name.");
      return;
    }
    if (contactPhone.replace(/\D/g, '').length < 6) {
      setFormError('Please enter a valid mobile number.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const held = (await api.post(`/user/tournaments/${tournament.id}/register`, {
        teamName: teamName.trim(),
        captainName: captainName.trim(),
        contactPhone: contactPhone.replace(/\D/g, ''),
        whatsappConsent,
        contactEmail: contactEmail.trim(),
        notes: notes.trim() || undefined,
      })) as { registrationId: string; confirmed?: boolean };

      if (held.confirmed === true) {
        setConfirmed({ teamName: teamName.trim() });
        setSheet('none');
        setSubmitting(false);
        void refetch();
        return;
      }
      setHeldRegistrationId(held.registrationId);

      const order = (await api.post(
        `/user/tournament-registrations/${held.registrationId}/payments/create-order`,
        {},
      )) as { orderId: string; amount: number; currency: string; keyId: string };

      setCheckout({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'GameOn Multisports',
        description: `${teamName.trim()} — ${tournament.title}`,
        prefill: {
          name: captainName.trim(),
          contact: contactPhone.replace(/\D/g, ''),
          email: contactEmail.trim() || undefined,
        },
        theme: { color: '#28a745' },
      });
    } catch (cause) {
      setFormError(
        cause instanceof ApiError ? cause.message : 'Could not start the payment. Please try again.',
      );
      setSubmitting(false);
    }
  };

  /** Verifies with the server, which is what actually confirms the entry. */
  const onPaid = async (result: RazorpaySuccess) => {
    setCheckout(null);
    if (!heldRegistrationId) return;
    try {
      await api.post(
        `/user/tournament-registrations/${heldRegistrationId}/payments/verify`,
        result,
      );
      setConfirmed({ teamName: teamName.trim() });
      setSheet('none');
      void refetch();
    } catch (cause) {
      setFormError(
        cause instanceof ApiError
          ? cause.message
          : 'We could not confirm your payment. Check My Tickets before paying again. If a deducted payment is missing, contact info@gameonmultisports.com.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Backing out releases the held slot so another team can take it. */
  const onDismissed = () => {
    setCheckout(null);
    setSubmitting(false);
    if (heldRegistrationId) {
      api.post(`/user/tournament-registrations/${heldRegistrationId}/cancel`, {}).catch(() => {
        // The hold expires on its own; nothing to tell the player.
      });
      setHeldRegistrationId(null);
    }
  };

  return (
    <Screen>
      <AppHeader variant="back" />

      <ScreenScroll gutter={false} bottomInset={footerHeight} gap={Spacing.lg}>
        <DetailHero
          activity={tournament}
          extraBadge={{ label: 'Tournament', icon: 'trophy' }}
          meta={[
            { icon: 'calendarOutline', text: dateRangeLabel(tournament) },
            { icon: 'location', text: tournament.venue },
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
              title="Entry confirmed"
              body={`${confirmed.teamName} is in. Your entry pass is listed under My Tickets & Entries.`}
              tone="success"
            />
          ) : null}

          <ActivityBody activity={tournament} />

          {!open ? (
            <InfoNote
              title="Registration closed"
              body={
                left <= 0
                  ? 'This tournament is full.'
                  : 'Entries for this tournament are closed.'
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
                {entryFeeLabel(tournament)}
              </span>
              <span style={{ ...Typography.caption, color: Brand.textMuted }}>
                {open
                  ? left > 0
                    ? `${left} ${left === 1 ? 'team slot' : 'team slots'} left`
                    : 'Full'
                  : 'Registration closed'}
              </span>
            </div>
            <Button
              label={open ? 'Register Team' : 'Closed'}
              icon={<Ion name="trophyOutline" size={14} color={Brand.onAccent} />}
              size="md"
              onPress={openRegister}
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
        visible={sheet === 'register'}
        onClose={closeRegister}
        title="Register your team"
        subtitle={tournament.title}
        footer={
          <>
            <Button
              label="Cancel"
              variant="secondary"
              size="md"
              onPress={closeRegister}
              style={{ flex: 1 }}
            />
            <Button
              label={
                (tournament.entryFee ?? 0) > 0
                  ? `Pay ${price(tournament.entryFee ?? 0)}`
                  : 'Confirm entry'
              }
              size="md"
              onPress={() => void startPayment()}
              loading={submitting}
              style={{ flex: 1 }}
            />
          </>
        }>
        <TextField
          label="Team name"
          icon={<Ion name="peopleOutline" size={16} color={Brand.textMuted} />}
          value={teamName}
          onChange={setTeamName}
          placeholder="e.g. Smash Bros"
        />
        <TextField
          label="Captain's name"
          icon={<Ion name="personOutline" size={16} color={Brand.textMuted} />}
          value={captainName}
          onChange={setTypedCaptain}
          placeholder="Who leads the team?"
        />
        <TextField
          label="Mobile number"
          icon={<Ion name="callOutline" size={16} color={Brand.textMuted} />}
          value={contactPhone}
          onChange={setTypedPhone}
          type="tel"
          inputMode="tel"
          placeholder="10-digit mobile number"
        />
        <WhatsAppConsent
          value={whatsappConsent}
          onChange={setWhatsAppConsent}
          disabled={submitting}
        />
        <TextField
          label="Email for confirmation (optional)"
          icon={<Ion name="mailOutline" size={16} color={Brand.textMuted} />}
          value={contactEmail}
          onChange={() => {
            // The email comes from the account; the field shows it read-only.
          }}
          type="email"
          inputMode="email"
          placeholder="For your confirmation"
          disabled
        />
        <TextField
          label="Notes (optional)"
          icon={<Ion name="chatbubbleOutline" size={16} color={Brand.textMuted} />}
          value={notes}
          onChange={setNotes}
          placeholder="Anything we should know?"
        />

        {formError ? <InfoNote title="Entry not completed" body={formError} tone="danger" /> : null}

        <InfoNote body="Your team slot is held for 10 minutes while you pay. Nothing is charged until the payment goes through." />
      </BottomSheet>

      <SignInSheet
        visible={signInOpen}
        onClose={() => setSignInOpen(false)}
        title="Sign in to register"
        body="Team entries are tied to an account, so we can send your confirmation and check you in on match day."
      />

      <RazorpayCheckout
        options={checkout}
        onSuccess={(result) => void onPaid(result)}
        onDismiss={onDismissed}
        onFailed={(message) => {
          setCheckout(null);
          setSubmitting(false);
          setFormError(message);
        }}
      />
    </Screen>
  );
}

