'use client';

/**
 * Privacy Policy — the web twin of the handset app's `accounts/privacy.tsx`. The
 * sections are the app's own wording; only the frame changes.
 */

import { LegalSections } from '@/components/mobile/accounts/legal-sections';
import { ScreenShell } from '@/components/mobile/accounts/screen-shell';
import { ScreenTitle } from '@/components/mobile/accounts/screen-title';
import { Ion, Card } from '@/components/mobile/ui';
import { Brand, Radius, Spacing } from '@/lib/mobile/theme';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect your sign-in phone number or email, profile details you choose to provide (such as name, city, date of birth, gender and preferred sports), optional profile photo, bookings, payment references, Points history, referrals and feedback. The app does not request your device location. Card and UPI credentials are handled by Razorpay, not stored by GameOn.',
  },
  {
    title: 'How We Use Information',
    body: 'We use your information to process bookings, communicate with you, personalize your experience, and ensure the security of our platform.',
  },
  {
    title: 'Information Sharing',
    body: 'Authentication and account data are processed by Firebase and Supabase. Razorpay processes payments. Our email provider delivers service messages. These providers receive the information needed for their services. The app does not include advertising tracking. External websites and services have their own privacy practices.',
  },
  {
    title: 'Data Security',
    body: 'We implement industry-standard security measures to protect your data from unauthorized access, alteration, or disclosure.',
  },
  {
    title: 'Optional WhatsApp Confirmation',
    body: 'If you turn on WhatsApp confirmation at checkout, Meta receives the booking phone number, customer name, reference, sport or activity, schedule and check-in QR to deliver that message. We record permission and delivery status for support. This is optional, not marketing permission, and does not affect booking. Reply STOP to our WhatsApp number to stop future confirmations. Keep your QR private: it can be used to check in your reservation.',
  },
  {
    title: 'Your Rights',
    body: 'You can edit your profile or initiate account and associated personal data deletion at Account → Delete Account. Requests are processed within 30 days, with completion confirmation. Records required for legal, payment or fraud-prevention obligations may be retained. The account remains active until deletion is processed. For requests outside the app, use gameonmultisports.com/delete-account.',
  },
];

export default function PrivacyPage() {
  return (
    <ScreenShell>
      <ScreenTitle title="Privacy Policy" updatedAt="Last Updated: 14 October 2026" />

      <LegalSections sections={SECTIONS} />

      <Card
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: Radius.md,
          border: `1px solid ${Brand.accentGlow}`,
          borderRadius: Radius.lg,
          padding: Spacing.md,
        }}>
        <span
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 22,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Brand.accentSoft,
          }}>
          <Ion name="shieldCheckmark" size={22} color={Brand.accent} />
        </span>
        <span style={{ flex: 1, color: Brand.textSecondary, fontSize: 13, lineHeight: '19px' }}>
          Your privacy is important to us. For any questions, contact us at{' '}
          <span style={{ color: Brand.accent, fontWeight: 700 }}>info@gameonmultisports.com</span>
        </span>
      </Card>
    </ScreenShell>
  );
}
