'use client';

/**
 * Terms & Conditions — the web twin of the handset app's `accounts/terms.tsx`: the
 * same five sections, the same "Last Updated" line, and the acknowledgement checkbox
 * the mockup puts at the foot of the page.
 */

import { useState } from 'react';

import { LegalSections } from '@/components/mobile/accounts/legal-sections';
import { ScreenShell } from '@/components/mobile/accounts/screen-shell';
import { ScreenTitle } from '@/components/mobile/accounts/screen-title';
import { Ion, PressableScale } from '@/components/mobile/ui';
import { Brand, Radius } from '@/lib/mobile/theme';

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using the GameOn app, you agree to be bound by these Terms & Conditions and all applicable laws and regulations.',
  },
  {
    title: 'Use of the App',
    body: 'GameOn provides a platform to discover and book sports grounds, facilities, and related services. You agree to use the app only for lawful purposes and in accordance with these terms.',
  },
  {
    title: 'Bookings & Payments',
    body: 'All bookings are subject to availability. Payments must be completed through the app to confirm your booking. GameOn reserves the right to modify or cancel any booking in case of unavailability or issues.',
  },
  {
    title: 'Cancellations & Refunds',
    body: 'Player-initiated court cancellations follow the server-calculated policy shown before confirmation; eligible refunds are credited as GameOn Points. Payments that fail to secure a booking, organizer cancellations, and unresolved gateway refunds need separate reconciliation. Contact info@gameonmultisports.com for help. Event and tournament terms may differ and should be checked before purchasing.',
  },
  {
    title: 'User Conduct',
    body: 'You agree not to misuse the app or engage in any activity that disrupts or interferes with the proper functioning of the platform or other users.',
  },
];

export default function TermsPage() {
  const [agreed, setAgreed] = useState(false);

  return (
    <ScreenShell>
      <ScreenTitle title="Terms & Conditions" updatedAt="Last Updated: 14 October 2026" />

      <LegalSections sections={SECTIONS} />

      <PressableScale
        as="div"
        scale={false}
        label="I have read and agree to the Terms & Conditions"
        onPress={() => setAgreed((value) => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Radius.md,
          background: 'none',
          border: 'none',
          width: '100%',
          padding: 0,
        }}>
        <span
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            borderRadius: Radius.xs,
            border: `2px solid ${Brand.accent}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: agreed ? Brand.accent : 'transparent',
          }}>
          {agreed ? <Ion name="checkmark" size={16} color={Brand.onAccent} /> : null}
        </span>
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            color: Brand.text,
            fontSize: 14,
            fontWeight: 600,
          }}>
          I have read and agree to the Terms &amp; Conditions
        </span>
      </PressableScale>
    </ScreenShell>
  );
}
