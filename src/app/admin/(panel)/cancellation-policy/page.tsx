import type { Metadata } from 'next';
import Link from 'next/link';

import { CancellationTiersEditor } from '@/components/admin/cancellation-tiers-editor';
import { Card, CardBody, Notice, PageHeader } from '@/components/admin/ui';
import { listCancellationTiers } from '@/lib/admin/queries/cancellation-policy';
import { requireAdmin } from '@/lib/admin/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Cancellation policy' };

const KINDS = [
  { value: 'booking', label: 'Court bookings', live: true },
  { value: 'tournament', label: 'Tournament entries', live: false },
  { value: 'event', label: 'Event tickets', live: false },
] as const;

export default async function CancellationPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  await requireAdmin();
  const { kind: kindParam } = await searchParams;
  const kind = KINDS.find((k) => k.value === kindParam) ?? KINDS[0];
  const tiers = await listCancellationTiers(kind.value);

  return (
    <>
      <PageHeader
        title="Cancellation policy"
        description="What a customer gets back when they cancel their own booking, based on how much notice they give. GameOn's own cancellations (e.g. the venue closed) are unaffected — those stay a manual judgement call from the Refunds page."
      />

      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm sm:w-fit">
        {KINDS.map((k) => (
          <Link
            key={k.value}
            href={`/admin/cancellation-policy?kind=${k.value}`}
            className={cn(
              'rounded-md px-3 py-1.5',
              k.value === kind.value ? 'bg-white font-medium text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            {k.label}
          </Link>
        ))}
      </div>

      {!kind.live ? (
        <div className="mb-4">
          <Notice tone="info">
            {kind.label} can&apos;t be cancelled from the app yet — these tiers are ready for when that ships, but nothing
            reads them today.
          </Notice>
        </div>
      ) : null}

      <Card className="max-w-2xl">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-900">Refund tiers — {kind.label}</h2>
          <p className="text-xs text-zinc-500">
            The tier with the largest &quot;hours before&quot; that a cancellation still clears applies. Shorter notice than
            every tier here gets 0% — there is no assumed default.
          </p>
        </div>
        <CardBody>
          <CancellationTiersEditor appliesTo={kind.value} tiers={tiers} />
        </CardBody>
      </Card>
    </>
  );
}
