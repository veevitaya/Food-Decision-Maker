import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryGoogle, _resetForTest, _getDailySpend } from "../../apps/api/services/places/providers/google";

const GOOGLE_PLACE = (id: string, photoRef?: string) => ({
  place_id: id,
  name: `Place ${id}`,
  geometry: { location: { lat: 13.74, lng: 100.54 } },
  vicinity: "Bangkok",
  types: ["restaurant", "food"],
  rating: 4.2,
  price_level: 2,
  ...(photoRef ? { photos: [{ photo_reference: photoRef }] } : {}),
});

const makeGoogleResponse = (places: object[]) => ({
  ok: true,
  json: () => Promise.resolve({ status: "OK", results: places }),
});

beforeEach(() => {
  _resetForTest();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key-123");
});

describe("queryGoogle — no API key", () => {
  it("returns [] without calling fetch when key is missing", async () => {
    vi.unstubAllEnvs(); // removes GOOGLE_PLACES_API_KEY
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await queryGoogle(13.74, 100.54, 2000);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("queryGoogle — budget circuit breaker", () => {
  it("returns [] without calling fetch when daily budget is exceeded", async () => {
    vi.stubEnv("GOOGLE_DAILY_BUDGET_USD", "0.01"); // Less than one search call (0.032)
    // Exhaust the budget by making a real call first
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeGoogleResponse([GOOGLE_PLACE("1")])));
    await queryGoogle(13.74, 100.54, 2000); // spend increases past 0.01
    // Now budget is exceeded
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await queryGoogle(13.74, 100.54, 2000);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accumulates spend across calls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeGoogleResponse([GOOGLE_PLACE("a")])));
    await queryGoogle(13.74, 100.54, 2000);
    expect(_getDailySpend()).toBeCloseTo(0.032, 3);
    await queryGoogle(13.74, 100.54, 2000);
    expect(_getDailySpend()).toBeCloseTo(0.064, 3);
  });

  it("emits console.warn at 80% of budget", async () => {
    vi.stubEnv("GOOGLE_DAILY_BUDGET_USD", "0.04"); // one search = 80%
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeGoogleResponse([GOOGLE_PLACE("w")])));
    await queryGoogle(13.74, 100.54, 2000);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("budget"));
  });
});

describe("queryGoogle — photo enrichment limit", () => {
  it("enriches photos up to PHOTO_ENRICH_LIMIT then stops", async () => {
    vi.stubEnv("PHOTO_ENRICH_LIMIT", "2");
    const places = [
      GOOGLE_PLACE("p1", "ref1"),
      GOOGLE_PLACE("p2", "ref2"),
      GOOGLE_PLACE("p3", "ref3"), // over limit
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeGoogleResponse(places)));
    const result = await queryGoogle(13.74, 100.54, 2000);
    const withPhotos = result.filter((r) => r.photos && r.photos.length > 0);
    expect(withPhotos).toHaveLength(2);
    expect(result[2].photos).toEqual([]);
  });

  it("returns no photos when limit is 0", async () => {
    vi.stubEnv("PHOTO_ENRICH_LIMIT", "0");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeGoogleResponse([GOOGLE_PLACE("q1", "ref1")])),
    );
    const result = await queryGoogle(13.74, 100.54, 2000);
    expect(result[0].photos).toEqual([]);
  });
});

describe("queryGoogle — parsing", () => {
  it("returns [] on non-OK status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "REQUEST_DENIED", results: [] }),
      }),
    );
    const result = await queryGoogle(13.74, 100.54, 2000);
    expect(result).toEqual([]);
  });

  it("returns [] on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const result = await queryGoogle(13.74, 100.54, 2000);
    expect(result).toEqual([]);
  });

  it("maps results to NormalizedPlace with correct fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeGoogleResponse([GOOGLE_PLACE("abc")])),
    );
    const result = await queryGoogle(13.74, 100.54, 2000);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "google:abc",
      name: "Place abc",
      lat: 13.74,
      lng: 100.54,
      address: "Bangkok",
      category: "Restaurant",
      rating: "4.2",
      priceLevel: 2,
      source: "google",
      isFallback: true,
    });
  });
});
