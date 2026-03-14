/**
 * Async feature-update job
 *
 * Instead of doing 2 blocking DB writes (read snapshot + upsert) per event inside the
 * event-batch HTTP handler, we just enqueue the userId. This job processes enqueued
 * users every 60 seconds: reads their recent events, rebuilds the snapshot from
 * scratch (normalized, decay applied), then upserts.
 *
 * Benefits:
 *  - Event ingestion latency drops ~30-60ms per event under load
 *  - Multiple events from the same user in a 60s window = one single DB rebuild
 *  - Affinity is always fully normalized to [0,1] — no drift
 */
import { storage } from "../storage";
import { sendAlert } from "../lib/alerting";
import { invalidateRecCache, invalidateRecCacheByPrefix } from "../lib/recCache";
import { withJobLock } from "../lib/jobLock";
import { getSwipeSignalWeight } from "../lib/superLike";

const pendingUsers = new Set<string>();

/** Tracks consecutive failures per userId. Reset to 0 on success. Evicted after MAX_FAILURES. */
const failureCounts = new Map<string, number>();
const MAX_FAILURES = 3;

/** Call this from the event batch handler instead of doing a synchronous snapshot update. */
export function enqueueFeatureUpdate(userId: string): void {
  // Don't re-enqueue users that have repeatedly failed — they'll be retried
  // once the failure count is cleared (i.e., on next successful run for a fresh enqueue)
  if ((failureCounts.get(userId) ?? 0) < MAX_FAILURES) {
    pendingUsers.add(userId);
  }
}

/** Rebuild a user's feature snapshot from their full event history (normalized). */
async function rebuildUserSnapshot(userId: string): Promise<void> {
  const events = await storage.listEventLogsByUser(userId);

  // Count category engagements (swipe/favorite = positive signal)
  const affinityCounts: Record<string, number> = {};
  const priceLevels: number[] = [];
  const activeHoursSet = new Set<number>();
  const dislikedIds: number[] = [];
  const locationCounts: Record<string, number> = {};
  const menuItemCounts: Record<number, number> = {};

  // Process in chronological order (oldest first), applying recency weighting
  for (let i = 0; i < events.length; i++) {
    const event = events[events.length - 1 - i]; // reverse: oldest last from listEventLogsByUser
    // Recency weight: most recent events count more
    const recencyWeight = Math.exp(-i / 200); // ~0.99 per event, older ones decay to ~0

    const category = String(event.metadata?.category ?? "").trim();
    const swipeSignalWeight = getSwipeSignalWeight(event.eventType, event.metadata);
    const positiveSignalWeight = event.eventType === "favorite" ? 1 : swipeSignalWeight;
    if (category && positiveSignalWeight > 0) {
      affinityCounts[category] = (affinityCounts[category] ?? 0) + recencyWeight * positiveSignalWeight;
    }

    if (event.eventType === "dismiss" && event.itemId && !dislikedIds.includes(event.itemId)) {
      dislikedIds.push(event.itemId);
    }

    if (event.eventType === "view_card") {
      const districtRaw = event.metadata?.district;
      const district = typeof districtRaw === "string" ? districtRaw.trim() : "";
      if (district) {
        locationCounts[district] = (locationCounts[district] ?? 0) + recencyWeight;
      }
    }

    if (event.eventType === "click_menu_item" && event.menuItemId) {
      menuItemCounts[event.menuItemId] = (menuItemCounts[event.menuItemId] ?? 0) + recencyWeight;
    }
    if (event.eventType === "view_menu_item" && event.menuItemId) {
      menuItemCounts[event.menuItemId] = (menuItemCounts[event.menuItemId] ?? 0) + recencyWeight * 0.2;
    }

    const pl = Number(event.metadata?.priceLevel);
    if (Number.isFinite(pl) && pl >= 1 && pl <= 4) {
      priceLevels.push(pl);
    }

    // Track active hours across all events (not just recent ones)
    activeHoursSet.add(new Date(event.createdAt).getHours());
  }

  // Normalize affinity to [0,1] — prevents score drift for heavy users
  const maxCount = Math.max(1, ...Object.values(affinityCounts));
  const cuisineAffinity = Object.fromEntries(
    Object.entries(affinityCounts).map(([k, v]) => [k, parseFloat((v / maxCount).toFixed(4))]),
  );

  // Preferred price level: weighted median of observed price levels
  const preferredPriceLevel =
    priceLevels.length > 0
      ? Math.round(priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length)
      : 2;
  const locationClusters = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([district]) => district)
    .slice(0, 10);

  const maxMenuCount = Math.max(1, ...Object.values(menuItemCounts));
  const menuItemAffinity = Object.fromEntries(
    Object.entries(menuItemCounts).map(([k, v]) => [Number(k), parseFloat((v / maxMenuCount).toFixed(4))]),
  );

  await storage.upsertUserFeatureSnapshot(userId, {
    cuisineAffinity,
    preferredPriceLevel,
    activeHours: Array.from(activeHoursSet).sort((a, b) => a - b),
    dislikedItemIds: dislikedIds.slice(0, 200), // cap to prevent unbounded growth
    locationClusters,
    menuItemAffinity,
  });

  // Invalidate any cached recommendations for this user
  invalidateRecCache(userId);

  // Also invalidate the partner's blended rec cache if they are linked
  const profile = await storage.getProfile(userId);
  if (profile?.partnerLineUserId) {
    invalidateRecCacheByPrefix(`partner:${profile.partnerLineUserId}:`);
  }
}

export async function runFeatureUpdateJob(): Promise<void> {
  if (pendingUsers.size === 0) return;

  const toProcess = [...pendingUsers];
  pendingUsers.clear(); // clear immediately so new events can be queued during processing

  const transientErrors: string[] = [];
  const abandonedUsers: string[] = [];

  for (const userId of toProcess) {
    try {
      await rebuildUserSnapshot(userId);
      failureCounts.delete(userId); // reset on success
    } catch (err) {
      const count = (failureCounts.get(userId) ?? 0) + 1;
      failureCounts.set(userId, count);

      if (count < MAX_FAILURES) {
        // Re-enqueue for next run
        pendingUsers.add(userId);
        transientErrors.push(userId);
      } else {
        // Give up — alert and evict so fresh events can retry later
        abandonedUsers.push(userId);
        failureCounts.delete(userId);
      }
    }
  }

  if (transientErrors.length > 0) {
    await sendAlert({
      source: "feature-update-job",
      severity: "warn",
      message: `Feature snapshot rebuild failed for ${transientErrors.length} user(s), will retry`,
      metadata: { failedUserCount: transientErrors.length },
    });
  }

  if (abandonedUsers.length > 0) {
    await sendAlert({
      source: "feature-update-job",
      severity: "critical",
      message: `Feature snapshot rebuild abandoned after ${MAX_FAILURES} attempts for ${abandonedUsers.length} user(s)`,
      metadata: { abandonedUserCount: abandonedUsers.length },
    });
  }
}

export function startFeatureUpdateJob(): () => void {
  const intervalMs = 60_000; // process every minute
  const timer = setInterval(
    () => void withJobLock("feature-update-job", runFeatureUpdateJob),
    intervalMs,
  );
  return () => clearInterval(timer);
}
