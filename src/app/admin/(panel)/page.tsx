import { CirclePlus, ScanLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { RevenueChart } from '@/components/admin/revenue-chart';
import { PaymentStatusBadge } from '@/components/admin/status';
import { Badge, Card, CardBody, CardHeader, EmptyState, LinkButton, Notice, PageHeader, StatCard } from '@/components/admin/ui';
import { formatDate, formatMoney, formatTimeRange } from '@/lib/admin/format';
import { getDashboard } from '@/lib/admin/queries/dashboard';
import { requireStaff } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const session = await requireStaff();
  const [{ denied }, data] = await Promise.all([searchParams, getDashboard()]);
  const isAdmin = session.role === 'ADMIN';

  const { bookedMinutes, openMinutes } = data.occupancy;
  const occupancy = openMinutes ? Math.round((bookedMinutes / openMinutes) * 100) : null;
  const hours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10} h`;
  const upcoming = data.todaysBookings.filter((b) => b.end_time > data.nowTime);
  const finished = data.todaysBookings.length - upcoming.length;

  const attention = [
    isAdmin && data.refundsPending > 0
      ? { href: '/admin/refunds', label: `${data.refundsPending} paid booking(s) waiting for a refund`, tone: 'red' as const }
      : null,
    data.unpaidUpcoming > 0
      ? {
          href: `/admin/bookings?status=CONFIRMED&payment=UNPAID&from=${data.today}`,
          label: `${data.unpaidUpcoming} upcoming booking(s) to be paid at the venue`,
          tone: 'amber' as const,
        }
      : null,
    data.checkoutsInProgress > 0
      ? {
          href: `/admin/bookings?status=PENDING`,
          label: `${data.checkoutsInProgress} customer(s) paying in the app right now`,
          tone: 'blue' as const,
        }
      : null,
    ...data.closuresToday.map((closure) => ({
      href: '/admin/closures',
      label: `Closure today: ${closure.reason}${closure.start_time ? ` (${formatTimeRange(closure.start_time, closure.end_time)})` : ''}`,
      tone: 'neutral' as const,
    })),
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={formatDate(data.today)}
        actions={
          <>
            <LinkButton href="/admin/check-in" variant="secondary">
              <ScanLine className="size-4" aria-hidden /> Check-in
            </LinkButton>
            <LinkButton href="/admin/bookings/new">
              <CirclePlus className="size-4" aria-hidden /> New booking
            </LinkButton>
          </>
        }
      />

      {denied ? (
        <div className="mb-4">
          <Notice tone="warning">That page is only available to admins.</Notice>
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bookings today"
          value={data.todaysBookings.length}
          hint={`${data.checkedIn} checked in · ${finished} finished`}
          href={`/admin/bookings?from=${data.today}&to=${data.today}&status=CONFIRMED`}
        />
        <StatCard
          label="Occupancy today"
          value={occupancy === null ? '—' : `${occupancy}%`}
          hint={openMinutes ? `${hours(bookedMinutes)} of ${hours(openMinutes)} court time booked` : 'No courts open today'}
          href="/admin/schedule"
        />
        <StatCard label="Revenue today" value={formatMoney(data.revenueToday)} hint="Paid bookings played today" />
        <StatCard
          label="Revenue this month"
          value={formatMoney(data.revenueMonth)}
          hint={`${formatMoney(data.revenueLast7)} in the last 7 days`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Paid revenue, last 14 days"
            description="By the date the court was played. Refunded and cancelled bookings are excluded."
          />
          <CardBody>
            <RevenueChart days={data.chart} today={data.today} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Needs attention" />
          <CardBody>
            {attention.length === 0 ? (
              <p className="text-sm text-zinc-500">All clear.</p>
            ) : (
              <ul className="space-y-2">
                {attention.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="flex items-start gap-2 rounded-lg p-2 text-sm text-zinc-800 hover:bg-zinc-50">
                      <Badge tone={item.tone}>!</Badge>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="Still to play today"
            description={`${upcoming.length} booking(s)`}
            action={
              <LinkButton href="/admin/schedule" variant="secondary" size="sm">
                Open schedule
              </LinkButton>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing left on today's schedule" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {upcoming.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-zinc-50"
                  >
                    <span className="w-40 font-medium tabular-nums text-zinc-900">
                      {formatTimeRange(booking.start_time, booking.end_time)}
                    </span>
                    <span className="min-w-40 flex-1 text-zinc-700">{booking.facilities?.name}</span>
                    <span className="min-w-32 text-zinc-700">{booking.contact_name || 'App customer'}</span>
                    <span className="flex gap-1">
                      <PaymentStatusBadge status={booking.payment_status} />
                      {booking.is_scanned ? <Badge tone="blue">Checked in</Badge> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
