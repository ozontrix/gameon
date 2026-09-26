import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';
import type { Json } from '@/types/database.types';
import type { StaffSession } from './session';

export type AuditEntity =
  | 'booking'
  | 'venue'
  | 'court'
  | 'court_type'
  | 'sport'
  | 'operating_hours'
  | 'closure'
  | 'team_member'
  | 'banner'
  | 'notification'
  | 'tournament'
  | 'event'
  | 'cancellation_policy'
  | 'wallet'
  | 'referral';

/**
 * Records a change made from the admin panel. Never throws: a failed audit
 * write is logged, but must not undo or block the change itself.
 */
export async function recordAudit(
  actor: StaffSession,
  action: string,
  entityType: AuditEntity,
  entityId: string | null,
  details: Record<string, unknown> = {}
) {
  const { error } = await supabaseAdmin.from('admin_audit_log').insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details as Json,
  });

  if (error) {
    console.error(`[audit] could not record ${action} on ${entityType} ${entityId}:`, error.message);
  }
}
