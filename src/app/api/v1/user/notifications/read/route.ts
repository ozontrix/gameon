import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { NotificationService } from '@/lib/services/notification.service';

const readSchema = z.object({
  /** Omit to mark every notification read. */
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
});

export async function POST(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const validation = readSchema.safeParse(await req.json().catch(() => ({})));
      if (!validation.success) {
        return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
      }

      const marked = await NotificationService.markRead(user.id, validation.data.ids);
      const unread = await NotificationService.unreadCount(user.id);
      return NextResponse.json({ success: true, data: { marked, unread } });
    } catch (error) {
      console.error('Mark Notifications Read Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
