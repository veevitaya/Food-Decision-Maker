import type { IngestEvent } from "./eventIngestSchema";
import { validateEventTimestamp } from "./eventIngestSchema";
import { persistAcceptedEvents } from "./eventIngestProcessor";
import { enqueueEventForIngest, redisFailureMode, shouldUseRedisIngest } from "./eventQueue";

type IngestBatchResult = {
  accepted: number;
  skipped: number;
  reasonCounts: Record<string, number>;
  qualityCounts: Record<string, number>;
  ingestion: "queued" | "persisted";
  queueUnavailable: boolean;
};

export async function processEventIngestBatch(
  events: IngestEvent[],
  onRedisFallback?: (error: unknown) => void,
): Promise<IngestBatchResult> {
  let accepted = 0;
  let skipped = 0;
  const reasonCounts: Record<string, number> = {};
  const qualityCounts: Record<string, number> = {};
  const validEvents: IngestEvent[] = [];

  for (const event of events) {
    const timestampCheck = validateEventTimestamp(event.timestamp);
    if (timestampCheck !== "ok") {
      console.log("[eventIngestBatch] skipping event type=%s ts=%s reason=%s", event.eventType, event.timestamp, timestampCheck);
      skipped += 1;
      reasonCounts[timestampCheck] = (reasonCounts[timestampCheck] ?? 0) + 1;
      continue;
    }
    validEvents.push(event);
  }
  console.log("[eventIngestBatch] valid=%d skipped=%d", validEvents.length, skipped);

  if (validEvents.length > 0) {
    if (shouldUseRedisIngest()) {
      try {
        await Promise.all(validEvents.map((event) => enqueueEventForIngest(event)));
        accepted += validEvents.length;
      } catch (err) {
        if (redisFailureMode() === "reject") {
          return {
            accepted,
            skipped,
            reasonCounts,
            qualityCounts,
            ingestion: "queued",
            queueUnavailable: true,
          };
        }
        onRedisFallback?.(err);
        const persisted = await persistAcceptedEvents(validEvents);
        accepted += persisted.accepted;
        skipped += persisted.skipped;
        for (const [key, value] of Object.entries(persisted.reasonCounts)) {
          reasonCounts[key] = (reasonCounts[key] ?? 0) + value;
        }
        for (const [key, value] of Object.entries(persisted.qualityCounts)) {
          qualityCounts[key] = (qualityCounts[key] ?? 0) + value;
        }
        reasonCounts.redis_enqueue_failed = (reasonCounts.redis_enqueue_failed ?? 0) + 1;
      }
    } else {
      const persisted = await persistAcceptedEvents(validEvents);
      accepted += persisted.accepted;
      skipped += persisted.skipped;
      for (const [key, value] of Object.entries(persisted.reasonCounts)) {
        reasonCounts[key] = (reasonCounts[key] ?? 0) + value;
      }
      for (const [key, value] of Object.entries(persisted.qualityCounts)) {
        qualityCounts[key] = (qualityCounts[key] ?? 0) + value;
      }
    }
  }

  return {
    accepted,
    skipped,
    reasonCounts,
    qualityCounts,
    ingestion: shouldUseRedisIngest() ? "queued" : "persisted",
    queueUnavailable: false,
  };
}
