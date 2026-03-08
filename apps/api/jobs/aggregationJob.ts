import { storage } from "../storage";
import { sendAlert } from "../lib/alerting";
import { withJobLock } from "../lib/jobLock";

function toDateString(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Returns percentage (0-100) of cohortUsers who also appear in retainedUsers. */
function retentionPct(cohortUsers: Set<string>, retainedUsers: Set<string>): number {
  if (cohortUsers.size === 0) return 0;
  let retained = 0;
  for (const uid of cohortUsers) {
    if (retainedUsers.has(uid)) retained++;
  }
  return Math.round((retained / cohortUsers.size) * 100);
}

export async function computeDailyRollup(dateStr: string): Promise<void> {
  const dayStart = Date.parse(`${dateStr}T00:00:00.000Z`);
  const dayEnd = dayStart + 86_400_000;

  const since = new Date(dayStart);
  const logs = await storage.listEventLogs(50_000, since);
  const dayLogs = logs.filter((log) => {
    const ts = new Date(log.createdAt).getTime();
    return ts >= dayStart && ts < dayEnd;
  });

  const userSet = new Set<string>();
  const itemSet = new Set<number>();
  const byType: Record<string, number> = {};
  let funnelViews = 0;
  let funnelSwipes = 0;
  let funnelFavorites = 0;
  let funnelOrders = 0;

  for (const log of dayLogs) {
    if (log.userId) userSet.add(log.userId);
    if (log.itemId) itemSet.add(log.itemId);
    byType[log.eventType] = (byType[log.eventType] ?? 0) + 1;
    if (log.eventType === "view_card") funnelViews += 1;
    if (log.eventType === "swipe") funnelSwipes += 1;
    if (log.eventType === "favorite") funnelFavorites += 1;
    if (log.eventType === "order_click" || log.eventType === "booking_click" || log.eventType === "session_result_click_map") {
      funnelOrders += 1;
    }
  }

  // D1 retention: % of yesterday's users who returned today
  const d1Start = new Date(dayStart - 86_400_000);
  const d1End = new Date(dayStart);
  const d1Cohort = await storage.listActiveUsersInRange(d1Start, d1End);
  const d1RetentionPct = retentionPct(d1Cohort, userSet);

  // D7 retention: % of users from 7 days ago who returned today
  const d7Start = new Date(dayStart - 7 * 86_400_000);
  const d7End = new Date(dayStart - 6 * 86_400_000);
  const d7Cohort = await storage.listActiveUsersInRange(d7Start, d7End);
  const d7RetentionPct = retentionPct(d7Cohort, userSet);

  await storage.upsertDailyRollup(dateStr, {
    totalEvents: dayLogs.length,
    uniqueUsers: userSet.size,
    uniqueItems: itemSet.size,
    byType,
    funnelViews,
    funnelSwipes,
    funnelFavorites,
    funnelOrders,
    d1RetentionPct,
    d7RetentionPct,
  });
}

export async function runAggregationJob(daysBack = 2): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < daysBack; i++) {
    const dateStr = toDateString(now - i * 86_400_000);
    await computeDailyRollup(dateStr);
  }
}

export function startAggregationJob(): () => void {
  const intervalMs = 4 * 60 * 60 * 1000;

  const run = async () => {
    await withJobLock("aggregation-job", async () => {
      try {
        await runAggregationJob(2);
      } catch (error) {
        await sendAlert({
          source: "aggregation-job",
          severity: "critical",
          message: "Aggregation job failed",
          metadata: { error: String(error) },
        });
      }
    });
  };

  void run();
  const timer = setInterval(() => { void run(); }, intervalMs);
  return () => clearInterval(timer);
}
