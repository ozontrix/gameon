import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';

const schema = z.object({
  topic: z.enum(['booking', 'facility', 'payment', 'app', 'other']),
  message: z.string().trim().min(10).max(500),
  replyEmail: z.string().trim().email().max(200),
  rating: z.number().int().min(1).max(5).optional(),
}).strict();

/** Guest-accessible, private feedback. Never publishes user content. */
export async function POST(request: Request) {
  return withRateLimit(request, { limit: 5, windowMs: 15 * 60_000, keyPrefix: 'app-feedback' }, async (req) => {
    const text = await req.text();
    if (text.length > 4000) return NextResponse.json({ error: 'Feedback is too long.' }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Please check your feedback.' }, { status: 400 });
    try {
      const { data, error } = await supabaseAdmin.from('app_support_requests').insert({
        kind: 'feedback', topic: parsed.data.topic, message: parsed.data.message,
        reply_email: parsed.data.replyEmail, rating: parsed.data.rating ?? null,
      }).select('id').single();
      if (error) throw error;
      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Your feedback could not be saved. Please try again.' }, { status: 503 });
    }
  });
}