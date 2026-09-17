import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { NotificationService } from '@/lib/services/notification.service';

/**
 * The signed-in player's notifications, newest first, with the unread count.
 * `?limit=` (max 100) and `?before=<created_at of the last item>` page through older ones;
 * `?countOnly=1` returns just the unread count, for the bell.
 */
export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const params = new URL(req.url).searchParams;
      const unread = await NotificationService.unreadCount(user.id);

      if (params.get('countOnly') === '1') {
        return NextResponse.json({ success: true, data: { unread } });
      }

      const limit = Math.min(Math.max(Number(params.get('limit')) || 50, 1), 100);
      const beforeParam = params.get('before');
      const before = beforeParam && !Number.isNaN(Date.parse(beforeParam)) ? beforeParam : null;
      const rows = await NotificationService.list(user.id, limit, before);

      return NextResponse.json({
        success: true,
        data: {
          unread,
          notifications: rows.map((row) => ({
            id: row.id,
            kind: row.kind,
            title: row.title,
            body: row.body,
            link: row.link,
            bookingId: row.booking_id,
            isBroadcast: row.is_broadcast,
            isRead: row.is_read,
            createdAt: row.created_at,
          })),
          nextBefore: rows.length === limit ? rows[rows.length - 1].created_at : null,
        },
      });
    } catch (error) {
      console.error('Get Notifications Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
