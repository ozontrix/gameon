import type { Metadata } from 'next';

import { PageHeader } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin/session';
import { CheckInStation } from './check-in-station';

export const metadata: Metadata = { title: 'Check-in' };

export default async function CheckInPage() {
  await requireStaff();

  return (
    <>
      <PageHeader
        title="Check-in"
        description="Scan the QR code in the customer's app. A booking is valid only on its date and can be used once."
      />
      <CheckInStation />
    </>
  );
}
