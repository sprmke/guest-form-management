/**
 * superAdminAudit — fire-and-forget writer for `super_admin_audit_events`.
 * Never throws into the caller: an audit-write failure logs and returns, so a
 * mutation is never blocked by the audit layer. Read via `list-super-admin-audit`.
 */

import { createServiceClient } from './orgAuth.ts';
import type { AuthenticatedUser } from './orgAuth.ts';

export type SuperAdminAuditInput = {
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function logSuperAdminAction(
  admin: Pick<AuthenticatedUser, 'id' | 'email'>,
  input: SuperAdminAuditInput
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('super_admin_audit_events').insert({
      actor_user_id: admin.id ?? null,
      actor_email: admin.email ?? 'unknown',
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? {},
    });
    if (error) {
      console.error('[superAdminAudit] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[superAdminAudit] unexpected:', err instanceof Error ? err.message : err);
  }
}
