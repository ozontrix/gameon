import 'server-only';
import { supabaseAdmin } from '../db/supabase';
import { CHECK_IN_MESSAGES, type ScanResult } from '../scanner/result';

export type CheckInContext = {
  actorId: string;
  source?: 'hid' | 'manual' | 'camera' | 'api' | 'admin';
  venueId?: string;
  facilityId?: string;
};

export async function performCheckIn(code: string, context: CheckInContext): Promise<ScanResult> {
  const early = Number(process.env.CHECK_IN_EARLY_MINUTES ?? 30);
  if (!Number.isInteger(early) || early < 0 || early > 240) throw new Error('Invalid CHECK_IN_EARLY_MINUTES');
  const { data, error } = await supabaseAdmin.rpc('check_in_reservation', {
    p_code: code, p_actor_id: context.actorId, p_source: context.source ?? 'api',
    p_venue_id: context.venueId, p_facility_id: context.facilityId, p_early_minutes: early,
  });
  if (error) throw error;
  const result = data as unknown as ScanResult;
  if (!result || !(result.status in CHECK_IN_MESSAGES)) throw new Error('Unexpected check-in response');
  return { ...result, message: CHECK_IN_MESSAGES[result.status] };
}