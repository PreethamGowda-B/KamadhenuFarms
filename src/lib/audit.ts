export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  ipAddress?: string;
  details?: string;
}

const auditLogs: AuditLogEntry[] = [];

export function logAdminAction(adminEmail: string, action: string, targetId?: string, details?: string, ipAddress?: string) {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    adminEmail,
    action,
    targetId,
    details,
    ipAddress: ipAddress || '127.0.0.1',
  };
  auditLogs.unshift(entry);
  console.log(`[AUDIT LOG] ${entry.timestamp} | Admin: ${adminEmail} | Action: ${action} | Target: ${targetId || 'N/A'}`);
  return entry;
}

export function getAuditLogs(): AuditLogEntry[] {
  return auditLogs;
}
