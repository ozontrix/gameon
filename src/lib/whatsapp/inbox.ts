import 'server-only';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { recordAudit } from '@/lib/admin/audit';
import type { StaffSession } from '@/lib/admin/session';
import type { Json } from '@/types/database.types';
import { getWhatsAppConfig, whatsAppEnv } from './config';
import { sendTemplateMessage } from './client';
import { toWhatsAppNumber } from './phone';
import { leagueWhatsAppNumber, personalize, serviceWindowOpen, templateFields, type InboxTemplate } from './inbox-shared';

export class InboxError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

async function graph(path: string) {
  const config = getWhatsAppConfig();
  if (!config) throw new InboxError('Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID on the server.', 503);
  const response = await fetch(`https://graph.facebook.com/${config.version}/${path}`, {
    headers: { Authorization: `Bearer ${config.token}` }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new InboxError(`Meta account request failed (${response.status}). Check token permissions and account configuration.`, 502);
  return response.json();
}

export async function getInboxTemplates(): Promise<InboxTemplate[]> {
  const waba = whatsAppEnv('WHATSAPP_WABA_ID');
  if (!/^\d+$/.test(waba)) throw new InboxError('Set WHATSAPP_WABA_ID to load approved templates.', 503);
  const templates: InboxTemplate[] = [];
  let after = '';
  for (let page = 0; page < 20; page++) {
    const data = await graph(`${waba}/message_templates?fields=id,name,language,status,category,components&limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`);
    templates.push(...(data.data ?? []));
    if (!data.paging?.next) return templates;
    after = data.paging?.cursors?.after;
    if (!after) break;
  }
  throw new InboxError('Template list is too large to load safely. Narrow the account template catalogue.', 502);
}

export async function inboxAccount() {
  const config = getWhatsAppConfig();
  if (!config) return { configured: false, webhookConfigured: false, templates: [], error: 'Server WhatsApp credentials are missing or invalid.' };
  const waba = whatsAppEnv('WHATSAPP_WABA_ID');
  const [phone, templates, subscriptions] = await Promise.allSettled([
    graph(`${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`), getInboxTemplates(),
    /^\d+$/.test(waba) ? graph(`${waba}/subscribed_apps`) : Promise.reject(new InboxError('Set WHATSAPP_WABA_ID to check subscriptions.')),
  ]);
  return {
    configured: true, webhookConfigured: Boolean(config.appSecret && config.verifyToken),
    phoneNumberId: config.phoneNumberId, wabaId: whatsAppEnv('WHATSAPP_WABA_ID'), version: config.version,
    phone: phone.status === 'fulfilled' ? phone.value : null,
    subscribedAppCount: subscriptions.status === 'fulfilled' ? subscriptions.value.data?.length ?? 0 : null,
    templates: templates.status === 'fulfilled' ? templates.value : [],
    error: [phone, templates, subscriptions].filter(result => result.status === 'rejected').map(result => (result as PromiseRejectedResult).reason?.message || 'Meta request failed.').join(' '),
  };
}

export async function inboxContacts(page: number, search: string) {
  let query = supabaseAdmin.from('whatsapp_contacts').select('*', { count: 'exact' });
  const term = search.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 80);
  if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data, error, count } = await query.order('last_message_at', { ascending: false }).order('phone').range((page - 1) * 50, page * 50 - 1);
  if (error) throw error;
  return { contacts: data ?? [], total: count ?? 0 };
}

export async function inboxMessages(phone: string, before?: string) {
  // A terminated request may never receive the send response; never advertise a safe retry.
  const recovered = await supabaseAdmin.from('whatsapp_chat_messages').update({ status: 'unknown', error_message: 'Send response was not recorded. Check Meta receipts before resending.' })
    .eq('phone', phone).eq('status', 'sending').lt('created_at', new Date(Date.now() - 120_000).toISOString());
  if (recovered.error) throw recovered.error;
  let query = supabaseAdmin.from('whatsapp_chat_messages').select('*').eq('phone', phone);
  if (before) {
    const [created, id] = before.split('|');
    if (!z.string().datetime({ offset: true }).safeParse(created).success || !z.string().uuid().safeParse(id).success) throw new InboxError('Invalid history cursor.');
    query = query.or(`created_at.lt.${created},and(created_at.eq.${created},id.lt.${id})`);
  }
  const [messages, contact, optOut] = await Promise.all([
    query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50),
    supabaseAdmin.from('whatsapp_contacts').select('*').eq('phone', phone).maybeSingle(),
    supabaseAdmin.from('whatsapp_opt_outs').select('phone').eq('phone', phone).maybeSingle(),
  ]);
  for (const result of [messages, contact, optOut]) if (result.error) throw result.error;
  const rows = messages.data ?? [];
  const last = rows.at(-1);
  return { messages: rows.reverse(), contact: contact.data, optedOut: Boolean(optOut.data), next: rows.length === 50 && last ? `${last.created_at}|${last.id}` : null };
}

export async function inboxLeague(page: number, search: string) {
  let query = supabaseAdmin.from('league_bookings').select('id,captain_name,phone,reference,amount_paise', { count: 'exact' }).eq('status', 'CONFIRMED').gt('amount_paise', 0);
  const term = search.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 80);
  if (term) query = query.or(`captain_name.ilike.%${term}%,phone.ilike.%${term}%,reference.ilike.%${term}%`);
  const { data, error, count } = await query.order('created_at', { ascending: false }).order('id').range((page - 1) * 100, page * 100 - 1);
  if (error) throw error;
  return { recipients: (data ?? []).map(row => ({ id: row.id, name: row.captain_name, phone: leagueWhatsAppNumber(row.phone), rawPhone: row.phone, reference: row.reference, amount: row.amount_paise / 100 })), total: count ?? 0 };
}

const sendSchema = z.object({
  batchId: z.string().uuid(), phone: z.string().regex(/^91[6-9]\d{9}$/).optional(), leagueId: z.string().uuid().optional(),
  kind: z.enum(['text', 'template']), body: z.string().trim().max(4096).default(''),
  templateId: z.string().max(100).optional(), variables: z.record(z.string(), z.string().trim().min(1).max(500)).default({}),
}).refine(value => Boolean(value.phone) !== Boolean(value.leagueId), 'Choose one contact or one league entry.');

export async function sendInboxMessage(input: unknown, actor: StaffSession) {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) throw new InboxError(parsed.error.issues[0]?.message || 'Invalid message.');
  const draft = parsed.data;
  const config = getWhatsAppConfig();
  if (!config) throw new InboxError('WhatsApp server credentials are missing or invalid.', 503);
  let phone = draft.phone ?? '';
  let name = '';
  let reference = '';
  if (draft.leagueId) {
    const { data, error } = await supabaseAdmin.from('league_bookings').select('phone,captain_name,reference,status,amount_paise').eq('id', draft.leagueId).maybeSingle();
    if (error) throw error;
    if (!data || data.status !== 'CONFIRMED' || data.amount_paise <= 0) throw new InboxError('Only confirmed paid or partially paid entries can be messaged.');
    phone = leagueWhatsAppNumber(data.phone) ?? '';
    name = data.captain_name;
    reference = data.reference ?? '';
  }
  if (!phone) throw new InboxError('Entry does not have a valid ten-digit Indian mobile number.');
  const [contact, optOut] = await Promise.all([
    supabaseAdmin.from('whatsapp_contacts').select('*').eq('phone', phone).maybeSingle(),
    supabaseAdmin.from('whatsapp_opt_outs').select('phone').eq('phone', phone).maybeSingle(),
  ]);
  if (contact.error) throw contact.error;
  if (optOut.error) throw optOut.error;
  if (optOut.data) throw new InboxError('Recipient opted out. Sending is blocked.');
  name = name || contact.data?.name || 'Player';
  let payload: Record<string, unknown>;
  let body: string;
  if (draft.kind === 'text') {
    if (!serviceWindowOpen(contact.data?.last_inbound_at)) throw new InboxError('The 24-hour reply window is closed. Choose an approved template.');
    body = personalize(draft.body, { name, reference });
    if (!body.trim() || body.length > 4096) throw new InboxError('Enter a message of up to 4096 characters.');
    payload = { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } };
  } else {
    const template = (await getInboxTemplates()).find(item => item.id === draft.templateId);
    if (!template) throw new InboxError('Template not found in this WhatsApp account.');
    const definition = templateFields(template);
    if (definition.reason) throw new InboxError(definition.reason);
    const consent = template.category === 'MARKETING' ? contact.data?.marketing_consent_at : contact.data?.utility_consent_at;
    if (!consent) throw new InboxError(`Record explicit ${template.category.toLowerCase()} messaging consent before sending this template. Payment alone is not consent.`);
    const components = ['header', 'body'].flatMap(component => {
      const fields = definition.fields.filter(field => field.component === component);
      if (!fields.length) return [];
      return [{ type: component, parameters: fields.map(field => {
        const text = personalize(draft.variables[`${component}.${field.key}`] ?? '', { name, reference });
        if (!text.trim() || text.length > 500 || /[\r\n\t]/.test(text)) throw new InboxError(`Enter a single-line value for ${component}.${field.key} (up to 500 characters).`);
        return { type: 'text', text, ...(/^\d+$/.test(field.key) ? {} : { parameter_name: field.key }) };
      }) }];
    });
    body = template.components.filter(component => component.text).map(component => (component.text ?? '').replace(/\{\{\s*([a-zA-Z_0-9]+)\s*\}\}/g, (_, key) => personalize(draft.variables[`${component.type.toLowerCase()}.${key}`] ?? '', { name, reference }))).join('\n\n');
    payload = { messaging_product: 'whatsapp', to: phone, type: 'template', template: { name: template.name, language: { code: template.language }, components } };
  }
  const requestKey = `${actor.id}:${draft.batchId}:${phone}`;
  const existing = await supabaseAdmin.from('whatsapp_chat_messages').select('id,status').eq('request_key', requestKey).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { id: existing.data.id, status: existing.data.status, duplicate: true };
  const savedContact = await supabaseAdmin.from('whatsapp_contacts').upsert({ phone, name }, { onConflict: 'phone' });
  if (savedContact.error) throw savedContact.error;
  const id = randomUUID();
  payload.biz_opaque_callback_data = `chat:${id}`;
  const inserted = await supabaseAdmin.from('whatsapp_chat_messages').insert({ id, phone, direction: 'outbound', body, message_type: draft.kind, payload: payload as Json, request_key: requestKey, actor_id: actor.id, status: 'sending' });
  if (inserted.error?.code === '23505') return { status: 'sending', duplicate: true };
  if (inserted.error) throw inserted.error;
  // No automatic retries: timeouts may mean Meta accepted the message.
  const result = await sendTemplateMessage(config, payload);
  const uncertain = !result.ok && (['TIMEOUT', 'NETWORK', 'NO_MESSAGE_ID'].includes(result.code) || /^HTTP_5\d\d/.test(result.code));
  const status = result.ok ? 'sent' : uncertain ? 'unknown' : 'failed';
  const update = await supabaseAdmin.from('whatsapp_chat_messages').update({ status, wa_message_id: result.ok ? result.data.messageId : null, error_message: result.ok ? null : result.message }).eq('id', id).eq('status', 'sending');
  if (update.error) throw new InboxError('Send attempted but status could not be saved. Refresh history; do not resend blindly.', 503);
  await recordAudit(actor, 'whatsapp.send', 'whatsapp', id, { kind: draft.kind, batchId: draft.batchId, status });
  return { id, status, error: result.ok ? null : result.message };
}

const consentSchema = z.object({ phone: z.string().regex(/^91[6-9]\d{9}$/), name: z.string().trim().max(120).default(''), category: z.enum(['UTILITY', 'MARKETING']), evidence: z.string().trim().min(10).max(1000) });
export async function recordInboxConsent(input: unknown, actor: StaffSession) {
  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) throw new InboxError('Enter a valid number and evidence of explicit consent (10–1000 characters).');
  const value = parsed.data;
  const optedOut = await supabaseAdmin.from('whatsapp_opt_outs').select('phone').eq('phone', value.phone).maybeSingle();
  if (optedOut.error) throw optedOut.error;
  if (optedOut.data) throw new InboxError('Recipient opted out. This panel cannot override STOP.');
  const { error } = await supabaseAdmin.from('whatsapp_contacts').upsert({ phone: value.phone, ...(value.name ? { name: value.name } : {}), [value.category === 'UTILITY' ? 'utility_consent_at' : 'marketing_consent_at']: new Date().toISOString(), consent_evidence: value.evidence, consent_recorded_by: actor.id }, { onConflict: 'phone' });
  if (error) throw error;
  await recordAudit(actor, 'whatsapp.consent', 'whatsapp', null, { phone: value.phone, category: value.category, evidence: value.evidence });
  return { ok: true };
}

/** Called only after signature/account verification by the existing webhook. */
export async function storeInboundMessage(message: { id?: string; from: string; type: string; timestamp?: string; text?: { body: string }; [key: string]: unknown }, name?: string) {
  const phone = toWhatsAppNumber(message.from);
  if (!phone || !message.id) return;
  const timestamp = Number(message.timestamp) * 1000;
  // Never let a future/provider timestamp extend the service window.
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now() + 60_000) throw new InboxError('Invalid inbound timestamp.');
  const contact = await supabaseAdmin.from('whatsapp_contacts').upsert({ phone, ...(name ? { name } : {}) }, { onConflict: 'phone' });
  if (contact.error) throw contact.error;
  const body = message.text?.body || `[${message.type} message — see payload]`;
  const stored = await supabaseAdmin.from('whatsapp_chat_messages').upsert({ phone, direction: 'inbound', body, message_type: message.type, wa_message_id: message.id, status: 'received', payload: message as Json, created_at: new Date(Math.min(timestamp, Date.now())).toISOString() }, { onConflict: 'wa_message_id', ignoreDuplicates: true });
  if (stored.error) throw stored.error;
}