import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildKey,
  get,
  set,
  isStale,
  isSufficient,
  isFreshAndSufficient,
  _clearForTest,
} from "../../apps/api/services/places/cache/cacheRepo";
import type { NormalizedPlace } from "../../apps/api/services/places/types";

const makePlace = (name: string): NormalizedPlace => ({
  id: `osm:node:${name}`,
  name,
  lat: 13.74,
  lng: 100.54,
  address: "Bangkok",
  category: "Restaurant",
  source: "osm",
});

const places = Array.from({ length: 6 }, (_, i) => makePlace(`Place ${i}`));

beforeEach(() => {
  _clearForTest();
  vi.unstubAllEnvs();
});

describe("buildKey", () => {
  it("rounds lat/lng to 5 decimal places", () => {
    const key = buildKey(13.742001234, 100.540009876, 2000, "restaurant");
    expect(key).toBe("places:13.74200:100.54001:2000:restaurant");
  });

  it("produces same key for the same rounded coords", () => {
    const a = buildKey(13.742, 100.54, 2000, "restaurant");
    const b = buildKey(13.742001, 100.540001, 2000, "restaurant");
    expect(a).toBe(b);
  });
});

describe("set / get", () => {
  it("stores and retrieves data", () => {
    const key = "test:key";
    set(key, places);
    expect(get(key)?.data).toEqual(places);
  });

  it("returns undefined for missing key", () => {
    expect(get("nonexistent:key")).toBeUndefined();
  });
});

describe("isStale", () => {
  it("returns true for missing key", () => {
    expect(isStale("no:key")).toBe(true);
  });

  it("returns false immediately after set", () => {
    const key = "fresh:key";
    set(key, places);
    expect(isStale(key)).toBe(false);
  });

  it("returns true after TTL expires", () => {
    const key = "stale:key";
    set(key, places);
    // Advance time past the default 7-day TTL
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(isStale(key)).toBe(true);
    vi.restoreAllMocks();
  });

  it("respects CACHE_TTL_PLACES env var", () => {
    vi.stubEnv("CACHE_TTL_PLACES", "1000"); // 1 second
    // Re-import with fresh env — module is already loaded so we test via time
    const key = "short:ttl";
    set(key, places);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2000);
    expect(isStale(key)).toBe(true);
    vi.restoreAllMocks();
  });
});

describe("isSufficient", () => {
  it("returns false for missing key", () => {
    expect(isSufficient("no:key")).toBe(false);
  });

  it("returns false when count < MIN_RESULTS (default 5)", () => {
    const key = "small:result";
    set(key, places.slice(0, 3));
    expect(isSufficient(key)).toBe(false);
  });

  it("returns true when count >= MIN_RESULTS", () => {
    const key = "big:result";
    set(key, places); // 6 places >= 5
    expect(isSufficient(key)).toBe(true);
  });
});

describe("isFreshAndSufficient", () => {
  it("returns true only when both fresh and sufficient", () => {
    const key = "combo:key";
    set(key, places);
    expect(isFreshAndSufficient(key)).toBe(true);
  });

  it("returns false when data is stale", () => {
    const key = "stale:combo";
    set(key, places);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(isFreshAndSufficient(key)).toBe(false);
    vi.restoreAllMocks();
  });

  it("returns false when insufficient results", () => {
    const key = "small:combo";
    set(key, places.slice(0, 2));
    expect(isFreshAndSufficient(key)).toBe(false);
  });
});
