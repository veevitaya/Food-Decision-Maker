import { describe, expect, it } from "vitest";
import { autoAssignVibes } from "../../packages/shared/vibeConfig";

describe("autoAssignVibes", () => {
  it("prioritizes premium nightlife signals", () => {
    const vibes = autoAssignVibes({
      name: "Skyline Rooftop Bar",
      category: "Rooftop Bar",
      description: "Craft cocktails, sky bar views, romantic setting, open late",
      address: "Thonglor, Bangkok",
      priceLevel: 4,
      rating: "4.7",
      openingHours: [{ day: "Fri", hours: "17:00-02:00" }],
    });

    expect(vibes).toContain("drinks");
    expect(vibes).toContain("rooftop");
    expect(vibes).toContain("date_night");
    expect(vibes).toContain("late_night");
    expect(vibes).not.toContain("budget");
    expect(vibes.length).toBeLessThanOrEqual(4);
  });

  it("detects budget street-food clusters with late-night behavior", () => {
    const vibes = autoAssignVibes({
      name: "Yaowarat Night Market Stall",
      category: "Street Food",
      description: "Cheap local food stall, open late, grab delivery",
      address: "Chinatown, Bangkok",
      priceLevel: 1,
      rating: "4.2",
      openingHours: [{ day: "Daily", hours: "18:00-01:00" }],
    });

    expect(vibes).toContain("street_food");
    expect(vibes).toContain("budget");
    expect(vibes).toContain("late_night");
    expect(vibes.length).toBeLessThanOrEqual(4);
  });

  it("captures cafe, healthy, and brunch from mixed metadata", () => {
    const vibes = autoAssignVibes({
      name: "Ari Garden Cafe",
      category: "Cafe",
      description: "Specialty coffee, smoothie bowl, all-day breakfast, organic salad",
      address: "Ari, Bangkok",
      priceLevel: 2,
      rating: "4.5",
      openingHours: [{ day: "Daily", hours: "07:30-17:00" }],
    });

    expect(vibes).toContain("cafe");
    expect(vibes).toContain("healthy");
    expect(vibes).toContain("brunch");
    expect(vibes).not.toContain("drinks");
    expect(vibes.length).toBeLessThanOrEqual(4);
  });

  it("falls back to family when confidence is low", () => {
    const vibes = autoAssignVibes({
      name: "Maison 42",
      category: "Contemporary",
      description: "Chef specials",
      address: "Bangkok",
      priceLevel: 4,
      rating: "3.9",
    });

    expect(vibes).toEqual(["family"]);
  });

  it("avoids false drinks tag from partial word matches", () => {
    const vibes = autoAssignVibes({
      name: "Bangkok Barbecue House",
      category: "Barbecue",
      description: "Smoked meats and grill platters",
      address: "Phaya Thai, Bangkok",
      priceLevel: 2,
      rating: "4.1",
    });

    expect(vibes).not.toContain("drinks");
  });

  it("treats 24-hour operation as late-night signal", () => {
    const vibes = autoAssignVibes({
      name: "Quick Bowl",
      category: "Noodles",
      description: "Fast comfort food with takeaway and delivery",
      address: "Sukhumvit, Bangkok",
      priceLevel: 1,
      rating: "4.0",
      openingHours: [{ day: "Daily", hours: "Open 24/7" }],
    });

    expect(vibes).toContain("late_night");
    expect(vibes).toContain("delivery");
  });
});
