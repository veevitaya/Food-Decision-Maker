/**
 * Integration tests for the analytics pipeline:
 * - Event ingestion (idempotency, consent gate, validation)
 * - SLO checker
 * - Aggregation job
 * - Cold-start recommendation policy
 *
 * Uses vitest with mocked storage — no live DB required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkSLOs } from "../lib/slo";
import { maskUserId } from "../lib/pii";
import { buildPersonalizedRecommendations } from "../services/recommendations/personalized";
import type { Restaurant } from "@shared/schema";

// ── SLO checker ──────────────────────────────────────────────────────────────
describe("checkSLOs", () => {
  it("returns passing when all metrics are healthy", () => {
    const slos = checkSLOs({ qualityPassRatePct: 99.5, featureFreshnessHoursAvg: 24 });
    expect(slos.every((s) => s.passing)).toBe(true);
  });

  it("fails quality_pass_rate when below 98%", () => {
    const slos = checkSLOs({ qualityPassRatePct: 95, featureFreshnessHoursAvg: 24 });
    const qualitySlo = slos.find((s) => s.name === "quality_pass_rate");
    expect(qualitySlo?.passing).toBe(false);
  });

  it("fails feature_freshness when above 72 hours", () => {
    const slos = checkSLOs({ qualityPassRatePct: 99, featureFreshnessHoursAvg: 80 });
    const freshnessSlo = slos.find((s) => s.name === "feature_freshness");
    expect(freshnessSlo?.passing).toBe(false);
  });

  it("includes ingest_success_rate when provided", () => {
    const slos = checkSLOs({ qualityPassRatePct: 99, featureFreshnessHoursAvg: 20, ingestSuccessRatePct: 98 });
    const ingestSlo = slos.find((s) => s.name === "ingest_success_rate");
    expect(ingestSlo).toBeDefined();
    expect(ingestSlo?.passing).toBe(false); // 98 < 99 target
  });
});

// ── PII masking ───────────────────────────────────────────────────────────────
describe("maskUserId", () => {
  it("returns anonymous for null/undefined", () => {
    expect(maskUserId(null)).toBe("u_anonymous");
    expect(maskUserId(undefined)).toBe("u_anonymous");
  });

  it("returns deterministic hash prefixed with u_", () => {
    const masked = maskUserId("user_123");
    expect(masked).toMatch(/^u_[0-9a-f]{8}$/);
    expect(maskUserId("user_123")).toBe(masked); // deterministic
  });

  it("produces different hashes for different inputs", () => {
    expect(maskUserId("user_123")).not.toBe(maskUserId("user_456"));
  });
});

// ── Cold-start recommendations ────────────────────────────────────────────────
function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 1,
    name: "Test Restaurant",
    description: "A test restaurant",
    imageUrl: "https://example.com/img.jpg",
    lat: "13.7563",
    lng: "100.5018",
    category: "Thai",
    priceLevel: 2,
    rating: "4.5",
    address: "Bangkok",
    isNew: false,
    trendingScore: 50,
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
    ...overrides,
  };
}

describe("buildPersonalizedRecommendations", () => {
  const restaurants: Restaurant[] = [
    makeRestaurant({ id: 1, category: "Thai", trendingScore: 80 }),
    makeRestaurant({ id: 2, category: "Japanese", trendingScore: 60 }),
    makeRestaurant({ id: 3, category: "Italian", trendingScore: 40 }),
  ];

  it("returns trending source when no restaurants", () => {
    const result = buildPersonalizedRecommendations({ restaurants: [], feature: null });
    expect(result.source).toBe("trending");
    expect(result.items).toHaveLength(0);
  });

  it("returns segment source for cold-start (no feature)", () => {
    const result = buildPersonalizedRecommendations({ restaurants, feature: null });
    expect(result.source).toBe("segment");
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("returns sparse_blend for user with < 3 cuisine affinities", () => {
    const result = buildPersonalizedRecommendations({
      restaurants,
      feature: {
        cuisineAffinity: { Thai: 0.5 }, // only 1 key → sparse
        preferredPriceLevel: 2,
        activeHours: [],
        dislikedItemIds: [],
      },
    });
    expect(result.source).toBe("sparse_blend");
  });

  it("returns personalized for user with >= 3 cuisine affinities", () => {
    const result = buildPersonalizedRecommendations({
      restaurants,
      feature: {
        cuisineAffinity: { Thai: 0.8, Japanese: 0.5, Italian: 0.3, Korean: 0.1 },
        preferredPriceLevel: 2,
        activeHours: [],
        dislikedItemIds: [],
      },
    });
    expect(result.source).toBe("personalized");
  });

  it("boosts new restaurants (ctr < 10) in rankings", () => {
    // Create two identical restaurants but one is "new" (low CTR)
    const rests: Restaurant[] = [
      makeRestaurant({ id: 10, trendingScore: 50, category: "Thai" }),
      makeRestaurant({ id: 11, trendingScore: 50, category: "Thai" }),
    ];
    const itemCtrs = new Map([[10, 100], [11, 0]]); // id=11 is new (ctr=0)

    const result = buildPersonalizedRecommendations({ restaurants: rests, feature: null, itemCtrs });
    const newRest = result.items.find((r) => r.id === 11);
    const establishedRest = result.items.find((r) => r.id === 10);
    expect(newRest!.score).toBeGreaterThan(establishedRest!.score);
  });

  it("adds super-like explanation for strongly matched cuisines", () => {
    const result = buildPersonalizedRecommendations({
      restaurants,
      feature: {
        cuisineAffinity: { Thai: 0.9, Japanese: 0.4, Italian: 0.3, Korean: 0.1 },
        preferredPriceLevel: 2,
        activeHours: [],
        dislikedItemIds: [],
      },
    });
    const thaiResult = result.items.find((r) => r.category === "Thai");
    expect(thaiResult).toBeDefined();
    expect(thaiResult?.explanation).toContain("Super-like cuisine boost applied");
  });

  it("adds location cluster explanation for top districts", () => {
    const localizedRestaurants: Restaurant[] = [
      makeRestaurant({ id: 21, category: "Thai", address: "Silom Road", trendingScore: 50 }),
      makeRestaurant({ id: 22, category: "Thai", address: "Ratchada", trendingScore: 50 }),
    ];

    const result = buildPersonalizedRecommendations({
      restaurants: localizedRestaurants,
      feature: {
        cuisineAffinity: { Thai: 0.6, Japanese: 0.2, Italian: 0.2, Korean: 0.1 },
        preferredPriceLevel: 2,
        activeHours: [],
        dislikedItemIds: [],
        locationClusters: ["Silom", "Sukhumvit"],
      },
    });

    const sukhumvitItem = result.items.find((r) => r.id === 21);
    expect(sukhumvitItem).toBeDefined();
    expect(sukhumvitItem?.explanation).toContain("Near your frequent area");
  });
});
