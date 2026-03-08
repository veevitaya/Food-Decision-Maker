export type RecommendationItem = {
  id: number;
  category: string;
  priceLevel: number;
  distanceMeters?: number;
  trendingScore?: number;
};

export type UserFeatureSnapshot = {
  cuisineAffinity: Record<string, number>;
  preferredPriceLevel?: number;
  dislikedItemIds?: number[];
  activeHours?: number[];
};

export type RecommendationContext = {
  hourOfDay?: number;
  dayOfWeek?: number;
};

export type ScoringWeights = {
  cuisineAffinity: number;
  priceMatch: number;
  distanceScore: number;
  globalPopularity: number;
  recentNegativePenalty: number;
};

export type ScoredRecommendation = {
  id: number;
  score: number;
  explanation: string[];
};

const DEFAULT_WEIGHTS: ScoringWeights = {
  cuisineAffinity: 0.35,
  priceMatch: 0.2,
  distanceScore: 0.2,
  globalPopularity: 0.2,
  recentNegativePenalty: 0.05,
};

export function scoreRecommendations(
  items: RecommendationItem[],
  feature: UserFeatureSnapshot | null,
  context: RecommendationContext | null = null,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoredRecommendation[] {
  const maxDistance = Math.max(...items.map((item) => item.distanceMeters ?? 5000), 1);
  const maxPopularity = Math.max(...items.map((item) => item.trendingScore ?? 0), 1);
  const preferredHour = context?.hourOfDay;
  const weekendBoost = context?.dayOfWeek === 0 || context?.dayOfWeek === 6 ? 0.03 : 0;

  return items
    .map((item) => {
      const affinity = feature?.cuisineAffinity[item.category] ?? 0;
      const preferredPrice = feature?.preferredPriceLevel ?? 2;
      const priceGap = Math.abs((item.priceLevel ?? 2) - preferredPrice);
      const priceMatch = Math.max(0, 1 - priceGap / 3);
      const distanceNorm = 1 - Math.min((item.distanceMeters ?? maxDistance) / maxDistance, 1);
      const popularity = Math.max(0, (item.trendingScore ?? 0) / maxPopularity);
      const disliked = feature?.dislikedItemIds?.includes(item.id) ? 1 : 0;
      const activeHours = feature?.activeHours ?? [];
      const hourBoost =
        typeof preferredHour === "number" && activeHours.includes(preferredHour) ? 0.06 : 0;

      const score =
        weights.cuisineAffinity * affinity +
        weights.priceMatch * priceMatch +
        weights.distanceScore * distanceNorm +
        weights.globalPopularity * popularity -
        weights.recentNegativePenalty * disliked +
        hourBoost +
        weekendBoost;

      const explanation = [
        affinity > 0 ? `Matches your ${item.category} preference` : "Useful for broad exploration",
        priceGap <= 1 ? "Price level aligns with your profile" : "Price level expands your range",
        (item.distanceMeters ?? maxDistance) < 2000 ? "Nearby option" : "Worth a short trip",
        hourBoost > 0 ? "Matches your active hour pattern" : "Time-neutral recommendation",
        weekendBoost > 0 ? "Weekend momentum boost applied" : "Standard day weighting",
      ];

      return { id: item.id, score, explanation };
    })
    .sort((a, b) => b.score - a.score);
}
