import type { Metadata } from 'next';
import Link from 'next/link';

import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Card, EmptyState, PageHeader, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDate, formatDateTime, formatMoney } from '@/lib/admin/format';
import { listCustomers } from '@/lib/admin/queries/customers';
import { requireStaff } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const page = pageFrom(params.page);
  const q = params.q?.trim() || undefined;
  const { customers, total } = await listCustomers(q, page);

  return (
    <>
      <PageHeader title="Customers" description="Everyone with a GameOn app account. Walk-in customers without an account appear only on their bookings." />

      <Card className="mb-4">
        <form method="get" className="flex gap-2 p-4">
          <label htmlFor="q" className="sr-only">
            Search customers
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, phone or email" className={inputClass} />
          <button type="submit" className={buttonClass('primary')}>
            Search
          </button>
          {q ? (
            <Link href="/admin/customers" className={buttonClass('ghost')}>
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      <Card>
        {customers.length === 0 ? (
          <EmptyState title={q ? 'No customers match that search' : 'No customers yet'} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Joined</Th>
                  <Th className="text-right">Bookings</Th>
                  <Th className="text-right">Spent</Th>
                  <Th>Last booking</Th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-50">
                    <Td>
                      <Link href={`/admin/customers/${customer.id}`} className="font-medium text-zinc-950 hover:underline">
                        {customer.full_name || customer.phone || customer.email || 'Unnamed'}
                      </Link>
                      <div className="text-xs text-zinc-500">{[customer.phone, customer.email].filter(Boolean).join(' · ')}</div>
                    </Td>
                    <Td className="text-xs">{formatDateTime(customer.created_at)}</Td>
                    <Td className="text-right tabular-nums">{customer.bookingCount}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(customer.spent)}</Td>
                    <Td>{customer.lastBooking ? formatDate(customer.lastBooking) : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination basePath="/admin/customers" params={{ q }} page={page} pageSize={PAGE_SIZE} total={total} />
          </>
        )}
      </Card>
    </>
  );
}
