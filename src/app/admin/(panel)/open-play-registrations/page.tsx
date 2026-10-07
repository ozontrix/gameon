import type { Metadata } from 'next';
import Link from 'next/link';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Badge, Card, EmptyState, Field, PageHeader, StatCard, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDateTime } from '@/lib/admin/format';
import { listOpenPlayRegistrations, openPlayRegistrationStats, readOpenPlayFilters, type OpenPlaySearchParams } from '@/lib/admin/queries/open-play';
import { requireAdmin } from '@/lib/admin/session';
import { OPEN_PLAY_SPORTS } from '@/lib/open-play/constants';

export const metadata: Metadata = { title: 'Open Play Registrations', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function OpenPlayRegistrationsAdminPage({ searchParams }: { searchParams: Promise<OpenPlaySearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const filters = readOpenPlayFilters(params);
  const page = Math.min(pageFrom(params.page), 100000);
  const [{ registrations, total }, counts] = await Promise.all([listOpenPlayRegistrations(filters, page), openPlayRegistrationStats()]);
  const query = new URLSearchParams(Object.entries(filters).filter((pair): pair is [string, string] => Boolean(pair[1]))).toString();
  return <>
    <PageHeader title="Open Play Registrations" description="Free open play · Sunday, 18 October 2026. These are attendee interests, not paid bookings or reserved court slots." actions={<>
      <Link href="/open-play-registrations" className={buttonClass('secondary')}>View landing page</Link>
      <a href={`/admin/open-play-registrations/export?${query}`} className={buttonClass('primary')}>Export CSV</a>
    </>} />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{OPEN_PLAY_SPORTS.map(sport => <StatCard key={sport.id} label={sport.name} value={counts[sport.id]} hint="Sport registrations" />)}</div>
    <form method="get" className="mb-5 grid gap-3 sm:grid-cols-3">
      <Field label="Search registrations" htmlFor="open-play-search"><input id="open-play-search" name="q" defaultValue={filters.q} maxLength={100} placeholder="Name, phone, email or city" className={inputClass} /></Field>
      <Field label="Preferred sport" htmlFor="open-play-sport"><select id="open-play-sport" name="sport" defaultValue={filters.sport ?? ''} className={inputClass}><option value="">All sports</option>{OPEN_PLAY_SPORTS.map(sport => <option key={sport.id} value={sport.id}>{sport.name}</option>)}</select></Field>
      <div className="flex items-end gap-2"><button className={buttonClass('primary')}>Apply filters</button><Link href="/admin/open-play-registrations" className={buttonClass('secondary')}>Reset</Link></div>
    </form>
    <p className="mb-3 text-sm text-zinc-600">{total} matching sport registration{total === 1 ? '' : 's'}. A person may register once per sport.</p>
    <Card>{registrations.length ? <>
      <Table><thead><tr><Th>Attendee</Th><Th>Contact</Th><Th>Sport</Th><Th>Location</Th><Th>Campaign</Th><Th>Consent</Th><Th>Registered</Th></tr></thead>
        <tbody>{registrations.map(entry => {
          const attribution = entry.attribution && typeof entry.attribution === 'object' && !Array.isArray(entry.attribution) ? entry.attribution : {};
          return <tr key={entry.id}>
            <Td><p className="font-medium text-zinc-950">{entry.full_name}</p><p className="mt-1 text-xs text-zinc-500">#{entry.id.slice(0, 8).toUpperCase()}</p></Td>
            <Td><a href={`tel:+91${entry.phone}`} className="hover:underline">+91 {entry.phone}</a>{entry.email ? <p><a href={`mailto:${entry.email}`} className="hover:underline">{entry.email}</a></p> : <p className="text-xs text-zinc-500">Email not provided</p>}</Td>
            <Td><Badge tone="green">{OPEN_PLAY_SPORTS.find(sport => sport.id === entry.sport)?.name ?? entry.sport}</Badge></Td>
            <Td>{entry.city || '—'}</Td>
            <Td><p>{String(attribution.utm_source || 'Direct / not provided')}</p><p className="max-w-52 break-words text-xs text-zinc-500">{String(attribution.utm_campaign || '—')}</p></Td>
            <Td><p className="text-xs">Event contact: yes</p><Badge tone={entry.marketing_consent ? 'green' : 'neutral'}>{entry.marketing_consent ? 'Marketing opted in' : 'Event updates only'}</Badge></Td>
            <Td>{formatDateTime(entry.created_at)}</Td>
          </tr>;
        })}</tbody>
      </Table>
      <Pagination basePath="/admin/open-play-registrations" params={filters} page={page} pageSize={PAGE_SIZE} total={total} />
    </> : <EmptyState title="No open play registrations found" description="Registrations submitted on the campaign landing page appear here immediately. Try another search or reset your filters." />}</Card>
  </>;
}