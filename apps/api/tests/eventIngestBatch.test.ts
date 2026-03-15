import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IngestEvent } from "../lib/eventIngestSchema";

const mocked = vi.hoisted(() => ({
  validateEventTimestamp: vi.fn(),
  persistAcceptedEvents: vi.fn(),
  enqueueEventForIngest: vi.fn(),
  redisFailureMode: vi.fn(),
  shouldUseRedisIngest: vi.fn(),
}));

vi.mock("../lib/eventIngestSchema", async () => {
  const actual = await vi.importActual<typeof import("../lib/eventIngestSchema")>("../lib/eventIngestSchema");
  return {
    ...actual,
    validateEventTimestamp: mocked.validateEventTimestamp,
  };
});

vi.mock("../lib/eventIngestProcessor", () => ({
  persistAcceptedEvents: mocked.persistAcceptedEvents,
}));

vi.mock("../lib/eventQueue", () => ({
  enqueueEventForIngest: mocked.enqueueEventForIngest,
  redisFailureMode: mocked.redisFailureMode,
  shouldUseRedisIngest: mocked.shouldUseRedisIngest,
}));

import { processEventIngestBatch } from "../lib/eventIngestBatch";

function makeEvent(overrides: Partial<IngestEvent> = {}): IngestEvent {
  return {
    eventId: "evt_test_12345",
    eventVersion: "v1",
    idempotencyKey: "idem_test_12345",
    eventType: "view_card",
    timestamp: new Date().toISOString(),
    platform: "web",
    context: "/home",
    userId: "u1",
    sessionId: "s1",
    itemId: 1,
    menuItemId: undefined,
    metadata: {},
    ...overrides,
  };
}

describe("processEventIngestBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.validateEventTimestamp.mockReturnValue("ok");
    mocked.shouldUseRedisIngest.mockReturnValue(false);
    mocked.redisFailureMode.mockReturnValue("direct");
    mocked.persistAcceptedEvents.mockResolvedValue({
      accepted: 1,
      skipped: 0,
      reasonCounts: {},
      qualityCounts: {},
    });
    mocked.enqueueEventForIngest.mockResolvedValue(undefined);
  });

  it("persists directly in direct mode", async () => {
    const result = await processEventIngestBatch([makeEvent()]);
    expect(result.queueUnavailable).toBe(false);
    expect(result.ingestion).toBe("persisted");
    expect(result.accepted).toBe(1);
    expect(mocked.persistAcceptedEvents).toHaveBeenCalledTimes(1);
  });

  it("queues events in redis mode when enqueue succeeds", async () => {
    mocked.shouldUseRedisIngest.mockReturnValue(true);
    const result = await processEventIngestBatch([makeEvent(), makeEvent({ idempotencyKey: "idem2" })]);
    expect(result.queueUnavailable).toBe(false);
    expect(result.ingestion).toBe("queued");
    expect(result.accepted).toBe(2);
    expect(mocked.enqueueEventForIngest).toHaveBeenCalledTimes(2);
    expect(mocked.persistAcceptedEvents).not.toHaveBeenCalled();
  });

  it("falls back to direct persist on redis enqueue failure when mode=direct", async () => {
    mocked.shouldUseRedisIngest.mockReturnValue(true);
    mocked.redisFailureMode.mockReturnValue("direct");
    mocked.enqueueEventForIngest.mockRejectedValue(new Error("redis down"));
    mocked.persistAcceptedEvents.mockResolvedValue({
      accepted: 1,
      skipped: 0,
      reasonCounts: {},
      qualityCounts: {},
    });
    const onFallback = vi.fn();
    const result = await processEventIngestBatch([makeEvent()], onFallback);
    expect(result.queueUnavailable).toBe(false);
    expect(result.accepted).toBe(1);
    expect(result.reasonCounts.redis_enqueue_failed).toBe(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(mocked.persistAcceptedEvents).toHaveBeenCalledTimes(1);
  });

  it("returns queueUnavailable when redis enqueue fails and mode=reject", async () => {
    mocked.shouldUseRedisIngest.mockReturnValue(true);
    mocked.redisFailureMode.mockReturnValue("reject");
    mocked.enqueueEventForIngest.mockRejectedValue(new Error("redis down"));
    const result = await processEventIngestBatch([makeEvent()]);
    expect(result.queueUnavailable).toBe(true);
    expect(mocked.persistAcceptedEvents).not.toHaveBeenCalled();
  });

  it("skips events with invalid timestamps before enqueue/persist", async () => {
    mocked.validateEventTimestamp.mockReturnValue("too_old");
    const result = await processEventIngestBatch([makeEvent()]);
    expect(result.accepted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.reasonCounts.too_old).toBe(1);
    expect(mocked.persistAcceptedEvents).not.toHaveBeenCalled();
    expect(mocked.enqueueEventForIngest).not.toHaveBeenCalled();
  });
});
