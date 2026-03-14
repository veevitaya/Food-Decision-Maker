import { describe, expect, it } from "vitest";
import { aggregateRecommendationExperimentReport } from "../lib/recommendationExperimentReport";

describe("aggregateRecommendationExperimentReport", () => {
  it("aggregates by recommendation source + variant", () => {
    const rows = aggregateRecommendationExperimentReport([
      {
        eventType: "view_card",
        metadata: { recommendation_source: "personalized", recommendation_variant: "control" },
      },
      {
        eventType: "swipe",
        metadata: { recommendation_source: "personalized", recommendation_variant: "control", direction: "right" },
      },
      {
        eventType: "swipe",
        metadata: { recommendation_source: "personalized", recommendation_variant: "control", direction: "left" },
      },
      {
        eventType: "deeplink_click",
        metadata: { recommendation_source: "personalized", recommendation_variant: "control" },
      },
      {
        eventType: "view_card",
        metadata: { recommendation_source: "personalized", recommendation_variant: "hybrid_v2" },
      },
    ]);

    const control = rows.find((row) => row.recommendationVariant === "control");
    expect(control).toBeDefined();
    expect(control?.impressions).toBe(1);
    expect(control?.swipes).toBe(2);
    expect(control?.rightSwipes).toBe(1);
    expect(control?.rightSwipeRate).toBe(50);
    expect(control?.deliveryClicks).toBe(1);
    expect(control?.clickThroughRate).toBe(100);
  });

  it("handles low sample sizes without NaN rates", () => {
    const rows = aggregateRecommendationExperimentReport([
      {
        eventType: "swipe",
        metadata: { recommendation_source: "group", recommendation_variant: "control", direction: "left" },
      },
    ]);

    expect(rows[0]?.impressions).toBe(0);
    expect(rows[0]?.clickThroughRate).toBe(0);
    expect(rows[0]?.rightSwipeRate).toBe(0);
  });
});
