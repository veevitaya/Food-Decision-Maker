import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock storage (and its transitive db.ts dep) before any imports that load placesService.
// Returns empty/undefined so all tests fall through to the OSM/Google provider spies,
// preserving existing test behaviour without needing a real DATABASE_URL.
vi.mock("../../apps/api/storage", () => ({
  storage: {
    getPlacesTile: vi.fn().mockResolvedValue(undefined),
    upsertPlacesTile: vi.fn().mockResolvedValue(undefined),
    findRestaurantsNear: vi.fn().mockResolvedValue([]),
  },
}));

import * as cache from "../../apps/api/services/places/cache/cacheRepo";
import * as overpass from "../../apps/api/services/places/providers/overpass";
import * as google from "../../apps/api/services/places/providers/google";
import { query } from "../../apps/api/services/places/placesService";
import type { NormalizedPlace } from "../../apps/api/services/places/types";

const makePlace = (name: string, lat = 13.74, lng = 100.54): NormalizedPlace => ({
  id: `osm:node:${name}`,
  name,
  lat,
  lng,
  address: "Bangkok",
  category: "Restaurant",
  source: "osm",
  distanceMeters: 0,
});

const QUERY = { lat: 13.74, lng: 100.54, radius: 2000 };

beforeEach(() => {
  cache._clearForTest();
  google._resetForTest();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.stubEnv("PROVIDER_FALLBACK", "osm-error-only");
});

describe("cache-first behaviour", () => {
  it("returns fromCache:true and skips providers on cache hit", async () => {
    const osmSpy = vi.spyOn(overpass, "queryOverpass").mockResolvedValue([]);
    // Pre-populate cache with sufficient data
    const key = cache.buildKey(QUERY.lat, QUERY.lng, QUERY.radius, "restaurant");
    const places = Array.from({ length: 6 }, (_, i) => makePlace(`Cached ${i}`));
    cache.set(key, places);

    const result = await query(QUERY);

    expect(result.fromCache).toBe(true);
    expect(result.source).toBe("cache");
    expect(result.data).toHaveLength(6);
    expect(osmSpy).not.toHaveBeenCalled();
  });

  it("returns fresh OSM data and fromCache:false on cache miss", async () => {
    const osmSpy = vi
      .spyOn(overpass, "queryOverpass")
      .mockResolvedValue(Array.from({ length: 6 }, (_, i) => makePlace(`OSM ${i}`)));
    vi.spyOn(google, "queryGoogle").mockResolvedValue([]);

    const result = await query(QUERY);

    expect(result.fromCache).toBe(false);
    expect(result.source).toBe("osm");
    expect(osmSpy).toHaveBeenCalledOnce();
  });
});

describe("forceRefresh", () => {
  it("bypasses cache and fetches fresh data", async () => {
    // Populate cache
    const key = cache.buildKey(QUERY.lat, QUERY.lng, QUERY.radius, "restaurant");
    cache.set(key, Array.from({ length: 6 }, (_, i) => makePlace(`Old ${i}`)));

    const osmSpy = vi
      .spyOn(overpass, "queryOverpass")
      .mockResolvedValue([makePlace("New Place 1"), makePlace("New Place 2")]);
    vi.spyOn(google, "queryGoogle").mockResolvedValue([]);

    const result = await query({ ...QUERY, forceRefresh: true });

    expect(osmSpy).toHaveBeenCalledOnce();
    expect(result.fromCache).toBe(false);
    expect(result.data.some((p) => p.name === "New Place 1")).toBe(true);
  });
});

describe("OSM fallback to Google", () => {
  it("calls Google when OSM returns empty and PROVIDER_FALLBACK=osm-error-only", async () => {
    vi.spyOn(overpass, "queryOverpass").mockResolvedValue([]);
    const googleSpy = vi
      .spyOn(google, "queryGoogle")
      .mockResolvedValue([{ ...makePlace("Google Place"), source: "google", isFallback: true }]);

    const result = await query(QUERY);

    expect(googleSpy).toHaveBeenCalledOnce();
    expect(result.source).toBe("google");
    expect(result.isFallback).toBe(true);
  });

  it("does NOT call Google when PROVIDER_FALLBACK=none", async () => {
    vi.stubEnv("PROVIDER_FALLBACK", "none");
    vi.spyOn(overpass, "queryOverpass").mockResolvedValue([]);
    const googleSpy = vi.spyOn(google, "queryGoogle").mockResolvedValue([]);

    await query(QUERY);

    expect(googleSpy).not.toHaveBeenCalled();
  });

  it("calls Google on OSM provider error and still returns 200-equivalent", async () => {
    vi.spyOn(overpass, "queryOverpass").mockRejectedValue(new Error("Overpass down"));
    const googleSpy = vi
      .spyOn(google, "queryGoogle")
      .mockResolvedValue([{ ...makePlace("Fallback Place"), source: "google", isFallback: true }]);

    const result = await query(QUERY);

    expect(googleSpy).toHaveBeenCalledOnce();
    expect(result.data).toHaveLength(1);
    expect(result.isFallback).toBe(true);
  });
});

describe("source field", () => {
  it("source=osm when only OSM returns results", async () => {
    vi.spyOn(overpass, "queryOverpass").mockResolvedValue([makePlace("A"), makePlace("B")]);
    vi.spyOn(google, "queryGoogle").mockResolvedValue([]);

    const result = await query({ ...QUERY, sourcePreference: "osm-first" });
    expect(result.source).toBe("osm");
  });

  it("source=mixed when both OSM and Google contribute", async () => {
    vi.spyOn(overpass, "queryOverpass").mockResolvedValue([makePlace("Shared Place", 13.741, 100.541)]);
    vi.spyOn(google, "queryGoogle").mockResolvedValue([
      { ...makePlace("Unique Google", 13.745, 100.545), source: "google" },
    ]);

    const result = await query({ ...QUERY, sourcePreference: "hybrid" });
    expect(result.source).toBe("mixed");
  });
});

describe("deduplication", () => {
  it("removes duplicate by same name + proximity (<100m)", async () => {
    const osmPlace = makePlace("Duplicate Restaurant", 13.74, 100.54);
    const googlePlace: NormalizedPlace = {
      ...osmPlace,
      id: "google:dup",
      source: "google",
      lat: 13.74001, // within 100m
      lng: 100.54001,
    };
    vi.spyOn(overpass, "queryOverpass").mockResolvedValue([osmPlace]);
    vi.spyOn(google, "queryGoogle").mockResolvedValue([googlePlace]);

    const result = await query({ ...QUERY, sourcePreference: "hybrid" });

    const matches = result.data.filter((p) => p.name === "Duplicate Restaurant");
    expect(matches).toHaveLength(1);
  });

  it("keeps both places when same name but >100m apart", async () => {
    const osmPlace = makePlace("Far Restaurant", 13.74, 100.54);
    const googlePlace: NormalizedPlace = {
      ...makePlace("Far Restaurant", 13.75, 100.55), // ~1.4km away
      id: "google:far",
      source: "google",
    };
    vi.spyOn(overpass, "queryOverpass").mockResolvedValue([osmPlace]);
    vi.spyOn(google, "queryGoogle").mockResolvedValue([googlePlace]);

    const result = await query({ ...QUERY, sourcePreference: "hybrid" });

    const matches = result.data.filter((p) => p.name === "Far Restaurant");
    expect(matches).toHaveLength(2);
  });
});

describe("result ordering", () => {
  it("sorts results by distanceMeters ascending", async () => {
    const far = { ...makePlace("Far"), distanceMeters: 1500 };
    const near = { ...makePlace("Near"), distanceMeters: 200 };
    const mid = { ...makePlace("Mid"), distanceMeters: 800 };
    vi.spyOn(overpass, "queryOverpass").mockResolvedValue([far, near, mid]);
    vi.spyOn(google, "queryGoogle").mockResolvedValue([]);

    const result = await query(QUERY);

    expect(result.data[0].name).toBe("Near");
    expect(result.data[1].name).toBe("Mid");
    expect(result.data[2].name).toBe("Far");
  });
});
