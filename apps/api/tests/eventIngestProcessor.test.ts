import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IngestEvent } from "../lib/eventIngestSchema";

const mocked = vi.hoisted(() => ({
  getLatestConsent: vi.fn(),
  createEventLogsBulk: vi.fn(),
  upsertItemFeatureSnapshotsBulk: vi.fn(),
  enqueueFeatureUpdate: vi.fn(),
  reverseGeocodeDistrict: vi.fn(),
}));

vi.mock("../storage", () => ({
  storage: {
    getLatestConsent: mocked.getLatestConsent,
    createEventLogsBulk: mocked.createEventLogsBulk,
    upsertItemFeatureSnapshotsBulk: mocked.upsertItemFeatureSnapshotsBulk,
  },
}));

vi.mock("../jobs/featureUpdateJob", () => ({
  enqueueFeatureUpdate: mocked.enqueueFeatureUpdate,
}));

vi.mock("../lib/locationCluster", () => ({
  reverseGeocodeDistrict: mocked.reverseGeocodeDistrict,
}));

import { persistAcceptedEvents } from "../lib/eventIngestProcessor";

function makeEvent(overrides: Partial<IngestEvent> = {}): IngestEvent {
  return {
    eventId: "evt_test_12345",
    eventVersion: "v1",
    idempotencyKey: "idem_test_12345",
    eventType: "view_card",
    timestamp: new Date().toISOString(),
    platform: "web",
    context: "/home",
    userId: "user-1",
    sessionId: "sess-1",
    itemId: 101,
    menuItemId: undefined,
    metadata: {},
    ...overrides,
  };
}

describe("persistAcceptedEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getLatestConsent.mockResolvedValue({ granted: true });
    mocked.createEventLogsBulk.mockResolvedValue([]);
    mocked.upsertItemFeatureSnapshotsBulk.mockResolvedValue(undefined);
    mocked.reverseGeocodeDistrict.mockResolvedValue(null);
  });

  it("skips event when user has no consent", async () => {
    mocked.getLatestConsent.mockResolvedValue({ granted: false });
    const result = await persistAcceptedEvents([makeEvent()]);

    expect(result.accepted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.reasonCounts.no_consent).toBe(1);
    expect(mocked.createEventLogsBulk).toHaveBeenCalledWith([]);
    expect(mocked.enqueueFeatureUpdate).not.toHaveBeenCalled();
  });

  it("enriches district and counts duplicates", async () => {
    mocked.reverseGeocodeDistrict.mockResolvedValue("Silom");
    mocked.createEventLogsBulk.mockResolvedValue([
      {
        id: 1,
        idempotencyKey: "idem_test_1",
        eventType: "view_card",
        userId: "user-1",
        sessionId: "sess-1",
        itemId: 101,
        menuItemId: null,
        metadata: { context: "/home", platform: "web", district: "Silom" },
        createdAt: new Date(),
      },
    ]);

    const result = await persistAcceptedEvents([
      makeEvent({ idempotencyKey: "idem_test_1", metadata: { lat: 13.73, lng: 100.52 } }),
      makeEvent({ idempotencyKey: "idem_test_2", metadata: { lat: 13.73, lng: 100.52 } }),
    ]);

    expect(result.accepted).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.reasonCounts.duplicate_or_idempotent).toBe(1);
    expect(mocked.createEventLogsBulk).toHaveBeenCalledTimes(1);
    const insertPayload = mocked.createEventLogsBulk.mock.calls[0][0] as Array<{ metadata: Record<string, unknown> }>;
    expect(insertPayload[0]?.metadata?.district).toBe("Silom");
    expect(mocked.enqueueFeatureUpdate).toHaveBeenCalledWith("user-1");
    expect(mocked.upsertItemFeatureSnapshotsBulk).toHaveBeenCalledTimes(1);
  });
});
