import { describe, it, expect } from "vitest";
import { api } from "@shared/routes";

const inputSchema = api.restaurants.list.input!;
const responseItemSchema = api.restaurants.list.responses[200].element;

// Minimal valid restaurant matching the DB shape
const VALID_RESTAURANT = {
  id: 1,
  name: "Somtam Cafe",
  description: "Thai street food",
  imageUrl: "https://example.com/img.jpg",
  lat: "13.74200",
  lng: "100.54000",
  category: "Thai",
  priceLevel: 2,
  rating: "4.5",
  address: "123 Sukhumvit, Bangkok",
};

// ─── Input schema ────────────────────────────────────────────────────────────

describe("GET /api/restaurants — input schema", () => {
  it("accepts empty query (all fields optional)", () => {
    expect(() => inputSchema.parse({})).not.toThrow();
    expect(() => inputSchema.parse(undefined)).not.toThrow();
  });

  it("accepts all new query fields", () => {
    const result = inputSchema.parse({
      mode: "trending",
      lat: "13.74",
      lng: "100.54",
      query: "Thai",
      radius: "2000",
      forceRefresh: "true",
      sourcePreference: "osm-first",
    });
    expect(result?.lat).toBe(13.74);
    expect(result?.forceRefresh).toBe(true);
    expect(result?.sourcePreference).toBe("osm-first");
  });

  it("coerces lat/lng from strings to numbers", () => {
    const result = inputSchema.parse({ lat: "13.742", lng: "100.540" });
    expect(typeof result?.lat).toBe("number");
    expect(typeof result?.lng).toBe("number");
  });

  it("coerces forceRefresh from string 'true' to boolean", () => {
    const result = inputSchema.parse({ forceRefresh: "true" });
    expect(result?.forceRefresh).toBe(true);
  });

  it("defaults sourcePreference to osm-first", () => {
    const result = inputSchema.parse({});
    expect(result?.sourcePreference).toBe("osm-first");
  });

  it("accepts all valid sourcePreference values", () => {
    for (const v of ["osm-first", "google-first", "hybrid"] as const) {
      expect(() => inputSchema.parse({ sourcePreference: v })).not.toThrow();
    }
  });

  it("rejects invalid sourcePreference", () => {
    expect(() => inputSchema.parse({ sourcePreference: "random" })).toThrow();
  });

  it("rejects non-numeric lat", () => {
    // coerce will turn "abc" to NaN which zod treats as invalid number
    expect(() => inputSchema.parse({ lat: "abc" })).toThrow();
  });
});

// ─── Response item schema ─────────────────────────────────────────────────────

describe("Restaurant response item schema", () => {
  it("accepts a minimal restaurant without new optional fields", () => {
    expect(() => responseItemSchema.parse(VALID_RESTAURANT)).not.toThrow();
  });

  it("accepts all new optional metadata fields when present", () => {
    expect(() =>
      responseItemSchema.parse({
        ...VALID_RESTAURANT,
        source: "osm",
        distanceMeters: 350,
        photos: ["https://example.com/photo.jpg"],
        freshnessScore: 0.9,
        isFallback: false,
      }),
    ).not.toThrow();
  });

  it("accepts source=cache", () => {
    expect(() =>
      responseItemSchema.parse({ ...VALID_RESTAURANT, source: "cache" }),
    ).not.toThrow();
  });

  it("accepts source=mixed", () => {
    expect(() =>
      responseItemSchema.parse({ ...VALID_RESTAURANT, source: "mixed" }),
    ).not.toThrow();
  });

  it("rejects invalid source value", () => {
    expect(() =>
      responseItemSchema.parse({ ...VALID_RESTAURANT, source: "bing" }),
    ).toThrow();
  });

  it("optional fields absent does not break parse", () => {
    const stripped = { ...VALID_RESTAURANT };
    // Explicitly remove all optional fields — parse must still succeed
    const result = responseItemSchema.parse(stripped);
    expect(result.source).toBeUndefined();
    expect(result.distanceMeters).toBeUndefined();
    expect(result.photos).toBeUndefined();
    expect(result.isFallback).toBeUndefined();
  });

  it("accepts restaurant with phone and opening hours", () => {
    expect(() =>
      responseItemSchema.parse({
        ...VALID_RESTAURANT,
        phone: "+66-2-123-4567",
        openingHours: [{ day: "Monday", hours: "10:00-22:00" }],
      }),
    ).not.toThrow();
  });

  it("requires id to be a number", () => {
    expect(() =>
      responseItemSchema.parse({ ...VALID_RESTAURANT, id: "not-a-number" }),
    ).toThrow();
  });
});
