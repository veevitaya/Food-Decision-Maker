import { appendOpsLog } from "./opsLog";

type AlertSeverity = "info" | "warn" | "critical";

export async function sendAlert(params: {
  source: string;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const { source, severity, message, metadata } = params;
  const webhook = process.env.ALERT_WEBHOOK_URL?.trim();

  await appendOpsLog({
    ts: new Date().toISOString(),
    level: severity === "critical" ? "error" : severity === "warn" ? "warn" : "info",
    source,
    message,
    metadata,
  });

  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `[${severity.toUpperCase()}] ${source}: ${message}`,
        source,
        severity,
        metadata: metadata ?? {},
        ts: new Date().toISOString(),
      }),
    });
  } catch {
    // best effort alerting
  }
}

