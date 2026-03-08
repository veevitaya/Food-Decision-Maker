import type { Restaurant } from "@shared/schema";
import { scoreRecommendations, type RecommendationItem, type UserFeatureSnapshot, type RecommendationContext } from "@algorithms";

function toRecommendationItem(restaurant: Restaurant, lat?: number, lng?: number): RecommendationItem {
  const rLat = Number(restaurant.lat);
  const rLng = Number(restaurant.lng);
  const distanceMeters =
    Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(rLat) && Number.isFinite(rLng)
      ? computeDistanceMeters(lat as number, lng as number, rLat, rLng)
      : undefined;

  return {
    id: restaurant.id,
    category: restaurant.category,
    priceLevel: restaurant.priceLevel,
    distanceMeters,
    trendingScore: restaurant.trendingScore ?? 0,
  };
}

function computeDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Clamp and normalize cuisine affinity to [0, 1].
 * The feature-update job already normalizes, but this is a defensive second pass
 * to handle legacy snapshots stored before normalization was introduced.
 */
function normalizeAffinity(raw: Record<string, number>): Record<string, number> {
  const max = Math.max(1, ...Object.values(raw));
  if (max <= 1) return raw;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, parseFloat((v / max).toFixed(4))]));
}

/**
 * Diversity spread: ensure at most floor(limit/2) items from any single category.
 * Items are inserted in score-descending order, so the highest-scoring items
 * from each category are always preferred.
 */
function applyDiversitySpread<T extends { score: number; category: string }>(
  scored: T[],
  limit: number,
): T[] {
  const maxPerCategory = Math.max(1, Math.floor(limit / 2));
  const categoryCounts: Record<string, number> = {};
  const primary: T[] = [];
  const overflow: T[] = [];

  for (const item of scored) {
    const cat = (item.category || "other").trim().toLowerCase();
    const count = categoryCounts[cat] ?? 0;
    if (count < maxPerCategory && primary.length < limit) {
      primary.push(item);
      categoryCounts[cat] = count + 1;
    } else {
      overflow.push(item);
    }
  }

  // Fill remaining slots from overflow (best-scoring, regardless of category)
  for (const item of overflow) {
    if (primary.length >= limit) break;
    primary.push(item);
  }

  return primary;
}

export function buildPersonalizedRecommendations(params: {
  restaurants: Restaurant[];
  feature: UserFeatureSnapshot | null;
  lat?: number;
  lng?: number;
  context?: RecommendationContext | null;
  limit?: number;
  itemCtrs?: Map<number, number>;
}): { source: "personalized" | "sparse_blend" | "segment" | "trending"; items: Array<Restaurant & { score: number; explanation: string[] }> } {
  const { restaurants, feature, lat, lng, context = null, limit = 20, itemCtrs } = params;

  if (restaurants.length === 0) {
    return { source: "trending", items: [] };
  }

  // New-restaurant boost: +0.15 for restaurants with fewer than 10 CTR events
  function newRestaurantBoost(restaurantId: number): number {
    const ctr = itemCtrs?.get(restaurantId) ?? 0;
    return ctr < 10 ? 0.15 : 0;
  }

  if (feature) {
    // Defensive normalization for any legacy snapshots with affinity > 1
    const normalizedAffinity = normalizeAffinity(feature.cuisineAffinity ?? {});
    const affinityKeys = Object.keys(normalizedAffinity).length;
    const isSparseUser = affinityKeys < 3;

    const scored = scoreRecommendations(
      restaurants.map((restaurant) => toRecommendationItem(restaurant, lat, lng)),
      {
        cuisineAffinity: normalizedAffinity,
        preferredPriceLevel: feature.preferredPriceLevel ?? 2,
        dislikedItemIds: feature.dislikedItemIds ?? [],
        activeHours: feature.activeHours ?? [],
      },
      context,
    );

    if (isSparseUser) {
      // Sparse user: blend 70% popularity + 30% personalized score
      const categoryCounts = restaurants.reduce<Record<string, number>>((acc, r) => {
        const key = (r.category || "other").trim().toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      const maxCategoryCount = Math.max(1, ...Object.values(categoryCounts));

      const blended = scored
        .map((score) => {
          const restaurant = restaurants.find((r) => r.id === score.id)!;
          const key = (restaurant.category || "other").trim().toLowerCase();
          const popularityScore = (categoryCounts[key] ?? 0) / maxCategoryCount;
          const trend = Math.max(0, Math.min(1, (restaurant.trendingScore ?? 0) / 100));
          const popularityBlend = trend * 0.65 + popularityScore * 0.35;
          const blendedScore = 0.7 * popularityBlend + 0.3 * score.score + newRestaurantBoost(restaurant.id);
          return {
            ...restaurant,
            score: Number(blendedScore.toFixed(4)),
            explanation: ["Sparse user: blending popularity and early preference signals", ...score.explanation],
          };
        })
        .sort((a, b) => b.score - a.score);

      return { source: "sparse_blend", items: applyDiversitySpread(blended, limit) };
    }

    const full = scored
      .map((score) => {
        const restaurant = restaurants.find((r) => r.id === score.id)!;
        const boostedScore = score.score + newRestaurantBoost(restaurant.id);
        return {
          ...restaurant,
          score: Number(boostedScore.toFixed(4)),
          explanation: score.explanation,
        };
      })
      .sort((a, b) => b.score - a.score);

    return { source: "personalized", items: applyDiversitySpread(full, limit) };
  }

  const categoryCounts = restaurants.reduce<Record<string, number>>((acc, restaurant) => {
    const key = (restaurant.category || "other").trim().toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxCategoryCount = Math.max(1, ...Object.values(categoryCounts));

  const segmentItems = restaurants
    .slice()
    .map((restaurant) => {
      const key = (restaurant.category || "other").trim().toLowerCase();
      const categoryPopularity = (categoryCounts[key] ?? 0) / maxCategoryCount;
      const trend = Math.max(0, Math.min(1, (restaurant.trendingScore ?? 0) / 100));
      const distancePenalty =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? Math.min(computeDistanceMeters(lat as number, lng as number, Number(restaurant.lat), Number(restaurant.lng)) / 10000, 1)
          : 0.4;
      const score = Number((trend * 0.65 + categoryPopularity * 0.35 - distancePenalty * 0.15 + newRestaurantBoost(restaurant.id)).toFixed(4));
      return {
        ...restaurant,
        score,
        explanation: [
          "Cold-start ranking: no user feature profile yet",
          "Balanced by category popularity and global trend",
          Number.isFinite(lat) && Number.isFinite(lng) ? "Distance-aware fallback applied" : "Location-neutral fallback applied",
        ],
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    source: "segment",
    items: applyDiversitySpread(segmentItems, limit),
  };
}
