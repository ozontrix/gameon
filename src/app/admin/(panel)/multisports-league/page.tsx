import type { Metadata } from 'next';
import Link from 'next/link';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Badge, Card, EmptyState, Field, PageHeader, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { SPORTS } from '@/components/league/data';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDateTime, formatMoney } from '@/lib/admin/format';
import { leagueDetails, leagueParam, listLeagueBookings, readLeagueFilters, type LeagueSearchParams } from '@/lib/admin/queries/league';
import { requireAdmin } from '@/lib/admin/session';
import { confirmationBrackets, confirmationSchedule } from '@/lib/league/confirmation';

export const metadata: Metadata = { title: 'Multisports League bookings' };
export const dynamic = 'force-dynamic';

export default async function LeagueBookingsPage({ searchParams }: { searchParams: Promise<LeagueSearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const filters = readLeagueFilters(params);
  const page = Math.min(pageFrom(leagueParam(params.page)), 100000);
  const { bookings, total } = await listLeagueBookings(filters, page);
  const exportQuery = new URLSearchParams(Object.entries(filters).filter((pair): pair is [string, string] => Boolean(pair[1]))).toString();
  return <>
    <PageHeader title="GameOn Multisports League" description="Website entries, captured payments and confirmation email delivery. Pending entries are unpaid checkouts, not confirmed bookings." actions={<><Link href="/admin/multisports-league/coupons" className={buttonClass('secondary')}>Manage coupons</Link><Link href="/gameon-multisports-league" className={buttonClass('secondary')}>View website</Link><a href={`/admin/multisports-league/export?${exportQuery}`} className={buttonClass('primary')}>Export CSV</a></>} />
    <form method="get" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Search bookings" htmlFor="league-search"><input id="league-search" name="q" defaultValue={filters.q} maxLength={100} placeholder="Name, email, phone or payment ID" className={inputClass} /></Field>
      <Field label="Sport" htmlFor="league-sport"><select id="league-sport" name="sport" defaultValue={filters.sport ?? ''} className={inputClass}><option value="">All sports</option>{SPORTS.map(sport => <option value={sport.id} key={sport.id}>{sport.name}</option>)}</select></Field>
      <Field label="Payment status" htmlFor="league-status"><select id="league-status" name="status" defaultValue={filters.status ?? ''} className={inputClass}><option value="">All entries</option><option value="CONFIRMED">Confirmed / paid</option><option value="PENDING">Pending / unpaid</option></select></Field>
      <div className="flex items-end gap-2"><button className={buttonClass('primary')}>Apply filters</button><Link href="/admin/multisports-league" className={buttonClass('secondary')}>Reset</Link></div>
    </form>
    <Card>{!bookings.length ? <EmptyState title="No League entries found" description="New website checkouts appear here. Confirmed means Razorpay capture has been verified. Older email-only entries are not imported automatically." /> : <>
      <Table><thead><tr><Th>Entry / created</Th><Th>Contact</Th><Th>Sport / categories</Th><Th>Amount</Th><Th>Payment</Th><Th>Email</Th><Th>Details</Th></tr></thead><tbody>{bookings.map(booking => {
        const { entry } = leagueDetails(booking);
        return <tr key={booking.id}><Td><Link href={`/admin/multisports-league/${booking.id}`} className="font-medium text-zinc-950 hover:underline">{booking.reference ?? `#${booking.id.slice(0, 8).toUpperCase()}`}</Link><p className="mt-1 text-xs text-zinc-500">{formatDateTime(booking.created_at)}</p></Td><Td><p className="font-medium">{booking.captain_name}</p>{booking.team_name ? <p>{booking.team_name}</p> : null}<p>{booking.email}</p><p>{booking.phone}</p></Td><Td><p className="font-medium">{entry.sportName}</p><p>{confirmationBrackets(entry)}</p><p className="mt-1 text-xs text-zinc-500">{confirmationSchedule(entry)}</p></Td><Td>{formatMoney(booking.amount_paise / 100)}<p className="text-xs text-zinc-500">{entry.squadSize} player tickets</p></Td><Td><Badge tone={booking.status === 'CONFIRMED' ? 'green' : 'amber'}>{booking.status === 'CONFIRMED' ? 'Paid / confirmed' : 'Pending / unpaid'}</Badge></Td><Td><Badge tone={booking.email_status === 'SENT' ? 'green' : booking.email_status === 'FAILED' ? 'red' : 'neutral'}>{booking.email_status}</Badge></Td><Td><Link href={`/admin/multisports-league/${booking.id}`} className={buttonClass('secondary', 'sm')}>View entry</Link></Td></tr>;
      })}</tbody></Table>
      <Pagination basePath="/admin/multisports-league" params={filters} page={page} pageSize={PAGE_SIZE} total={total} />
    </>}</Card>
  </>;
}