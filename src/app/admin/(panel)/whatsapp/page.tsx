import type { Metadata } from 'next';
import { PageHeader, LinkButton } from '@/components/admin/ui';
import { WhatsAppWorkspace } from '@/components/admin/whatsapp-workspace';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'WhatsApp' };
export const dynamic = 'force-dynamic';

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<{ phone?: string; tab?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const phone = /^91[6-9]\d{9}$/.test(params.phone ?? '') ? params.phone : undefined;
  return <>
    <PageHeader title="WhatsApp" description="Your GameOn Cloud API inbox, customer replies and personalized campaigns." actions={<LinkButton href="/admin/whatsapp/deliveries" variant="secondary">Booking delivery log</LinkButton>} />
    <WhatsAppWorkspace initialPhone={phone} initialTab={params.tab === 'bulk' ? 'bulk' : 'inbox'} />
  </>;
}