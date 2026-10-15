import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';
import { PushService } from '@/lib/services/push.service';

const schema = z.object({
  installationId: z.string().uuid(), secret: z.string().regex(/^[a-f0-9]{64}$/),
  platform: z.enum(['android', 'ios']), token: z.string().min(20).max(4096).regex(/^[\w:.-]+$/).nullable(),
  enabled: z.boolean(),
}).strict().refine(value => !value.enabled || value.token !== null);

/** Anonymous devices receive broadcasts only; identity always comes from auth. */
export async function POST(request: Request) {
  return withRateLimit(request, { limit: 60, windowMs: 60_000, keyPrefix: 'push-device' }, async req => {
    const save = async (userId: string | null) => {
      try {
        const text = await req.text();
        if (text.length > 6000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
        const parsed = schema.safeParse(JSON.parse(text));
        if (!parsed.success) return NextResponse.json({ error: 'Invalid device registration' }, { status: 400 });
        await PushService.register(parsed.data, userId);
        return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        if ((error as { code?: string }).code === '42501') return NextResponse.json({ error: 'Invalid installation credential' }, { status: 403 });
        console.error('[push] device registration unavailable');
        return NextResponse.json({ error: 'Device registration unavailable' }, { status: 503 });
      }
    };
    if (req.headers.has('authorization')) return withAuth(req, ['USER', 'ADMIN', 'STAFF'], (_req, user) => save(user.id));
    return save(null);
  });
}