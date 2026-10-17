import type { Metadata } from 'next';

import { PageHeader } from '@/components/admin/ui';
import { requireStaff } from '@/lib/admin/session';
import { CheckInStation } from './check-in-station';
import { supabaseAdmin } from '@/lib/db/supabase';

export const metadata: Metadata = { title: 'Check-in' };

export default async function CheckInPage() {
  await requireStaff();
  const { data: venues, error } = await supabaseAdmin.from('venues').select('id, name').eq('is_active', true).order('name');
  if (error) throw error;

  return (
    <>
      <PageHeader
        title="QR Check-In"
        description="Hands-free reception check-in. Scan the booking QR from the GameOn app or confirmation message."
      />
      <CheckInStation venues={venues ?? []} />
    </>
  );
}
