import type { NormalizedPlace } from "../types.js";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const TIMEOUT_MS = 30_000;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function toCategory(tags: Record<string, string>): string {
  if (tags.cuisine) return tags.cuisine.replace(/_/g, " ");
  if (tags.amenity === "cafe") return "Cafe";
  if (tags.amenity === "bar") return "Bar";
  if (tags.amenity === "fast_food") return "Fast Food";
  return "Restaurant";
}

function toAddress(tags: Record<string, string>): string {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"] ?? tags["addr:city"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : (tags["addr:full"] ?? "");
}

function toRating(tags: Record<string, string>): string | undefined {
  // OSM doesn't have ratings — return undefined so Google enrichment can fill in
  return undefined;
}

export async function queryOverpass(
  lat: number,
  lng: number,
  radius: number,
): Promise<NormalizedPlace[]> {
  const query = `
    [out:json][timeout:30];
    (
      node["amenity"~"restaurant|cafe|bar|fast_food"](around:${radius},${lat},${lng});
      way["amenity"~"restaurant|cafe|bar|fast_food"](around:${radius},${lat},${lng});
    );
    out center tags;
  `;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => String(res.status));
      throw new Error(`Overpass returned ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as { elements: OverpassElement[]; remark?: string };
    if (json.remark?.includes("runtime error") || json.remark?.includes("rate_limited")) {
      throw new Error(`Overpass error: ${json.remark}`);
    }
    const elements: OverpassElement[] = json.elements ?? [];

    return elements
      .filter((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const name = el.tags?.name;
        return lat != null && lon != null && name;
      })
      .map((el): NormalizedPlace => {
        const elLat = (el.lat ?? el.center!.lat)!;
        const elLon = (el.lon ?? el.center!.lon)!;
        const tags = el.tags ?? {};
        return {
          id: `osm:${el.type}:${el.id}`,
          name: tags.name!,
          lat: elLat,
          lng: elLon,
          address: toAddress(tags),
          category: toCategory(tags),
          rating: toRating(tags),
          phone: tags.phone ?? tags["contact:phone"],
          source: "osm",
          distanceMeters: haversine(lat, lng, elLat, elLon),
        };
      });
  } catch (err) {
    throw err; // callers decide: placesService catches+falls back, admin import surfaces the error
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
