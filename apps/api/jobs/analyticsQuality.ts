import { storage } from "../storage";
import { sendAlert } from "../lib/alerting";
import { withJobLock } from "../lib/jobLock";

type QualityIssueTotals = {
  totalEvents: number;
  missingUser: number;
  missingSession: number;
  missingItem: number;
  missingTimestamp: number;
  missingPlatform: number;
  missingContext: number;
  unknownEventType: number;
  staleTimestamp: number;
  futureTimestamp: number;
};

type QualityReport = {
  ts: string;
  windowDays: number;
  totals: QualityIssueTotals;
  ratesPct: Record<string, number>;
  alerts: string[];
};

const REPORT_KEY = "analytics_quality_reports";
const CANONICAL = new Set([
  "view_card",
  "swipe",
  "session_join",
  "session_result_click_map",
  "favorite",
  "dismiss",
  "search",
  "filter",
  "order_click",
  "booking_click",
]);

function toMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, unknown>;
}

function pct(count: number, total: number): number {
  return total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
}

export async function generateAnalyticsQualityReport(windowDays = 1): Promise<QualityReport> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const logs = await storage.listEventLogs(10000, since);

  const totals: QualityIssueTotals = {
    totalEvents: logs.length,
    missingUser: 0,
    missingSession: 0,
    missingItem: 0,
    missingTimestamp: 0,
    missingPlatform: 0,
    missingContext: 0,
    unknownEventType: 0,
    staleTimestamp: 0,
    futureTimestamp: 0,
  };

  for (const log of logs) {
    if (!log.userId) totals.missingUser += 1;
    if (!log.sessionId) totals.missingSession += 1;
    if (!log.itemId) totals.missingItem += 1;
    if (!CANONICAL.has(log.eventType)) totals.unknownEventType += 1;

    const metadata = toMetadata(log.metadata);
    const tsRaw = metadata.timestamp;
    const ts = typeof tsRaw === "string" ? Date.parse(tsRaw) : NaN;
    if (!Number.isFinite(ts)) totals.missingTimestamp += 1;
    else {
      if (ts < Date.now() - 120 * 24 * 60 * 60 * 1000) totals.staleTimestamp += 1;
      if (ts > Date.now() + 10 * 60 * 1000) totals.futureTimestamp += 1;
    }
    if (typeof metadata.platform !== "string" || !metadata.platform.trim()) totals.missingPlatform += 1;
    if (typeof metadata.context !== "string" || !metadata.context.trim()) totals.missingContext += 1;
  }

  const ratesPct = {
    missingUser: pct(totals.missingUser, totals.totalEvents),
    missingSession: pct(totals.missingSession, totals.totalEvents),
    missingItem: pct(totals.missingItem, totals.totalEvents),
    missingTimestamp: pct(totals.missingTimestamp, totals.totalEvents),
    missingPlatform: pct(totals.missingPlatform, totals.totalEvents),
    missingContext: pct(totals.missingContext, totals.totalEvents),
    unknownEventType: pct(totals.unknownEventType, totals.totalEvents),
    staleTimestamp: pct(totals.staleTimestamp, totals.totalEvents),
    futureTimestamp: pct(totals.futureTimestamp, totals.totalEvents),
  };

  const alerts: string[] = [];
  if (ratesPct.unknownEventType > 0.2) alerts.push("unknown_event_type_rate_high");
  if (ratesPct.missingTimestamp > 1.0) alerts.push("missing_timestamp_rate_high");
  if (ratesPct.missingPlatform > 2.0) alerts.push("missing_platform_rate_high");
  if (ratesPct.missingContext > 2.0) alerts.push("missing_context_rate_high");
  if (ratesPct.missingSession > 15.0) alerts.push("missing_session_rate_high");

  return {
    ts: new Date().toISOString(),
    windowDays,
    totals,
    ratesPct,
    alerts,
  };
}

function detectAnomalies(current: QualityReport, previous: QualityReport): string[] {
  const anomalies: string[] = [];
  const fields = Object.keys(current.ratesPct) as (keyof typeof current.ratesPct)[];
  for (const field of fields) {
    const cur = current.ratesPct[field] ?? 0;
    const prev = previous.ratesPct[field] ?? 0;
    if (prev > 0 && cur > prev * 2 && cur > 1.0) {
      anomalies.push(`spike_detected_${field}`);
    }
  }
  return anomalies;
}

export async function persistAnalyticsQualityReport(windowDays = 1): Promise<QualityReport> {
  const report = await generateAnalyticsQualityReport(windowDays);
  const existing = await storage.getAdminConfig(REPORT_KEY);
  const currentItems = Array.isArray(existing?.value?.items) ? (existing?.value?.items as QualityReport[]) : [];

  // Anomaly detection: compare against the most recent previous report
  if (currentItems.length > 0) {
    const anomalies = detectAnomalies(report, currentItems[0]);
    for (const anomaly of anomalies) {
      if (!report.alerts.includes(anomaly)) report.alerts.push(anomaly);
    }
  }

  const items = [report, ...currentItems].slice(0, 30);
  await storage.upsertAdminConfig(REPORT_KEY, {
    updatedAt: report.ts,
    items,
    latestAlerts: report.alerts,
  });

  if (report.alerts.length > 0) {
    await sendAlert({
      source: "analytics-quality",
      severity: "warn",
      message: `Quality alerts: ${report.alerts.join(",")}`,
      metadata: {
        totalEvents: report.totals.totalEvents,
        alerts: report.alerts,
      },
    });
  } else {
    await sendAlert({
      source: "analytics-quality",
      severity: "info",
      message: "Quality check passed",
      metadata: { totalEvents: report.totals.totalEvents },
    });
  }

  return report;
}

export function startAnalyticsQualityJob() {
  const intervalMs = 24 * 60 * 60 * 1000;

  const run = async () => {
    await withJobLock("analytics-quality-job", async () => {
      try {
        await persistAnalyticsQualityReport(1);
      } catch (error) {
        await sendAlert({
          source: "analytics-quality",
          severity: "critical",
          message: "Quality job failed",
          metadata: { error: String(error) },
        });
      }
    });
  };

  void run();
  const timer = setInterval(() => {
    void run();
  }, intervalMs);

  return () => clearInterval(timer);
}
