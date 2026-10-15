import 'server-only';

import { mediaUrl, messagesUrl, type WhatsAppConfig } from './config';

/** A Cloud API call that either worked or produced something worth recording. */
export type WhatsAppCall<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; retryable: boolean };

type GraphError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_msg?: string;
    error_data?: { details?: string };
  };
};

/**
 * Turns a Graph error into something safe to show a team member. Meta's own
 * message is kept because it names the actual cause (a paused template, an
 * expired token); nothing from our side is echoed back.
 */
function classify(status: number, body: GraphError, fallback: string): Exclude<WhatsAppCall<never>, { ok: true }> {
  const error = body?.error;
  const providerCode = error?.code;
  const subcode = error?.error_subcode;
  const detail = error?.error_user_msg || error?.message || error?.error_data?.details || fallback;
  const code = `HTTP_${status}${providerCode ? `_${providerCode}` : ''}${subcode ? `_${subcode}` : ''}`;

  // 190 expired/invalid token, 131047 re-engagement window, 131026 undeliverable,
  // 131056 pair rate limit — none of these get better by retrying immediately.
  const permanent = [190, 100, 131026, 132001, 132000, 132007, 132012].includes(providerCode ?? -1);
  return {
    ok: false,
    code,
    message: String(detail).replace(/\s+/g, ' ').slice(0, 300),
    retryable: !permanent,
  };
}

async function post(config: WhatsAppConfig, url: string, init: RequestInit): Promise<WhatsAppCall<Record<string, unknown>>> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${config.token}`, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    });
    const text = await response.text();
    let body: GraphError & Record<string, unknown> = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      // A proxy or outage can answer with HTML; treat it as an opaque failure.
    }
    if (!response.ok) return classify(response.status, body, `Cloud API request failed (${response.status}).`);
    return { ok: true, data: body };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return {
      ok: false,
      code: timedOut ? 'TIMEOUT' : 'NETWORK',
      message: timedOut
        ? 'The Cloud API did not answer within 20 seconds.'
        : 'Could not reach the Cloud API. Check the production network and retry.',
      retryable: true,
    };
  }
}

/** Posts one approved template to one recipient. */
export async function sendTemplateMessage(
  config: WhatsAppConfig,
  payload: Record<string, unknown>
): Promise<WhatsAppCall<{ messageId: string }>> {
  const result = await post(config, messagesUrl(config), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!result.ok) return result;

  const id = (result.data as { messages?: { id?: string }[] }).messages?.[0]?.id;
  if (!id) {
    return { ok: false, code: 'NO_MESSAGE_ID', message: 'The Cloud API accepted the request but returned no message id.', retryable: true };
  }
  return { ok: true, data: { messageId: id } };
}

/**
 * Uploads an image and returns its media id. Meta keeps uploaded media for 30
 * days, which is why the id is cached rather than the upload repeated.
 */
export async function uploadMedia(
  config: WhatsAppConfig,
  image: { bytes: Uint8Array; type: string; filename: string }
): Promise<WhatsAppCall<{ mediaId: string }>> {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', image.type);
  form.append('file', new Blob([new Uint8Array(image.bytes)], { type: image.type }), image.filename);

  const result = await post(config, mediaUrl(config), { method: 'POST', body: form });
  if (!result.ok) return result;

  const id = (result.data as { id?: string }).id;
  if (!id) {
    return { ok: false, code: 'NO_MEDIA_ID', message: 'The Cloud API accepted the upload but returned no media id.', retryable: true };
  }
  return { ok: true, data: { mediaId: id } };
}

/** Confirms a cached media id still resolves before it is used again. */
export async function mediaStillValid(config: WhatsAppConfig, mediaId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/${config.version}/${mediaId}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
