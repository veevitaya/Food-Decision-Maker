import { describe, expect, it } from "vitest";
import { getSuperLikeMultiplier, getSwipeSignalWeight, normalizeSwipeDirection } from "../lib/superLike";

describe("superLike helpers", () => {
  it("normalizes swipe direction to lowercase", () => {
    expect(normalizeSwipeDirection({ direction: " SUPER " })).toBe("super");
    expect(normalizeSwipeDirection({ direction: "RIGHT" })).toBe("right");
    expect(normalizeSwipeDirection({})).toBe("");
  });

  it("returns 3x signal for super swipes", () => {
    expect(getSwipeSignalWeight("swipe", { direction: "super" })).toBe(3);
    expect(getSwipeSignalWeight("swipe", { direction: "SUPER" })).toBe(3);
  });

  it("returns 1x signal for right swipes and 0 for others", () => {
    expect(getSwipeSignalWeight("swipe", { direction: "right" })).toBe(1);
    expect(getSwipeSignalWeight("swipe", { direction: "left" })).toBe(0);
    expect(getSwipeSignalWeight("favorite", { direction: "super" })).toBe(0);
  });

  it("applies stronger multipliers for high affinities", () => {
    expect(getSuperLikeMultiplier(0.9)).toBe(1.2);
    expect(getSuperLikeMultiplier(0.75)).toBe(1.1);
    expect(getSuperLikeMultiplier(0.69)).toBe(1);
  });
});
