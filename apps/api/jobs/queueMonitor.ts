import { getQueueStatus, shouldUseRedisIngest } from "../lib/eventQueue";
import { sendAlert } from "../lib/alerting";
import { withJobLock } from "../lib/jobLock";

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

const intervalMs = toInt(process.env.QUEUE_MONITOR_INTERVAL_MS, 60_000);
const maxLag = toInt(process.env.QUEUE_ALERT_MAX_LAG, 2_000);
const maxPending = toInt(process.env.QUEUE_ALERT_MAX_PENDING, 1_000);
const maxDlq = toInt(process.env.QUEUE_ALERT_MAX_DLQ, 0);

export function startQueueMonitorJob(): () => void {
  const run = async () => {
    if (!shouldUseRedisIngest()) return;
    await withJobLock("queue-monitor-job", async () => {
      try {
        const status = await getQueueStatus();
        const alerts: string[] = [];
        if (status.lag > maxLag) alerts.push(`lag_high:${status.lag}`);
        if (status.pending > maxPending) alerts.push(`pending_high:${status.pending}`);
        if (status.dlqLength > maxDlq) alerts.push(`dlq_non_zero:${status.dlqLength}`);

        if (alerts.length > 0) {
          await sendAlert({
            source: "queue-monitor",
            severity: "warn",
            message: `Queue health alert: ${alerts.join(",")}`,
            metadata: {
              status,
              thresholds: {
                maxLag,
                maxPending,
                maxDlq,
              },
            },
          });
        }
      } catch (error) {
        await sendAlert({
          source: "queue-monitor",
          severity: "critical",
          message: "Queue monitor failed",
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
