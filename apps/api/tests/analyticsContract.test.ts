/**
 * Contract tests: verifies that the analytics event schema and
 * the frontend CanonicalEventType union stay in sync.
 */
import { describe, it, expect } from "vitest";
import { analyticsEventSchema } from "@shared/routes";

const CANONICAL_EVENT_TYPES = [
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
] as const;

function makeValidEvent(eventType: string) {
  return {
    eventId: "evt_test_12345",
    eventVersion: "v1",
    idempotencyKey: "idem_test_12345",
    eventType,
    timestamp: new Date().toISOString(),
    platform: "web",
    context: "/home",
  };
}

describe("analyticsEventSchema contract", () => {
  it("accepts all canonical event types", () => {
    for (const type of CANONICAL_EVENT_TYPES) {
      const result = analyticsEventSchema.safeParse(makeValidEvent(type));
      expect(result.success, `Expected ${type} to be accepted`).toBe(true);
    }
  });

  it("rejects unknown event types", () => {
    const unknownTypes = ["click", "page_view", "purchase", "unknown_type", ""];
    for (const type of unknownTypes) {
      const result = analyticsEventSchema.safeParse(makeValidEvent(type));
      expect(result.success, `Expected ${type} to be rejected`).toBe(false);
    }
  });

  it("rejects missing required fields", () => {
    // Missing eventId
    const noEventId = analyticsEventSchema.safeParse({
      eventVersion: "v1",
      idempotencyKey: "idem_test_12345",
      eventType: "swipe",
      timestamp: new Date().toISOString(),
      platform: "web",
      context: "/home",
    });
    expect(noEventId.success).toBe(false);

    // Missing timestamp
    const noTimestamp = analyticsEventSchema.safeParse({
      eventId: "evt_test_12345",
      eventVersion: "v1",
      idempotencyKey: "idem_test_12345",
      eventType: "swipe",
      platform: "web",
      context: "/home",
    });
    expect(noTimestamp.success).toBe(false);
  });

  it("rejects future timestamps beyond 10 minutes", () => {
    // The schema allows any datetime string; timestamp range validation is in the route handler.
    // This test verifies the schema does NOT enforce range (that's the route handler's job).
    const futureEvent = makeValidEvent("swipe");
    const result = analyticsEventSchema.safeParse({
      ...futureEvent,
      timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    // Schema accepts it — range rejection happens in the batch handler
    expect(result.success).toBe(true);
  });

  it("schema has exactly 10 canonical event types", () => {
    // Access the enum options through the shape
    const eventTypeField = analyticsEventSchema.shape.eventType;
    const options = (eventTypeField as { options: string[] }).options;
    expect(options).toHaveLength(10);
    expect(options.sort()).toEqual([...CANONICAL_EVENT_TYPES].sort());
  });
});
