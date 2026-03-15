import { describe, expect, it } from "vitest";
import { ingestBatchSchema, validateEventTimestamp } from "../lib/eventIngestSchema";

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "evt_test_12345",
    eventVersion: "v1",
    idempotencyKey: "idem_test_12345",
    eventType: "view_card",
    timestamp: new Date().toISOString(),
    platform: "web",
    context: "/home",
    ...overrides,
  };
}

describe("eventIngestSchema", () => {
  it("accepts a valid batch payload", () => {
    const result = ingestBatchSchema.safeParse({
      events: [makeEvent()],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event types", () => {
    const result = ingestBatchSchema.safeParse({
      events: [makeEvent({ eventType: "page_view" })],
    });
    expect(result.success).toBe(false);
  });
});

describe("validateEventTimestamp", () => {
  it("returns ok for current timestamp", () => {
    expect(validateEventTimestamp(new Date().toISOString())).toBe("ok");
  });

  it("returns too_old for very old timestamp", () => {
    const oldTs = new Date(Date.now() - 130 * 24 * 60 * 60 * 1000).toISOString();
    expect(validateEventTimestamp(oldTs)).toBe("too_old");
  });

  it("returns future_timestamp for far future timestamp", () => {
    const futureTs = new Date(Date.now() + 11 * 60 * 1000).toISOString();
    expect(validateEventTimestamp(futureTs)).toBe("future_timestamp");
  });
});
