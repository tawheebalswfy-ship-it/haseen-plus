import { base44 } from "@/api/base44Client";

/**
 * Logs an action to the AuditLog entity.
 * Silently fails so it never breaks the main flow.
 */
export async function logAudit({ action, entityType, entityId, entityName, user, details = {} }) {
  try {
    await base44.entities.AuditLog.create({
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName || "",
      performed_by: user?.email || "",
      performed_by_name: user?.full_name || "",
      details,
    });
  } catch (_) {
    // Audit logging should never break the main flow
  }
}