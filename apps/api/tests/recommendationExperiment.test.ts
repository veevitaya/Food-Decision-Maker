import { describe, expect, it } from "vitest";
import type { Restaurant } from "@shared/schema";
import { buildPersonalizedRecommendations } from "../services/recommendations/personalized";
import { computePerMemberScores } from "../services/recommendations/groupBlend";
import {
  parseRecommendationWeightsConfig,
  resolveRecommendationExperiment,
  validateVariantPresetMapping,
  type ExperimentConfig,
} from "../lib/recommendationExperiment";

function makeRestaurant(overrides: Partial<Restaurant>): Restaurant {
  return {
    id: 1,
    name: "R1",
    description: "d",
    imageUrl: "https://example.com/1.jpg",
    lat: "13.75",
    lng: "100.50",
    category: "Thai",
    priceLevel: 2,
    rating: "4.5",
    address: "Bangkok",
    isNew: false,
    trendingScore: 10,
    phone: null,
    openingHours: null,
    reviews: null,
    isSponsored: false,
    sponsoredUntil: null,
    vibes: [],
    district: null,
    photos: [],
    googlePlaceId: null,
    osmId: null,
    reviewCount: 0,
    reviewReplies: null,
    website: null,
    plusCode: null,
    editorialSummary: null,
    serviceOptions: null,
    amenities: null,
    paymentOptions: null,
    ...overrides,
  };
}

describe("recommendation experiment resolver", () => {
  const experiments: ExperimentConfig[] = [
    {
      experimentKey: "recommendation_ranking_v1",
      enabled: true,
      variants: [
        { key: "control", weight: 50 },
        { key: "aggressive_personalization", weight: 50 },
      ],
    },
  ];

  const recommendationWeights = parseRecommendationWeightsConfig({
    activePresetKey: "control",
    presets: {
      control: {
        cuisineAffinity: 0.35,
        priceMatch: 0.2,
        distanceScore: 0.2,
        globalPopularity: 0.2,
        recentNegativePenalty: 0.05,
      },
      aggressive_personalization: {
        cuisineAffinity: 0.7,
        priceMatch: 0.1,
        distanceScore: 0.1,
        globalPopularity: 0.08,
        recentNegativePenalty: 0.02,
      },
    },
  });

  it("assigns deterministically for same solo seed", () => {
    const first = resolveRecommendationExperiment({
      experiments,
      recommendationWeights,
      experimentKey: "recommendation_ranking_v1",
      seed: "user-123",
    });
    const second = resolveRecommendationExperiment({
      experiments,
      recommendationWeights,
      experimentKey: "recommendation_ranking_v1",
      seed: "user-123",
    });
    expect(first.variant).toBe(second.variant);
  });

  it("assigns deterministically for same group seed", () => {
    const first = resolveRecommendationExperiment({
      experiments,
      recommendationWeights,
      experimentKey: "recommendation_ranking_v1",
      seed: "ABCD12",
    });
    const second = resolveRecommendationExperiment({
      experiments,
      recommendationWeights,
      experimentKey: "recommendation_ranking_v1",
      seed: "ABCD12",
    });
    expect(first.variant).toBe(second.variant);
  });

  it("falls back to active preset when config is malformed", () => {
    const malformedWeights = parseRecommendationWeightsConfig({
      activePresetKey: "does_not_exist",
      presets: {
        control: {
          cuisineAffinity: 0.35,
          priceMatch: 0.2,
          distanceScore: 0.2,
          globalPopularity: 0.2,
          recentNegativePenalty: 0.05,
        },
      },
    });

    const result = resolveRecommendationExperiment({
      experiments: [],
      recommendationWeights: malformedWeights,
      experimentKey: "recommendation_ranking_v1",
      seed: "user-1",
    });

    expect(result.variant).toBe("control");
    expect(result.weights.cuisineAffinity).toBe(0.35);
  });

  it("detects variant keys that do not map to weight presets", () => {
    const missing = validateVariantPresetMapping(experiments, {
      control: recommendationWeights.presets.control,
    });
    expect(missing).toContain("aggressive_personalization");
  });
});

describe("weight wiring", () => {
  const restaurants: Restaurant[] = [
    makeRestaurant({ id: 1, category: "Thai", trendingScore: 20, priceLevel: 2 }),
    makeRestaurant({ id: 2, category: "Italian", trendingScore: 90, priceLevel: 2 }),
  ];

  const feature = {
    cuisineAffinity: { Thai: 1, Italian: 0 },
    preferredPriceLevel: 2,
    activeHours: [],
    dislikedItemIds: [],
    locationClusters: [],
  };

  it("changes personalized ordering when weights change", () => {
    const affinityHeavy = buildPersonalizedRecommendations({
      restaurants,
      feature,
      weights: {
        cuisineAffinity: 0.9,
        priceMatch: 0.02,
        distanceScore: 0.02,
        globalPopularity: 0.05,
        recentNegativePenalty: 0.01,
      },
    });

    const popularityHeavy = buildPersonalizedRecommendations({
      restaurants,
      feature,
      weights: {
        cuisineAffinity: 0.05,
        priceMatch: 0.02,
        distanceScore: 0.02,
        globalPopularity: 0.9,
        recentNegativePenalty: 0.01,
      },
    });

    expect(affinityHeavy.items[0]?.id).not.toBe(popularityHeavy.items[0]?.id);
  });

  it("changes group per-member scores when weights change", () => {
    const base = buildPersonalizedRecommendations({ restaurants, feature, limit: 2 });
    const members = [
      {
        memberId: 1,
        name: "A",
        avatarUrl: null,
        snapshot: {
          cuisineAffinity: { Thai: 1, Italian: 0 },
          preferredPriceLevel: 2,
          activeHours: [],
          dislikedItemIds: [],
        },
      },
    ];

    const affinityHeavy = computePerMemberScores(
      base.items,
      members,
      undefined,
      undefined,
      null,
      {
        cuisineAffinity: 0.9,
        priceMatch: 0.02,
        distanceScore: 0.02,
        globalPopularity: 0.05,
        recentNegativePenalty: 0.01,
      },
    );

    const popularityHeavy = computePerMemberScores(
      base.items,
      members,
      undefined,
      undefined,
      null,
      {
        cuisineAffinity: 0.05,
        priceMatch: 0.02,
        distanceScore: 0.02,
        globalPopularity: 0.9,
        recentNegativePenalty: 0.01,
      },
    );

    const thaiAffinityHeavy = affinityHeavy.get(1)?.[0]?.matchPct ?? 0;
    const thaiPopularityHeavy = popularityHeavy.get(1)?.[0]?.matchPct ?? 0;
    expect(thaiAffinityHeavy).not.toBe(thaiPopularityHeavy);
  });
});
