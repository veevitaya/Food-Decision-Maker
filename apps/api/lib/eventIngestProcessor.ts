import { storage } from "../storage";
import { enqueueFeatureUpdate } from "../jobs/featureUpdateJob";
import { deriveItemFeatureDelta, hasItemFeatureDelta } from "./itemFeatureMetrics";
import { reverseGeocodeDistrict } from "./locationCluster";
import type { IngestEvent } from "./eventIngestSchema";
import type { InsertEventLog, InsertItemFeatureSnapshot } from "@shared/schema";

type IngestCounters = {
  accepted: number;
  skipped: number;
  reasonCounts: Record<string, number>;
  qualityCounts: Record<string, number>;
};

function incCounter(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

export async function persistAcceptedEvents(events: IngestEvent[]): Promise<IngestCounters> {
  let skipped = 0;
  const reasonCounts: Record<string, number> = {};
  const qualityCounts: Record<string, number> = {};
  const rows: InsertEventLog[] = [];

  for (const event of events) {
    if (!event.userId) incCounter(qualityCounts, "missing_user");
    if (!event.sessionId) incCounter(qualityCounts, "missing_session");
    if (!event.itemId) incCounter(qualityCounts, "missing_item");
    if (!event.context) incCounter(qualityCounts, "missing_context");
    if (!event.platform) incCounter(qualityCounts, "missing_platform");

    if (event.userId) {
      const latestConsent = await storage.getLatestConsent(event.userId, "behavior_tracking");
      if (!latestConsent?.granted) {
        skipped += 1;
        incCounter(reasonCounts, "no_consent");
        continue;
      }
    }

    const enrichedMetadata: Record<string, unknown> = {
      ...(event.metadata ?? {}),
      eventId: event.eventId,
      eventVersion: event.eventVersion,
      eventName: event.eventName ?? event.eventType,
      timestamp: event.timestamp,
      platform: event.platform,
      context: event.context,
    };

    if (event.eventType === "view_card" && !enrichedMetadata.district) {
      const lat = Number((event.metadata as Record<string, unknown> | undefined)?.lat);
      const lng = Number((event.metadata as Record<string, unknown> | undefined)?.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const district = await reverseGeocodeDistrict(lat, lng);
        if (district) enrichedMetadata.district = district;
      }
    }

    rows.push({
      idempotencyKey: event.idempotencyKey,
      eventType: event.eventType,
      userId: event.userId ?? null,
      sessionId: event.sessionId ?? null,
      itemId: event.itemId ?? null,
      menuItemId: event.menuItemId ?? null,
      metadata: enrichedMetadata,
    });
  }

  const inserted = await storage.createEventLogsBulk(rows);
  const accepted = inserted.length;
  const duplicateCount = rows.length - inserted.length;
  if (duplicateCount > 0) {
    skipped += duplicateCount;
    incCounter(reasonCounts, "duplicate_or_idempotent");
    reasonCounts.duplicate_or_idempotent = duplicateCount;
  }

  const featureDeltas: Array<{ itemId: number; delta: Partial<InsertItemFeatureSnapshot> }> = [];
  for (const log of inserted) {
    if (log.userId) {
      enqueueFeatureUpdate(log.userId);
    }
    if (log.itemId) {
      const delta = deriveItemFeatureDelta(log.eventType, log.metadata ?? undefined);
      if (hasItemFeatureDelta(delta)) {
        featureDeltas.push({
          itemId: log.itemId,
          delta,
        });
      }
    }
  }
  await storage.upsertItemFeatureSnapshotsBulk(featureDeltas);

  return {
    accepted,
    skipped,
    reasonCounts,
    qualityCounts,
  };
}
