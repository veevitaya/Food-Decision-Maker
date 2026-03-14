import { describe, expect, it } from "vitest";
import { deriveItemFeatureDelta, hasItemFeatureDelta } from "../lib/itemFeatureMetrics";
import { applyItemFeatureDeltas } from "../lib/itemFeatureSnapshot";

describe("deriveItemFeatureDelta", () => {
  it("increments ctr for view_card only", () => {
    const delta = deriveItemFeatureDelta("view_card", {});
    expect(delta).toEqual({
      ctr: 1,
      likeRate: 0,
      superLikeRate: 0,
      conversionRate: 0,
    });
  });

  it("increments likeRate for swipe right", () => {
    const delta = deriveItemFeatureDelta("swipe", { direction: "right" });
    expect(delta).toEqual({
      ctr: 0,
      likeRate: 1,
      superLikeRate: 0,
      conversionRate: 0,
    });
  });

  it("increments likeRate and superLikeRate for swipe super", () => {
    const delta = deriveItemFeatureDelta("swipe", { direction: "super" });
    expect(delta).toEqual({
      ctr: 0,
      likeRate: 1,
      superLikeRate: 1,
      conversionRate: 0,
    });
  });

  it("treats swipe direction case-insensitively", () => {
    const delta = deriveItemFeatureDelta("swipe", { direction: "RIGHT" });
    expect(delta.likeRate).toBe(1);
    expect(delta.superLikeRate).toBe(0);
  });

  it("does not increment like metrics for swipe left", () => {
    const delta = deriveItemFeatureDelta("swipe", { direction: "left" });
    expect(delta).toEqual({
      ctr: 0,
      likeRate: 0,
      superLikeRate: 0,
      conversionRate: 0,
    });
  });

  it("increments conversionRate for deeplink_click", () => {
    const delta = deriveItemFeatureDelta("deeplink_click", {});
    expect(delta).toEqual({
      ctr: 0,
      likeRate: 0,
      superLikeRate: 0,
      conversionRate: 1,
    });
  });

  it("detects zero vs non-zero deltas", () => {
    expect(hasItemFeatureDelta(deriveItemFeatureDelta("filter", {}))).toBe(false);
    expect(hasItemFeatureDelta(deriveItemFeatureDelta("view_card", {}))).toBe(true);
  });
});

describe("applyItemFeatureDeltas", () => {
  it("creates initial counters from zero base", () => {
    const next = applyItemFeatureDeltas(
      { ctr: 0, likeRate: 0, superLikeRate: 0, conversionRate: 0 },
      { ctr: 1, likeRate: 1, superLikeRate: 0, conversionRate: 1 },
    );
    expect(next).toEqual({
      ctr: 1,
      likeRate: 1,
      superLikeRate: 0,
      conversionRate: 1,
    });
  });

  it("increments cumulatively without overwriting", () => {
    const afterFirst = applyItemFeatureDeltas(
      { ctr: 0, likeRate: 0, superLikeRate: 0, conversionRate: 0 },
      { ctr: 1, likeRate: 0, superLikeRate: 0, conversionRate: 0 },
    );
    const afterSecond = applyItemFeatureDeltas(afterFirst, {
      ctr: 1,
      likeRate: 1,
      superLikeRate: 1,
      conversionRate: 1,
    });
    expect(afterSecond).toEqual({
      ctr: 2,
      likeRate: 1,
      superLikeRate: 1,
      conversionRate: 1,
    });
  });
});
