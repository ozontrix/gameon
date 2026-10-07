import { trackMetaEvent } from './meta-pixel';
import type { OpenPlaySport } from '@/lib/open-play/constants';

const sent = new Set<string>();
/** A Lead is a saved new registration, never a form click or a duplicate retry. */
export function trackOpenPlayLead(registrationId: string, sport: OpenPlaySport): boolean {
  if (!registrationId || sent.has(registrationId)) return false;
  const eventId = `open-play:${registrationId}`;
  try {
    if (window.sessionStorage.getItem(eventId) === 'sent') return false;
  } catch { /* In-memory deduplication also works when storage is blocked. */ }
  if (!trackMetaEvent('Lead', { content_name: 'GameOn Free Open Play', content_category: sport, content_ids: [`open-play:${sport}`], currency: 'INR', value: 0 }, eventId)) return false;
  sent.add(registrationId);
  try { window.sessionStorage.setItem(eventId, 'sent'); } catch { /* Storage is optional. */ }
  return true;
}