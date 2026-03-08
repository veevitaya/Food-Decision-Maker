import { storage } from "../storage";
import { sendAlert } from "../lib/alerting";
import { withJobLock } from "../lib/jobLock";

export function startDataRetentionJob() {
  const intervalMs = 24 * 60 * 60 * 1000;

  const run = async () => {
    await withJobLock("data-retention-job", async () => {
      try {
        const result = await storage.runDataRetention(180, 365);
        await sendAlert({
          source: "retention",
          severity: "info",
          message: "Retention job completed",
          metadata: {
            rawEventsDeleted: result.rawEventsDeleted,
            snapshotsDeleted: result.snapshotsDeleted,
          },
        });
      } catch (error) {
        await sendAlert({
          source: "retention",
          severity: "critical",
          message: "Retention job failed",
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
