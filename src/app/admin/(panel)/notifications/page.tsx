import type { Metadata } from 'next';
import Link from 'next/link';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { ConfirmAction } from '@/components/admin/confirm-action';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Table, Td, Th, inputClass, textareaClass } from '@/components/admin/ui';
import { deleteBroadcast, sendBroadcast } from '@/lib/admin/actions/content';
import { PAGE_SIZE } from '@/lib/admin/constants';
import { formatDateTime, titleCase } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';
import { firebaseCredentials } from '@/lib/push/firebase';

export const metadata: Metadata = { title: 'Notifications' };
export const maxDuration = 300;

function activeDeviceCutoff() {
  return new Date(Date.now() - 90 * 86400_000).toISOString();
}

export default async function NotificationsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const view = params.view === 'all' ? 'all' : 'broadcasts';
  const page = pageFrom(params.page);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabaseAdmin
    .from('notifications')
    // The relationship is named: notification_reads also links notifications to
    // profiles, so an unqualified `profiles` embed is ambiguous (PGRST201).
    .select(
      'id, user_id, kind, title, body, link, created_at, booking_id, profiles!notifications_user_id_fkey ( full_name, phone ), notification_reads ( count )',
      { count: 'exact' }
    );
  if (view === 'broadcasts') query = query.is('user_id', null);
  const { data: notifications, count, error } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const { count: appUsers } = await supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true });
  const [devices, pending, failed] = await Promise.all([
    supabaseAdmin.from('push_devices').select('installation_id', { count: 'exact', head: true }).eq('enabled', true).not('token', 'is', null)
      .gt('updated_at', activeDeviceCutoff()),
    supabaseAdmin.from('push_deliveries').select('id', { count: 'exact', head: true }).in('status', ['pending', 'sending']),
    supabaseAdmin.from('push_deliveries').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  ]);
  const pushConfigured = Boolean(firebaseCredentials());
  const pushDatabaseReady = !devices.error && !pending.error && !failed.error;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="App inbox messages and Firebase push notifications for Android and iOS. Booking updates are automatic; use broadcasts for news and offers."
      />

      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700" role="status">
        {!pushDatabaseReady ? 'Push database unavailable. Apply the Firebase push migration and check database access.' : (
          <p>{devices.count ?? 0} registered devices · {pending.count ?? 0} queued/in progress · {failed.count ?? 0} failed deliveries.</p>
        )}
        {!pushConfigured ? <p className="mt-1 text-amber-800">Firebase server credentials are missing. Inbox messages still save, but push delivery cannot run until credentials are configured.</p> : null}
        <p className="mt-1 text-xs text-zinc-500">Device registration requires the rebuilt app and notification permission. Queued or Firebase-accepted messages do not prove device receipt.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="Send to all app users" description={`${appUsers ?? 0} accounts. Push also reaches registered guest devices. No SMS is sent.`} />
          <CardBody>
            <ActionForm action={sendBroadcast} resetOnSuccess className="space-y-3">
              <FormMessage />
              <div className="space-y-1.5">
                <label htmlFor="kind" className="block text-sm font-medium text-zinc-800">
                  Type
                </label>
                <select id="kind" name="kind" defaultValue="general" className={inputClass}>
                  <option value="general">General update</option>
                  <option value="offer">Offer</option>
                  <option value="facility">Venue / facility news</option>
                  <option value="tournament">Event or tournament</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="title" className="block text-sm font-medium text-zinc-800">
                  Title
                </label>
                <input id="title" name="title" maxLength={80} className={inputClass} />
                <FieldError name="title" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="body" className="block text-sm font-medium text-zinc-800">
                  Message
                </label>
                <textarea id="body" name="body" maxLength={500} rows={4} className={textareaClass} />
                <FieldError name="body" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="link" className="block text-sm font-medium text-zinc-800">
                  Opens in the app (optional)
                </label>
                <input id="link" name="link" placeholder="/sports" className={inputClass} />
                <FieldError name="link" />
              </div>
              <SubmitButton className="w-full" pendingLabel="Sending…">
                Send to everyone
              </SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={view === 'all' ? 'All notifications' : 'Broadcasts'}
            action={
              <Link
                href={view === 'all' ? '/admin/notifications' : '/admin/notifications?view=all'}
                className="text-sm font-medium text-zinc-700 hover:underline"
              >
                {view === 'all' ? 'Show broadcasts only' : 'Include booking updates'}
              </Link>
            }
          />
          {!notifications?.length ? (
            <EmptyState title="Nothing sent yet" />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Sent</Th>
                    <Th>To</Th>
                    <Th>Message</Th>
                    <Th className="text-right">Read by</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="align-top hover:bg-zinc-50">
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(notification.created_at)}</Td>
                      <Td className="text-xs">
                        {notification.user_id ? (notification.profiles?.full_name || notification.profiles?.phone || 'Customer') : <Badge tone="violet">Everyone</Badge>}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Badge>{titleCase(notification.kind)}</Badge>
                          <span className="font-medium text-zinc-900">{notification.title}</span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-600">{notification.body}</p>
                        {notification.booking_id ? (
                          <Link href={`/admin/bookings/${notification.booking_id}`} className="text-xs text-zinc-500 hover:underline">
                            Open booking
                          </Link>
                        ) : notification.link ? (
                          <p className="text-xs text-zinc-500">Opens {notification.link}</p>
                        ) : null}
                      </Td>
                      <Td className="text-right tabular-nums">{notification.notification_reads[0]?.count ?? 0}</Td>
                      <Td className="text-right">
                        {notification.user_id ? null : (
                          <ConfirmAction
                            action={deleteBroadcast}
                            hidden={{ id: notification.id }}
                            trigger="Delete"
                            title="Delete this broadcast?"
                            description="It is removed from every user's notifications."
                            confirmLabel="Delete"
                            confirmVariant="danger"
                          />
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                basePath="/admin/notifications"
                params={{ view: view === 'all' ? 'all' : undefined }}
                page={page}
                pageSize={PAGE_SIZE}
                total={count ?? 0}
              />
            </>
          )}
        </Card>
      </div>
    </>
  );
}
