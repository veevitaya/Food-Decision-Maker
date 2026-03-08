import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryOverpass } from "../../apps/api/services/places/providers/overpass";

const VALID_RESPONSE = {
  elements: [
    {
      type: "node",
      id: 111,
      lat: 13.741,
      lon: 100.541,
      tags: { name: "Somtam Cafe", amenity: "restaurant", cuisine: "thai" },
    },
    {
      type: "way",
      id: 222,
      center: { lat: 13.742, lon: 100.542 },
      tags: { name: "Ramen House", amenity: "restaurant", cuisine: "japanese" },
    },
    // Missing name — should be filtered out
    {
      type: "node",
      id: 333,
      lat: 13.743,
      lon: 100.543,
      tags: { amenity: "restaurant" },
    },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("queryOverpass", () => {
  it("returns [] on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await queryOverpass(13.74, 100.54, 2000);
    expect(result).toEqual([]);
  });

  it("returns [] on non-200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: () => ({}) }),
    );
    const result = await queryOverpass(13.74, 100.54, 2000);
    expect(result).toEqual([]);
  });

  it("returns [] on timeout (AbortError)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })),
    );
    const result = await queryOverpass(13.74, 100.54, 2000);
    expect(result).toEqual([]);
  });

  it("parses valid Overpass response into NormalizedPlace[]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(VALID_RESPONSE),
      }),
    );
    const result = await queryOverpass(13.74, 100.54, 2000);
    // Only 2 valid places (id 111 and 222); id 333 has no name
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Somtam Cafe");
    expect(result[0].source).toBe("osm");
    expect(result[0].category).toBe("thai");
    expect(result[1].name).toBe("Ramen House");
    expect(result[1].lat).toBe(13.742);
    expect(result[1].lng).toBe(100.542);
  });

  it("uses way center coordinates when lat/lon are absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            elements: [
              {
                type: "way",
                id: 999,
                center: { lat: 13.75, lon: 100.55 },
                tags: { name: "Way Restaurant", amenity: "restaurant" },
              },
            ],
          }),
      }),
    );
    const result = await queryOverpass(13.74, 100.54, 2000);
    expect(result[0].lat).toBe(13.75);
    expect(result[0].lng).toBe(100.55);
  });

  it("computes distanceMeters from query origin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            elements: [
              {
                type: "node",
                id: 1,
                lat: 13.74,
                lon: 100.54,
                tags: { name: "Right Here", amenity: "restaurant" },
              },
            ],
          }),
      }),
    );
    const result = await queryOverpass(13.74, 100.54, 2000);
    expect(result[0].distanceMeters).toBe(0);
  });
});
