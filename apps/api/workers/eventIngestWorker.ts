import { ingestEventSchema, validateEventTimestamp, type IngestEvent } from "../lib/eventIngestSchema";
import { ackEventMessage, maxEventRetries, readEventBatch, requeueEvent, sendToDlq } from "../lib/eventQueue";
import { persistAcceptedEvents } from "../lib/eventIngestProcessor";
import { withJobLock } from "../lib/jobLock";

let isShuttingDown = false;
const consumerName = process.env.EVENT_CONSUMER_NAME?.trim() || `worker-${process.pid}`;

async function retryOrDeadLetter(
  envelope: { queuedAt: string; retryCount: number; source: "api"; event: IngestEvent },
  id: string,
  error: unknown,
): Promise<void> {
  const nextRetry = (envelope.retryCount ?? 0) + 1;
  const maxRetries = maxEventRetries();
  if (nextRetry > maxRetries) {
    await sendToDlq({ ...envelope, retryCount: nextRetry }, String(error));
    await ackEventMessage(id);
    return;
  }
  await requeueEvent({ ...envelope, retryCount: nextRetry, queuedAt: new Date().toISOString() });
  await ackEventMessage(id);
}

async function loop(): Promise<void> {
  while (!isShuttingDown) {
    await withJobLock("event-ingest-worker", async () => {
      const messages = await readEventBatch(consumerName);
      if (messages.length === 0) return;

      const valid: Array<{ id: string; event: IngestEvent }> = [];
      const retryables: Array<{ id: string; envelope: { queuedAt: string; retryCount: number; source: "api"; event: IngestEvent } }> = [];

      for (const message of messages) {
        const parsed = ingestEventSchema.safeParse(message.envelope.event);
        if (!parsed.success) {
          await ackEventMessage(message.id);
          continue;
        }
        const timestampCheck = validateEventTimestamp(parsed.data.timestamp);
        if (timestampCheck !== "ok") {
          await ackEventMessage(message.id);
          continue;
        }
        valid.push({ id: message.id, event: parsed.data });
        retryables.push({ id: message.id, envelope: { ...message.envelope, event: parsed.data } });
      }

      if (valid.length === 0) return;

      try {
        await persistAcceptedEvents(valid.map((item) => item.event));
        for (const item of valid) {
          await ackEventMessage(item.id);
        }
      } catch (err) {
        for (const item of retryables) {
          if (isShuttingDown) break;
          await retryOrDeadLetter(item.envelope, item.id, err);
        }
      }
    });
  }
}

process.on("SIGINT", () => {
  isShuttingDown = true;
});
process.on("SIGTERM", () => {
  isShuttingDown = true;
});

void loop();
