import type { Restaurant } from "@shared/schema";
import { scoreRecommendations, type UserFeatureSnapshot, type RecommendationContext, type ScoringWeights } from "@algorithms";

/**
 * Blends multiple user feature snapshots into a single representative snapshot
 * for use in group recommendation scoring.
 */
export function blendSnapshots(
  snapshots: Array<UserFeatureSnapshot | null | undefined>,
): UserFeatureSnapshot | null {
  const valid = snapshots.filter((s): s is UserFeatureSnapshot => s != null);
  if (valid.length === 0) return null;

  // Cuisine affinity: average across all members for each cuisine key
  const allCuisineKeys = new Set<string>();
  for (const s of valid) {
    for (const key of Object.keys(s.cuisineAffinity ?? {})) {
      allCuisineKeys.add(key);
    }
  }

  const blendedAffinity: Record<string, number> = {};
  for (const key of allCuisineKeys) {
    const sum = valid.reduce((acc, s) => acc + ((s.cuisineAffinity ?? {})[key] ?? 0), 0);
    blendedAffinity[key] = sum / valid.length;
  }

  // Normalize affinity to [0, 1]
  const maxAffinity = Math.max(0, ...Object.values(blendedAffinity));
  if (maxAffinity > 1) {
    for (const key of Object.keys(blendedAffinity)) {
      blendedAffinity[key] = blendedAffinity[key] / maxAffinity;
    }
  }

  // Preferred price level: mean rounded
  const avgPrice = valid.reduce((acc, s) => acc + (s.preferredPriceLevel ?? 2), 0) / valid.length;
  const preferredPriceLevel = Math.round(avgPrice);

  // Active hours: deduplicated union
  const hoursSet = new Set<number>();
  for (const s of valid) {
    for (const h of s.activeHours ?? []) {
      hoursSet.add(h);
    }
  }
  const activeHours = Array.from(hoursSet).sort((a, b) => a - b);

  // Disliked items: intersection only (suppress only if everyone dislikes it)
  let dislikedItemIds: number[] = [];
  if (valid.length === 1) {
    dislikedItemIds = valid[0].dislikedItemIds ?? [];
  } else {
    const firstSet = new Set(valid[0].dislikedItemIds ?? []);
    dislikedItemIds = Array.from(firstSet).filter((id) =>
      valid.slice(1).every((s) => (s.dislikedItemIds ?? []).includes(id)),
    );
  }

  return {
    cuisineAffinity: blendedAffinity,
    preferredPriceLevel,
    activeHours,
    dislikedItemIds,
  };
}

export interface MemberSnapshotEntry {
  memberId: number;
  name: string;
  avatarUrl: string | null;
  snapshot: UserFeatureSnapshot | null;
}

export interface MemberScore {
  memberId: number;
  name: string;
  avatarUrl: string | null;
  matchPct: number;
}

/**
 * Computes per-member match percentages for each restaurant in the result set.
 * Returns a Map from restaurantId → array of per-member scores.
 */
export function computePerMemberScores(
  restaurants: Array<Restaurant & { score: number }>,
  memberSnapshots: MemberSnapshotEntry[],
  lat?: number,
  lng?: number,
  context?: RecommendationContext | null,
  weights?: ScoringWeights,
): Map<number, MemberScore[]> {
  const result = new Map<number, MemberScore[]>();

  const membersWithData = memberSnapshots.filter((m) => m.snapshot != null);
  if (membersWithData.length === 0) return result;

  // Initialize result map
  for (const r of restaurants) {
    result.set(r.id, []);
  }

  for (const { memberId, name, avatarUrl, snapshot } of membersWithData) {
    const scored = scoreRecommendations(
      restaurants.map((r) => {
        const rLat = Number(r.lat);
        const rLng = Number(r.lng);
        let distanceMeters: number | undefined;
        if (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          Number.isFinite(rLat) &&
          Number.isFinite(rLng)
        ) {
          const R = 6371000;
          const dLat = ((rLat - lat!) * Math.PI) / 180;
          const dLng = ((rLng - lng!) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat! * Math.PI) / 180) *
              Math.cos((rLat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          distanceMeters = Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        }
        return {
          id: r.id,
          category: r.category,
          priceLevel: r.priceLevel,
          trendingScore: r.trendingScore ?? 0,
          distanceMeters,
        };
      }),
      snapshot,
      context ?? null,
      weights,
    );

    const scoreById = new Map(scored.map((s) => [s.id, s.score]));

    for (const r of restaurants) {
      const raw = scoreById.get(r.id) ?? 0;
      const matchPct = Math.min(100, Math.round(raw * 100));
      result.get(r.id)!.push({ memberId, name, avatarUrl, matchPct });
    }
  }

  return result;
}
