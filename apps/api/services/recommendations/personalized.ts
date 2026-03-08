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

export function buildPersonalizedRecommendations(params: {
  restaurants: Restaurant[];
  feature: UserFeatureSnapshot | null;
  lat?: number;
  lng?: number;
  context?: RecommendationContext | null;
  limit?: number;
}): { source: "personalized" | "segment" | "trending"; items: Array<Restaurant & { score: number; explanation: string[] }> } {
  const { restaurants, feature, lat, lng, context = null, limit = 20 } = params;

  if (restaurants.length === 0) {
    return { source: "trending", items: [] };
  }

  if (feature) {
    const scored = scoreRecommendations(
      restaurants.map((restaurant) => toRecommendationItem(restaurant, lat, lng)),
      {
        cuisineAffinity: feature.cuisineAffinity,
        preferredPriceLevel: feature.preferredPriceLevel ?? 2,
        dislikedItemIds: feature.dislikedItemIds ?? [],
        activeHours: feature.activeHours ?? [],
      },
      context,
    );

    const items = scored
      .slice(0, limit)
      .map((score) => {
        const restaurant = restaurants.find((r) => r.id === score.id)!;
        return {
          ...restaurant,
          score: Number(score.score.toFixed(4)),
          explanation: score.explanation,
        };
      });

    return { source: "personalized", items };
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
      const score = Number((trend * 0.65 + categoryPopularity * 0.35 - distancePenalty * 0.15).toFixed(4));
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
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    source: "segment",
    items: segmentItems,
  };
}
