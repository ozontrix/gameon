import { createHmac, timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { whatsAppEnv } from '@/lib/whatsapp/config';
import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { supabaseAdmin } from '@/lib/db/supabase';
import { toWhatsAppNumber } from '@/lib/whatsapp/phone';

/**
 * WhatsApp Cloud API webhook.
 *
 * `GET` answers Meta's one-time subscription check.
 * `POST` receives delivery receipts — sent, delivered, read, failed — and
 * advances the row the send recorded, which is what the WhatsApp panel shows.
 *
 * Unrelated payloads are acknowledged; invalid signatures are refused and
 * database failures return 503 so Meta can retry persisted status/STOP updates.
 */

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const expected = whatsAppEnv('WHATSAPP_VERIFY_TOKEN');
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (!expected) {
    console.error('CRITICAL: WHATSAPP_VERIFY_TOKEN is not configured; cannot verify the WhatsApp webhook.');
    return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 500 });
  }
  if (mode !== 'subscribe' || token !== expected || !challenge) {
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 403 });
  }
  // Meta expects the challenge back as plain text.
  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

/** `X-Hub-Signature-256` is `sha256=` plus the HMAC of the exact bytes sent. */
function isValidSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  const received = Buffer.from(header.slice('sha256='.length), 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

const payloadSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    id: z.string().optional(),
    changes: z.array(z.object({
      field: z.string().optional(),
      value: z.object({
        metadata: z.object({ phone_number_id: z.string() }),
        statuses: z.array(z.object({
          id: z.string(), status: z.string(), timestamp: z.string().optional(),
          biz_opaque_callback_data: z.string().optional(),
          errors: z.array(z.object({ code: z.union([z.number(), z.string()]).optional(), title: z.string().optional(), message: z.string().optional() })).optional(),
        })).optional(),
        messages: z.array(z.object({ from: z.string(), type: z.string(), text: z.object({ body: z.string() }).optional() })).optional(),
      }),
    })),
  })),
});

export async function POST(request: Request) {
  const secret = whatsAppEnv('WHATSAPP_APP_SECRET');
  if (!secret) {
    console.error('CRITICAL: WHATSAPP_APP_SECRET is not configured; rejecting the WhatsApp webhook.');
    return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > 1_048_576) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'), secret)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true });
  }

  const parsed = payloadSchema.safeParse(decoded);
  if (!parsed.success) return NextResponse.json({ received: true });
  const phoneId = whatsAppEnv('WHATSAPP_PHONE_NUMBER_ID');
  const wabaId = whatsAppEnv('WHATSAPP_WABA_ID');
  const values = parsed.data.entry.filter(entry => !wabaId || entry.id === wabaId)
    .flatMap(entry => entry.changes)
    .filter(change => (!change.field || change.field === 'messages') && change.value.metadata.phone_number_id === phoneId)
    .map(change => change.value);
  const statuses = values.flatMap(value => value.statuses ?? []).map(status => ({
    id: status.id, status: status.status, timestamp: status.timestamp,
    correlation: status.biz_opaque_callback_data, error: status.errors?.[0],
  }));

  try {
    for (const message of values.flatMap(value => value.messages ?? [])) {
      if (message.type !== 'text' || !/^(STOP|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test(message.text?.body.trim() ?? '')) continue;
      const phone = toWhatsAppNumber(message.from, whatsAppEnv('WHATSAPP_DEFAULT_COUNTRY_CODE', '91'));
      if (!phone) continue;
      const { error } = await supabaseAdmin.from('whatsapp_opt_outs').upsert({ phone }, { onConflict: 'phone' });
      if (error) throw error;
    }
    const applied = await WhatsAppService.applyStatusUpdate(statuses);
    return NextResponse.json({ received: true, applied });
  } catch {
    console.error('[whatsapp] webhook persistence failed; provider should retry');
    return NextResponse.json({ error: 'Webhook storage unavailable' }, { status: 503 });
  }
}
