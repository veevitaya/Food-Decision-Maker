import { CONFIG } from "../config.js";

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

export class NominatimProvider {
  private readonly base = "https://nominatim.openstreetmap.org";

  async geocode(query: string): Promise<GeocodeResult[]> {
    const url = `${this.base}/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=5`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "googlemap-low-cost/1.0",
        "Accept-Language": "th-TH,th;q=0.9,en;q=0.6",
      },
    });
    if (!res.ok) throw new Error("Nominatim geocode failed");
    const json = (await res.json()) as any[];
    return json.map((item) => ({
      lat: Number(item.lat),
      lon: Number(item.lon),
      displayName: item.display_name,
    }));
  }

  async reverse(lat: number, lon: number): Promise<GeocodeResult | null> {
    const url = `${this.base}/reverse?lat=${lat}&lon=${lon}&format=json`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "googlemap-low-cost/1.0",
        "Accept-Language": "th-TH,th;q=0.9,en;q=0.6",
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    return {
      lat,
      lon,
      displayName: json.display_name,
    };
  }
}
