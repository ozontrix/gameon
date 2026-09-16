import type { Metadata } from 'next';
import Link from 'next/link';

import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th, buttonClass, inputClass } from '@/components/admin/ui';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDateTime, titleCase } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Activity log' };

const ENTITY_TYPES = ['booking', 'venue', 'court', 'sport', 'operating_hours', 'closure', 'team_member'] as const;

/** Where an audit entry's subject can be opened in the panel. */
function entityHref(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case 'booking':
      return `/admin/bookings/${entityId}`;
    case 'venue':
    case 'operating_hours':
      return `/admin/venues/${entityId}`;
    case 'court':
      return `/admin/courts/${entityId}`;
    case 'closure':
      return '/admin/closures';
    case 'sport':
      return '/admin/sports';
    case 'team_member':
      return '/admin/team';
    default:
      return null;
  }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = pageFrom(params.page);
  const type = (ENTITY_TYPES as readonly string[]).includes(params.type ?? '') ? params.type : undefined;
  const from = (page - 1) * PAGE_SIZE;

  let query = supabaseAdmin
    .from('admin_audit_log')
    .select('id, actor_email, action, entity_type, entity_id, details, created_at', { count: 'exact' });
  if (type) query = query.eq('entity_type', type);
  const { data: entries, count, error } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  return (
    <>
      <PageHeader title="Activity log" description="Every change made from the admin panel: who did it, when, and what changed." />

      <Card className="mb-4">
        <form method="get" className="flex flex-wrap gap-2 p-4">
          <select name="type" defaultValue={type ?? ''} className={cn(inputClass, 'w-auto')} aria-label="What changed">
            <option value="">Everything</option>
            {ENTITY_TYPES.map((entity) => (
              <option key={entity} value={entity}>
                {titleCase(entity)}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass('secondary')}>
            Filter
          </button>
        </form>
      </Card>

      <Card>
        {!entries?.length ? (
          <EmptyState title="No activity yet" description="Changes made in the admin panel will be listed here." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Who</Th>
                  <Th>What</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const href = entityHref(entry.entity_type, entry.entity_id);
                  return (
                    <tr key={entry.id} className="align-top hover:bg-zinc-50">
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(entry.created_at)}</Td>
                      <Td className="text-xs">{entry.actor_email ?? 'Unknown'}</Td>
                      <Td>
                        <Badge>{entry.action}</Badge>
                        {href ? (
                          <Link href={href} className="mt-1 block text-xs text-zinc-500 hover:underline">
                            Open {titleCase(entry.entity_type)}
                          </Link>
                        ) : null}
                      </Td>
                      <Td>
                        <details>
                          <summary className="cursor-pointer text-xs text-zinc-500">Show</summary>
                          <pre className="mt-2 max-w-md overflow-x-auto rounded bg-zinc-50 p-2 text-xs text-zinc-700">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </details>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination basePath="/admin/activity" params={{ type }} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
          </>
        )}
      </Card>
    </>
  );
}
