import { describe, expect, it } from "vitest";
import { hasCoreContactData, HomeEnrichmentDebouncer } from "../services/places/homeEnrichment";

describe("hasCoreContactData", () => {
  it("returns true only when Core+Contact fields are present", () => {
    expect(
      hasCoreContactData({
        imageUrl: "https://img.example/1.jpg",
        rating: "4.3",
        address: "123 Main St",
        phone: "+1-555-0000",
        photos: ["https://img.example/p1.jpg"],
      }),
    ).toBe(true);

    expect(
      hasCoreContactData({
        imageUrl: "https://img.example/1.jpg",
        rating: "N/A",
        address: "123 Main St",
        phone: "+1-555-0000",
        photos: ["https://img.example/p1.jpg"],
      }),
    ).toBe(false);
  });
});

describe("HomeEnrichmentDebouncer", () => {
  it("blocks duplicate starts while running and during debounce window", () => {
    const debouncer = new HomeEnrichmentDebouncer(30_000);
    const tileKey = "tile:13.75:100.50:5000:";
    const t0 = 1_000_000;

    expect(debouncer.shouldStart(tileKey, t0)).toBe(true);
    expect(debouncer.shouldStart(tileKey, t0 + 10)).toBe(false);

    debouncer.markFinished(tileKey, t0 + 500);
    expect(debouncer.shouldStart(tileKey, t0 + 20_000)).toBe(false);
    expect(debouncer.shouldStart(tileKey, t0 + 31_000)).toBe(true);
  });
});
