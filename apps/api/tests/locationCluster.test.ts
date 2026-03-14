import { beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocodeDistrict } from "../lib/locationCluster";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("reverseGeocodeDistrict", () => {
  it("extracts district-like fields from nominatim response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ address: { city_district: "Watthana" } }),
      }),
    );

    const district = await reverseGeocodeDistrict(13.7367, 100.5689);
    expect(district).toBe("Watthana");
  });

  it("uses in-memory cache for nearby repeated lookups", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ address: { suburb: "Sukhumvit" } }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const first = await reverseGeocodeDistrict(13.74661, 100.57891);
    const second = await reverseGeocodeDistrict(13.74662, 100.57892); // same rounded cache bucket

    expect(first).toBe("Sukhumvit");
    expect(second).toBe("Sukhumvit");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
