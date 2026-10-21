import type { Metadata } from 'next';

import { ActionForm, SubmitButton } from '@/components/admin/action-form';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  Notice,
  PageHeader,
  StatCard,
  Table,
  Td,
  Th,
  type BadgeTone,
} from '@/components/admin/ui';
import { retryWhatsAppDelivery } from '@/lib/admin/actions/whatsapp';
import { formatDateTime } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/admin/session';
import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { prettyWhatsAppNumber } from '@/lib/whatsapp/phone';

export const metadata: Metadata = { title: 'WhatsApp deliveries' };

const PAGE_SIZE = 25;

const STATUS_TONES: Record<string, BadgeTone> = {
  queued: 'blue', processing: 'blue', sending: 'violet', unknown: 'amber',
  sent: 'violet',
  delivered: 'green',
  read: 'green',
  failed: 'red',
  skipped: 'amber',
};

const CATEGORY_LABELS: Record<string, string> = {
  booking: 'Court booking',
  event: 'Event tickets',
  tournament: 'Tournament entry',
};

/** Which variable is missing, without ever echoing a value. */
function missingConfig(): string[] {
  const required = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
  return required.filter((key) => !process.env[key]);
}

export default async function WhatsAppAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = ['queued', 'processing', 'sending', 'unknown', 'sent', 'delivered', 'read', 'failed', 'skipped'].includes(params.status ?? '')
    ? params.status
    : undefined;
  const page = pageFrom(params.page);

  const config = getWhatsAppConfig();
  const [stats, list] = await Promise.all([
    WhatsAppService.stats(),
    WhatsAppService.listMessages({ status, page, limit: PAGE_SIZE }),
  ]);
  const missing = config ? [] : missingConfig();

  return (
    <>
      <PageHeader
        title="WhatsApp deliveries"
        description="Automatic booking confirmations and safe recovery."
        back={{ href: '/admin/whatsapp', label: 'WhatsApp inbox' }}
      />

      {config ? (
        <Notice tone="success" title="Credentials configured (not proof of delivery)">
          Sending template <strong>{config.templateName}</strong> ({config.language}) from phone number id {config.phoneNumberId} on
          Graph {config.version}. Delivery receipts arrive on <code>/api/v1/webhooks/whatsapp</code>.
        </Notice>
      ) : (
        <Notice tone="danger" title="Not configured">
          No confirmation can be sent until {missing.length ? <strong>{missing.join(', ')}</strong> : 'the Cloud API settings'}{' '}
          {missing.length === 1 ? 'is' : 'are'} set in the production environment. See WHATSAPP_DELIVERY.md.
        </Notice>
      )}

      <div className="my-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Sent" value={stats.sent} hint="Accepted by Meta" />
        <StatCard label="Delivered" value={stats.delivered} />
        <StatCard label="Read" value={stats.read} />
        <StatCard label="Failed" value={stats.failed} hint={stats.failed ? 'Resend from the log' : undefined} />
        <StatCard label="Skipped" value={stats.skipped} hint="No usable number" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Notice title="A unique check-in QR for each reservation">
          The server generates the reservation QR privately, uploads that PNG to Meta, and uses its own media ID in the template.
          No shared header image is used. Only confirmed reservations with WhatsApp permission are eligible.
          Unknown delivery means Meta may have accepted it: inspect provider receipts before resending.
        </Notice>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Delivery log"
              description="Newest first."
              action={
                <div className="flex flex-wrap gap-1">
                  <LinkButton href="/admin/whatsapp/deliveries" variant={status ? 'ghost' : 'secondary'} size="sm">
                    All
                  </LinkButton>
                  {['queued', 'failed', 'unknown', 'skipped'].map((entry) => (
                    <LinkButton
                      key={entry}
                      href={`/admin/whatsapp/deliveries?status=${entry}`}
                      variant={status === entry ? 'secondary' : 'ghost'}
                      size="sm"
                    >
                      {entry.charAt(0).toUpperCase() + entry.slice(1)}
                    </LinkButton>
                  ))}
                </div>
              }
            />
            {list.rows.length === 0 ? (
              <EmptyState
                title="No deliveries yet"
                description="The next confirmed booking, ticket order or tournament entry will appear here."
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>For</Th>
                    <Th>Number</Th>
                    <Th>Status</Th>
                    <Th>Recovery</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((row) => (
                    <tr key={row.id}>
                      <Td>{formatDateTime(row.created_at)}</Td>
                      <Td>
                        {CATEGORY_LABELS[row.category] ?? row.category}
                        <br />
                        <span className="font-mono text-xs text-zinc-500">#{row.reference_id.slice(0, 8).toUpperCase()}</span>
                      </Td>
                      <Td className="whitespace-nowrap">{prettyWhatsAppNumber(row.to_phone)}</Td>
                      <Td>
                        <Badge tone={STATUS_TONES[row.status] ?? 'neutral'}>{row.status}</Badge>
                        {row.error_code ? (
                          <span className="block text-xs text-red-700">{row.error_code}</span>
                        ) : null}
                        {row.error_message ? (
                          <span className="block text-xs text-zinc-500">{row.error_message}</span>
                        ) : null}
                        {row.attempts > 1 ? (
                          <span className="block text-xs text-zinc-500">{row.attempts} attempts</span>
                        ) : null}
                      </Td>
                      <Td>
                        {['queued','failed','skipped'].includes(row.status) && row.consent_at ? (
                          <ActionForm action={retryWhatsAppDelivery}>
                            <input type="hidden" name="id" value={row.id} />
                            <SubmitButton variant="ghost" size="sm" pendingLabel="Sending…">
                              Resend
                            </SubmitButton>
                          </ActionForm>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <Pagination
              basePath="/admin/whatsapp/deliveries"
              params={status ? { status } : {}}
              page={page}
              pageSize={PAGE_SIZE}
              total={list.total}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
