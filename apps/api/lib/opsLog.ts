import { storage } from "../storage";

export type OpsLogEntry = {
  ts: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
};

async function appendLog(configKey: string, entry: OpsLogEntry, limit = 1000) {
  const existing = await storage.getAdminConfig(configKey);
  const items = Array.isArray(existing?.value?.items)
    ? (existing?.value?.items as OpsLogEntry[])
    : [];
  await storage.upsertAdminConfig(configKey, {
    updatedAt: new Date().toISOString(),
    items: [entry, ...items].slice(0, limit),
  });
}

export async function appendOpsLog(entry: OpsLogEntry) {
  await appendLog("ops_logs", entry, 2000);
}

export async function appendSecurityAudit(entry: OpsLogEntry) {
  await appendLog("security_audit_log", entry, 5000);
}

