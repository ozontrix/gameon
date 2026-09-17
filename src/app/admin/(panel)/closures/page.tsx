import type { Metadata } from 'next';
import Link from 'next/link';

import { ConfirmAction } from '@/components/admin/confirm-action';
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import { deleteClosure } from '@/lib/admin/actions/catalog';
import { formatDate, formatTimeRange, todayIn } from '@/lib/admin/format';
import { listCatalogOptions, listClosures } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';
import { ClosureForm } from './closure-form';

export const metadata: Metadata = { title: 'Closures' };

export default async function ClosuresPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await requireAdmin();
  const { view } = await searchParams;
  const past = view === 'past';
  const [closures, options] = await Promise.all([listClosures(past ? 'past' : 'upcoming'), listCatalogOptions()]);
  const activeVenues = options.venues.filter((venue) => venue.is_active !== false);

  return (
    <>
      <PageHeader
        title="Closures & holidays"
        description="Block a whole venue or a single court for a day or part of a day. Blocked slots disappear from the app."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="Add closure" description="Existing bookings are not cancelled automatically." />
          <CardBody>
            {activeVenues.length ? (
              <ClosureForm venues={activeVenues} courts={options.courts} today={todayIn()} />
            ) : (
              <p className="text-sm text-zinc-500">Add a venue first.</p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={past ? 'Past closures' : 'Upcoming closures'}
            action={
              <Link href={past ? '/admin/closures' : '/admin/closures?view=past'} className="text-sm font-medium text-zinc-700 hover:underline">
                {past ? 'Show upcoming' : 'Show past'}
              </Link>
            }
          />
          {closures.length === 0 ? (
            <EmptyState title={past ? 'No past closures' : 'No upcoming closures'} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Applies to</Th>
                  <Th>Reason</Th>
                  {past ? null : <Th className="text-right">Action</Th>}
                </tr>
              </thead>
              <tbody>
                {closures.map((closure) => (
                  <tr key={closure.id} className="hover:bg-zinc-50">
                    <Td className="font-medium text-zinc-900">{formatDate(closure.date)}</Td>
                    <Td>{closure.start_time ? formatTimeRange(closure.start_time, closure.end_time) : 'All day'}</Td>
                    <Td>
                      <div>{closure.facilities?.name ?? 'Whole venue'}</div>
                      <div className="text-xs text-zinc-500">{closure.venues?.name}</div>
                    </Td>
                    <Td>{closure.reason}</Td>
                    {past ? null : (
                      <Td className="text-right">
                        <ConfirmAction
                          action={deleteClosure}
                          hidden={{ id: closure.id }}
                          trigger="Remove"
                          title="Remove this closure?"
                          description={`${formatDate(closure.date)} will be bookable again${closure.facilities?.name ? ` on ${closure.facilities.name}` : ''}.`}
                          confirmLabel="Remove closure"
                          confirmVariant="danger"
                        />
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
