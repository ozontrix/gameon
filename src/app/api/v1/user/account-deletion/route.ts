import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

const schema = z.object({
  confirmation: z.literal('DELETE'),
  replyEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
}).strict();

/** Initiation is authenticated; no caller-supplied account identifier is accepted. */
export async function POST(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Type DELETE to confirm and enter a valid reply email if supplied.' }, { status: 400 });
    try {
      const { data: auth, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.id);
      if (authError || !auth.user) throw authError ?? new Error('Account unavailable');
      const { data: existing, error: readError } = await supabaseAdmin.from('app_support_requests')
        .select('id, created_at').eq('user_id', user.id).eq('kind', 'deletion').eq('status', 'pending').maybeSingle();
      if (readError) throw readError;
      if (existing) return NextResponse.json({ success: true, data: existing }, { headers: { 'Cache-Control': 'no-store' } });
      const { data, error } = await supabaseAdmin.from('app_support_requests').insert({
        user_id: user.id, kind: 'deletion', topic: 'Account and associated personal data deletion',
        message: 'The authenticated account holder confirmed deletion of their account and associated personal data.',
        reply_email: parsed.data.replyEmail || (user.provider === 'email' ? auth.user.email : null) || null,
      }).select('id, created_at').single();
      if (error?.code === '23505') {
        const retry = await supabaseAdmin.from('app_support_requests').select('id, created_at')
          .eq('user_id', user.id).eq('kind', 'deletion').eq('status', 'pending').single();
        if (retry.error) throw retry.error;
        return NextResponse.json({ success: true, data: retry.data }, { headers: { 'Cache-Control': 'no-store' } });
      }
      if (error) throw error;
      return NextResponse.json({ success: true, data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ success: false, error: 'Your deletion request could not be saved. Please try again.' }, { status: 503 });
    }
  });
}