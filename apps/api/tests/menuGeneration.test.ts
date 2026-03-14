import { describe, it, expect } from "vitest";
import {
  buildMenuDrafts,
  countRealActiveMenus,
  detectCuisineKey,
  estimatePriceApprox,
  resolveMenuImageUrl,
} from "../lib/menuGeneration";

describe("menuGeneration helpers", () => {
  it("detects cuisine from Bangkok-style categories", () => {
    expect(detectCuisineKey("Thai • Street food")).toBe("thai");
    expect(detectCuisineKey("Japanese • Sushi")).toBe("japanese");
    expect(detectCuisineKey("Cafe • Brunch")).toBe("cafe");
    expect(detectCuisineKey("Unknown")).toBe("generic");
  });

  it("counts only real active menus", () => {
    const count = countRealActiveMenus([
      { name: "Chef Special", isActive: true },
      { name: "Pad Thai", isActive: true },
      { name: "Tom Yum", isActive: false },
      { name: "Green Curry", isActive: true },
    ]);
    expect(count).toBe(2);
  });

  it("estimates prices inside expected level bands", () => {
    const level1 = estimatePriceApprox({
      priceLevel: 1,
      cuisineKey: "thai",
      dishName: "Pad Thai",
      restaurantId: 10,
    });
    expect(level1).toBeGreaterThanOrEqual(100);
    expect(level1).toBeLessThanOrEqual(200);

    const level4 = estimatePriceApprox({
      priceLevel: 4,
      cuisineKey: "steak",
      dishName: "Ribeye Steak",
      restaurantId: 99,
    });
    expect(level4).toBeGreaterThanOrEqual(700);
    expect(level4).toBeLessThanOrEqual(1440);
  });

  it("always resolves a renderable image url", () => {
    const url = resolveMenuImageUrl({
      imageKeys: ["does_not_exist"],
      cuisineKey: "generic",
      restaurantId: 5,
      itemIndex: 0,
    });
    expect(url.startsWith("http")).toBe(true);
  });

  it("builds drafts with dedupe and image urls", () => {
    const generated = buildMenuDrafts({
      restaurant: {
        id: 224,
        name: "Noods Pork Noodles",
        category: "Thai • Street food",
        description: "Neighborhood noodle bar",
        district: "Ari",
        priceLevel: 2,
      },
      targetCount: 6,
      existingNames: ["Pad Thai Goong"],
      llmDishes: [
        {
          name: "Pad Thai Goong",
          description: "duplicate should be filtered",
          tags: ["thai"],
          dietFlags: [],
        },
        {
          name: "Boat Noodle Bowl",
          description: "Rich broth with sliced beef and herbs.",
          tags: ["thai", "noodles"],
          dietFlags: [],
        },
      ],
    });

    expect(generated.drafts.length).toBe(6);
    expect(generated.drafts.every((d) => d.imageUrl.startsWith("http"))).toBe(true);
    expect(generated.drafts.some((d) => d.name === "Boat Noodle Bowl")).toBe(true);
    expect(generated.drafts.some((d) => d.name === "Pad Thai Goong")).toBe(false);
  });
});
