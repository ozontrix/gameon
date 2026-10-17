import { SCANNER_CONFIG } from './config';
import { CHECK_IN_MESSAGES, scanFailure, type ScanResult } from './result';

export async function verifyScan(
  qrData: string, source: 'hid' | 'manual' | 'camera', venueId?: string, signal?: AbortSignal,
): Promise<ScanResult> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, SCANNER_CONFIG.requestTimeoutMs);
  try {
    const response = await fetch('/api/v1/admin/bookings/verify-qr', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrData, source, venueId }), signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) return scanFailure('unauthorized');
    if (response.status === 429) return scanFailure('rate_limited');
    if (response.status >= 500) return scanFailure('server_error');
    const result = await response.json() as ScanResult;
    if (!result || !(result.status in CHECK_IN_MESSAGES) || typeof result.success !== 'boolean' ||
      (result.success && (result.status !== 'checked_in' || !result.booking))) return scanFailure('server_error');
    return result;
  } catch {
    // A lost response is ambiguous: the server might have committed. Rescan;
    // database duplicate protection will return the original check-in time.
    return scanFailure('network_error');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/** Shared by HID, manual and camera sources; synchronous lock beats React state. */
export class ScanRequestGate {
  private busy = false;
  private last: { code: string; at: number } | null = null;
  async run<T>(code: string, task: () => Promise<T>, now = Date.now()): Promise<T | undefined> {
    if (this.busy || (this.last?.code === code && now - this.last.at < SCANNER_CONFIG.duplicateCooldownMs)) return;
    this.busy = true;
    try { return await task(); }
    finally { this.busy = false; this.last = { code, at: Date.now() }; }
  }
}