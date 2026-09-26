import type { Metadata } from 'next';
import Link from 'next/link';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Table, Td, Th, inputClass } from '@/components/admin/ui';
import { saveReferralSettings } from '@/lib/admin/actions/referrals';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDateTime } from '@/lib/admin/format';
import { getReferralSettings, listReferrals } from '@/lib/admin/queries/referrals';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Refer & Earn' };

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = pageFrom(params.page);
  const [settings, referrals] = await Promise.all([getReferralSettings(), listReferrals(page)]);

  return (
    <>
      <PageHeader
        title="Refer & Earn"
        description="What a referral pays out, and who's referred whom. A new signup with someone's code gets the signup bonus immediately; the referrer gets the first-booking bonus once — when the person they referred actually confirms a booking, not just signs up."
      />

      <Card className="mb-4 max-w-xl">
        <CardHeader title="Bonus amounts" />
        <CardBody>
          <ActionForm action={saveReferralSettings} className="flex flex-wrap items-end gap-4">
            <label className="space-y-1 text-xs text-zinc-600">
              Signup bonus (to the new player)
              <input
                name="signup_bonus_points"
                type="number"
                min={0}
                max={200000}
                step={1}
                defaultValue={settings.signup_bonus_points}
                className={`${inputClass} w-40`}
              />
              <FieldError name="signup_bonus_points" />
            </label>
            <label className="space-y-1 text-xs text-zinc-600">
              First-booking bonus (to the referrer)
              <input
                name="first_booking_bonus_points"
                type="number"
                min={0}
                max={200000}
                step={1}
                defaultValue={settings.first_booking_bonus_points}
                className={`${inputClass} w-40`}
              />
              <FieldError name="first_booking_bonus_points" />
            </label>
            <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
            <div className="w-full">
              <FormMessage />
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Referrals" description="Newest signups made with someone's code first." />
        {referrals.rows.length === 0 ? (
          <EmptyState title="No referrals yet" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>New player</Th>
                  <Th>Referred by</Th>
                  <Th>Signed up</Th>
                  <Th>First-booking bonus</Th>
                </tr>
              </thead>
              <tbody>
                {referrals.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <Td>
                      <Link href={`/admin/customers/${row.id}`} className="font-medium text-zinc-950 hover:underline">
                        {row.full_name || row.phone || row.email || '—'}
                      </Link>
                    </Td>
                    <Td>
                      {row.referrer ? (
                        <Link href={`/admin/customers/${row.referred_by}`} className="hover:underline">
                          {row.referrer.full_name || row.referrer.phone || row.referrer.email || '—'}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>{formatDateTime(row.created_at)}</Td>
                    <Td>{row.referral_bonus_paid ? 'Paid' : 'Not yet — awaiting their first booking'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination basePath="/admin/referrals" params={{}} page={page} pageSize={PAGE_SIZE} total={referrals.total} />
          </>
        )}
      </Card>
    </>
  );
}
