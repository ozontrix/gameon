import type { Metadata } from 'next';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';
import { formatDateTime } from '@/lib/admin/format';

export const metadata: Metadata = { title: 'App support & deletion requests' };

export default async function AppSupportPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const page = pageFrom((await searchParams).page);
  const { data, error, count } = await supabaseAdmin.from('app_support_requests')
    .select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * 25, page * 25 - 1);
  if (error) throw error;
  return <>
    <PageHeader title="App support & deletion requests" description="Private feedback and verified in-app deletion requests. Review this inbox daily." />
    <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      Deletion requests are not automatic deletion. Complete removal from Supabase, Firebase, profile photos and associated personal data,
      reconcile outstanding bookings/refunds, retain only legally required records, and send completion confirmation within 30 days.
      Do not mark a request complete or tell a customer their account is deleted before verifying every step.
    </p>
    <Card>{!data?.length ? <EmptyState title="No requests yet" /> : <Table>
      <thead><tr><Th>Received</Th><Th>Type / status</Th><Th>Contact / account</Th><Th>Message / reference</Th></tr></thead>
      <tbody>{data.map(row => <tr key={row.id}>
        <Td>{formatDateTime(row.created_at)}</Td><Td>{row.kind} / {row.status}<br />{row.topic}{row.rating ? ` · ${row.rating}/5` : ''}</Td>
        <Td>{row.reply_email ?? 'Use verified phone on account'}<br /><span className="break-all text-xs">{row.user_id}</span></Td>
        <Td><p className="whitespace-pre-wrap">{row.message}</p><span className="break-all text-xs">{row.id}</span></Td>
      </tr>)}</tbody>
    </Table>}</Card>
    <Pagination basePath="/admin/app-support" params={{}} page={page} pageSize={25} total={count ?? 0} />
  </>;
}