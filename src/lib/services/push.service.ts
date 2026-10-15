import { after } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../db/supabase';
import { firebaseCredentials, sendFirebase } from '../push/firebase';

export class PushService {
  static async register(input: { installationId: string; secret: string; token: string | null; platform: 'android' | 'ios'; enabled: boolean }, userId: string | null) {
    const { error } = await supabaseAdmin.rpc('register_push_device', {
      p_installation_id: input.installationId, p_secret_hash: createHash('sha256').update(input.secret).digest('hex'),
      p_token: input.token, p_platform: input.platform, p_user_id: userId, p_enabled: input.enabled,
    });
    if (error) throw error;
  }

  static schedule(notificationId: string) {
    try {
      after(async () => {
        try {
          // Bound request-tail work; the authenticated worker drains the rest.
          for (let batch = 0; batch < 4; batch++) {
            const result = await PushService.drain(50, notificationId);
            if (!result.configured || result.processed < 50) break;
          }
        } catch { console.error('[push] delivery worker failed; queued for recovery'); }
      });
    } catch { /* Outside a request (e.g. tests). Durable DB queue remains. */ }
  }

  static async drain(limit = 50, notificationId?: string) {
    if (!firebaseCredentials()) return { configured: false, processed: 0 };
    const { data: jobs, error } = await supabaseAdmin.rpc('claim_push_deliveries', {
      p_limit: limit, ...(notificationId ? { p_notification_id: notificationId } : {}),
    });
    if (error) throw error;
    const rows = jobs ?? [];
    // Limit concurrent outbound requests and stay under the lease duration.
    for (let offset = 0; offset < rows.length; offset += 10) {
      await Promise.all(rows.slice(offset, offset + 10).map(async job => {
        const [deviceResult, messageResult] = await Promise.all([
          supabaseAdmin.from('push_devices').select('*').eq('installation_id', job.installation_id).maybeSingle(),
          supabaseAdmin.from('notifications').select('id,title,body,link,kind').eq('id', job.notification_id).maybeSingle(),
        ]);
        if (deviceResult.error || messageResult.error) throw new Error('PUSH_DATABASE_UNAVAILABLE');
        const device = deviceResult.data, message = messageResult.data;
        let status = 'skipped', code: string | null = null;
        let retryAfterSeconds = 0;
        if (device?.enabled && device.token && message && (!job.recipient_user_id || device.user_id === job.recipient_user_id)) {
          let result;
          try { result = await sendFirebase(device.token, message); }
          catch { result = { ok: false, retryable: true, code: 'FCM_TRANSPORT_UNAVAILABLE' }; }
          code = result.code ?? null;
          retryAfterSeconds = result.retryAfterSeconds ?? 0;
          status = result.ok ? 'sent' : result.retryable && job.attempts < 8 ? 'pending' : 'failed';
          if (result.invalidToken) {
            const { error: disableError } = await supabaseAdmin.from('push_devices').update({ enabled: false })
              .eq('installation_id', device.installation_id).eq('token', device.token);
            if (disableError) throw disableError;
          }
        }
        const { error: updateError } = await supabaseAdmin.from('push_deliveries').update({
          status, error_code: code, sent_at: status === 'sent' ? new Date().toISOString() : null,
          available_at: new Date(Date.now() + Math.max(retryAfterSeconds, Math.min(3600, 30 * 2 ** job.attempts)) * 1000).toISOString(),
        }).eq('id', job.id).eq('lease_id', job.lease_id!);
        if (updateError) throw updateError;
      }));
    }
    return { configured: true, processed: rows.length };
  }
}