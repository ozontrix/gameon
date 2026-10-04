import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { Badge, Card, CardBody, CardHeader, DetailList, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import { retryLeagueEmail } from '@/lib/admin/actions/league';
import { formatDate, formatDateTime, formatMoney } from '@/lib/admin/format';
import { getLeagueBooking, leagueDetails } from '@/lib/admin/queries/league';
import { requireAdmin } from '@/lib/admin/session';
import { LEAGUE_NAME, LEAGUE_VENUE } from '@/lib/league/constants';

export const metadata: Metadata = { title: 'League entry details' };
export const dynamic = 'force-dynamic';

export default async function LeagueEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const booking = await getLeagueBooking(id);
  if (!booking) notFound();
  const { entry, quote } = leagueDetails(booking);
  return <>
    <PageHeader title={booking.reference ?? 'Pending League entry'} description={`${LEAGUE_NAME} · ${LEAGUE_VENUE}`} back={{ href: '/admin/multisports-league', label: 'All League entries' }} />
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardHeader title="Player & contact" /><CardBody><DetailList items={[
        { label: 'Player / captain', value: booking.captain_name }, { label: 'Team', value: booking.team_name || '—' },
        { label: 'Email', value: booking.email }, { label: 'Phone', value: booking.phone },
        { label: 'City', value: entry.city || '—' }, { label: 'Player tickets', value: entry.squadSize },
        { label: 'Notes', value: <span className="whitespace-pre-wrap">{entry.notes || '—'}</span> },
      ]} /></CardBody></Card>
      <Card><CardHeader title="Payment & order" /><CardBody><DetailList items={[
        { label: 'Status', value: <Badge tone={booking.status === 'CONFIRMED' ? 'green' : 'amber'}>{booking.status === 'CONFIRMED' ? 'Paid / confirmed' : 'Pending / unpaid'}</Badge> },
        { label: 'Booking ID', value: booking.id }, { label: 'Reference', value: booking.reference || '—' },
        { label: 'Razorpay order', value: booking.razorpay_order_id || 'Not created' }, { label: 'Razorpay payment', value: booking.razorpay_payment_id || '—' },
        { label: 'Total / INR', value: formatMoney(booking.amount_paise / 100) },
        { label: 'Created', value: formatDateTime(booking.created_at) }, { label: 'Confirmed', value: formatDateTime(booking.paid_at) },
      ]} /></CardBody></Card>
      <Card><CardHeader title={`${entry.sportName} categories`} /><Table><thead><tr><Th>Sport / Category</Th><Th>Match date</Th><Th>Entry fee</Th><Th>Players</Th></tr></thead><tbody>{entry.categories.map(category => <tr key={`${category.sportId ?? entry.sport}:${category.id}`}><Td>{category.sportName ? `${category.sportName} · ` : ''}{category.name}</Td><Td>{formatDate(category.date ?? entry.date)}</Td><Td>{formatMoney(category.fee)}</Td><Td>{category.squadSize ?? '—'}</Td></tr>)}</tbody></Table></Card>
      <Card><CardHeader title="Price breakdown" /><CardBody><DetailList items={[
        { label: 'Entry fees', value: formatMoney(quote.entryFee) }, { label: 'Add-ons', value: formatMoney(quote.addOnsTotal) },
        { label: 'Subtotal', value: formatMoney(quote.subtotal) }, { label: 'Discount', value: formatMoney(quote.discount) },
        { label: 'Applied coupon', value: quote.couponCode || '—' }, { label: 'Total', value: formatMoney(quote.total) },
      ]} />{entry.addons.map(addon => <p key={addon.id} className="mt-2 text-sm text-zinc-700">{addon.name} × {addon.qty}: {formatMoney(addon.amount)}</p>)}</CardBody></Card>
      <Card className="lg:col-span-2"><CardHeader title="Confirmation email" /><CardBody><DetailList items={[
        { label: 'Delivery', value: <Badge tone={booking.email_status === 'SENT' ? 'green' : booking.email_status === 'FAILED' ? 'red' : 'neutral'}>{booking.email_status}</Badge> },
        { label: 'Last attempt', value: formatDateTime(booking.email_attempted_at) }, { label: 'Sent at', value: formatDateTime(booking.email_sent_at) },
        { label: 'Delivery error', value: booking.email_error || '—' },
      ]} />{booking.status === 'CONFIRMED' && booking.email_status !== 'SENT' ? <ActionForm action={retryLeagueEmail} className="mt-4 space-y-3"><input type="hidden" name="id" value={id} /><FormMessage /><SubmitButton pendingLabel="Sending…">Retry confirmation email</SubmitButton></ActionForm> : null}</CardBody></Card>
    </div>
  </>;
}