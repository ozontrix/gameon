import type { Metadata } from 'next';
import { EmailConfirmationResult } from '@/components/EmailConfirmationResult';

export const metadata: Metadata = {
  title: 'Email verification',
  description: 'Confirm your GameOn account and continue in the app.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function EmailConfirmedPage() {
  return <EmailConfirmationResult />;
}