import crypto from "node:crypto";
import { createClient, type RedisClientType } from "redis";
import type { IngestEvent } from "./eventIngestSchema";

export type EventIngestMode = "direct" | "redis";
export type RedisFailureMode = "direct" | "reject";

type QueuedEventEnvelope = {
  queuedAt: string;
  retryCount: number;
  source: "api";
  event: IngestEvent;
};

type StreamMessage = {
  id: string;
  envelope: QueuedEventEnvelope;
};

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const EVENT_INGEST_MODE: EventIngestMode = process.env.EVENT_INGEST_MODE === "redis" ? "redis" : "direct";
const REDIS_FAILURE_MODE: RedisFailureMode = process.env.EVENT_REDIS_FAILURE_MODE === "reject" ? "reject" : "direct";
const EVENT_STREAM_KEY = process.env.EVENT_STREAM_KEY?.trim() || "events:ingest";
const EVENT_DLQ_STREAM_KEY = `${EVENT_STREAM_KEY}:dlq`;
const EVENT_CONSUMER_GROUP = process.env.EVENT_CONSUMER_GROUP?.trim() || "events-workers";
const EVENT_BATCH_SIZE = Math.max(1, Math.min(Number(process.env.EVENT_BATCH_SIZE ?? 200), 1000));
const EVENT_FLUSH_INTERVAL_MS = Math.max(250, Math.min(Number(process.env.EVENT_FLUSH_INTERVAL_MS ?? 2000), 60000));
const EVENT_MAX_RETRIES = Math.max(0, Math.min(Number(process.env.EVENT_MAX_RETRIES ?? 3), 20));
const REDIS_CONNECT_TIMEOUT_MS = Math.max(200, Math.min(Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 1500), 30_000));

let redisClient: RedisClientType | null = null;
let groupReady = false;

function getConsumerName(): string {
  return process.env.EVENT_CONSUMER_NAME?.trim() || `${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
}

async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: () => false,
      },
    });
    redisClient.on("error", () => {});
  }
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

export function getEventIngestConfig() {
  return {
    mode: EVENT_INGEST_MODE,
    redisFailureMode: REDIS_FAILURE_MODE,
    streamKey: EVENT_STREAM_KEY,
    dlqStreamKey: EVENT_DLQ_STREAM_KEY,
    consumerGroup: EVENT_CONSUMER_GROUP,
    batchSize: EVENT_BATCH_SIZE,
    flushIntervalMs: EVENT_FLUSH_INTERVAL_MS,
    maxRetries: EVENT_MAX_RETRIES,
  };
}

export async function ensureEventConsumerGroup(): Promise<void> {
  if (groupReady) return;
  const client = await getRedisClient();
  try {
    await client.sendCommand(["XGROUP", "CREATE", EVENT_STREAM_KEY, EVENT_CONSUMER_GROUP, "0", "MKSTREAM"]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("BUSYGROUP")) throw err;
  }
  groupReady = true;
}

export async function enqueueEventForIngest(event: IngestEvent): Promise<void> {
  const client = await getRedisClient();
  const envelope: QueuedEventEnvelope = {
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    source: "api",
    event,
  };
  await client.sendCommand(["XADD", EVENT_STREAM_KEY, "*", "payload", JSON.stringify(envelope)]);
}

function parseStreamReadResult(raw: unknown): StreamMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const messages: StreamMessage[] = [];
  for (const streamEntry of raw) {
    if (!Array.isArray(streamEntry) || streamEntry.length < 2) continue;
    const entries = streamEntry[1];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const id = String(entry[0]);
      const fields = entry[1];
      if (!Array.isArray(fields)) continue;
      let payloadRaw = "";
      for (let i = 0; i < fields.length - 1; i += 2) {
        if (String(fields[i]) === "payload") {
          payloadRaw = String(fields[i + 1] ?? "");
          break;
        }
      }
      if (!payloadRaw) continue;
      try {
        const envelope = JSON.parse(payloadRaw) as QueuedEventEnvelope;
        messages.push({ id, envelope });
      } catch {
        continue;
      }
    }
  }
  return messages;
}

export async function readEventBatch(consumerName = getConsumerName()): Promise<StreamMessage[]> {
  const client = await getRedisClient();
  await ensureEventConsumerGroup();
  const raw = await client.sendCommand([
    "XREADGROUP",
    "GROUP",
    EVENT_CONSUMER_GROUP,
    consumerName,
    "COUNT",
    String(EVENT_BATCH_SIZE),
    "BLOCK",
    String(EVENT_FLUSH_INTERVAL_MS),
    "STREAMS",
    EVENT_STREAM_KEY,
    ">",
  ]);
  return parseStreamReadResult(raw);
}

export async function ackEventMessage(id: string): Promise<void> {
  const client = await getRedisClient();
  await client.sendCommand(["XACK", EVENT_STREAM_KEY, EVENT_CONSUMER_GROUP, id]);
}

export async function requeueEvent(envelope: QueuedEventEnvelope): Promise<void> {
  const client = await getRedisClient();
  await client.sendCommand(["XADD", EVENT_STREAM_KEY, "*", "payload", JSON.stringify(envelope)]);
}

export async function sendToDlq(envelope: QueuedEventEnvelope, error: string): Promise<void> {
  const client = await getRedisClient();
  const payload = {
    ...envelope,
    failedAt: new Date().toISOString(),
    error,
  };
  await client.sendCommand(["XADD", EVENT_DLQ_STREAM_KEY, "*", "payload", JSON.stringify(payload)]);
}

export async function getQueueStatus() {
  const client = await getRedisClient();
  await ensureEventConsumerGroup();
  const [streamLenRaw, dlqLenRaw, groupsRaw] = await Promise.all([
    client.sendCommand(["XLEN", EVENT_STREAM_KEY]),
    client.sendCommand(["XLEN", EVENT_DLQ_STREAM_KEY]),
    client.sendCommand(["XINFO", "GROUPS", EVENT_STREAM_KEY]),
  ]);

  const streamLength = Number(streamLenRaw ?? 0);
  const dlqLength = Number(dlqLenRaw ?? 0);
  let pending = 0;
  let lag = 0;
  if (Array.isArray(groupsRaw)) {
    for (const row of groupsRaw) {
      if (!Array.isArray(row)) continue;
      const fields = new Map<string, string>();
      for (let i = 0; i < row.length - 1; i += 2) {
        fields.set(String(row[i]), String(row[i + 1]));
      }
      if (fields.get("name") === EVENT_CONSUMER_GROUP) {
        pending = Number(fields.get("pending") ?? 0);
        lag = Number(fields.get("lag") ?? 0);
      }
    }
  }
  return { streamLength, pending, lag, dlqLength };
}

export async function replayDlq(limit = 100): Promise<{ moved: number }> {
  const client = await getRedisClient();
  const raw = await client.sendCommand(["XRANGE", EVENT_DLQ_STREAM_KEY, "-", "+", "COUNT", String(limit)]);
  if (!Array.isArray(raw) || raw.length === 0) return { moved: 0 };
  let moved = 0;
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const id = String(entry[0]);
    const fields = entry[1];
    if (!Array.isArray(fields)) continue;
    let payloadRaw = "";
    for (let i = 0; i < fields.length - 1; i += 2) {
      if (String(fields[i]) === "payload") payloadRaw = String(fields[i + 1] ?? "");
    }
    if (!payloadRaw) continue;
    try {
      const parsed = JSON.parse(payloadRaw) as { event?: IngestEvent; retryCount?: number; source?: "api" };
      if (!parsed.event) continue;
      const envelope: QueuedEventEnvelope = {
        event: parsed.event,
        retryCount: 0,
        queuedAt: new Date().toISOString(),
        source: parsed.source ?? "api",
      };
      await client.sendCommand(["XADD", EVENT_STREAM_KEY, "*", "payload", JSON.stringify(envelope)]);
      await client.sendCommand(["XDEL", EVENT_DLQ_STREAM_KEY, id]);
      moved += 1;
    } catch {
      continue;
    }
  }
  return { moved };
}

export function shouldUseRedisIngest(): boolean {
  return EVENT_INGEST_MODE === "redis";
}

export function redisFailureMode(): RedisFailureMode {
  return REDIS_FAILURE_MODE;
}

export function maxEventRetries(): number {
  return EVENT_MAX_RETRIES;
}
