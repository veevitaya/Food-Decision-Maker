import { CONFIG } from "../config.js";
import { Place, SearchParams } from "../types.js";

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export class OverpassProvider {
  private buildQuery({ lat, lon, radius, query }: SearchParams): string {
    const nameFilter =
      query && query !== "restaurant"
        ? `["name"~"${this.escape(query)}",i]`
        : "";
    return `
[out:json][timeout:30];
(
  node["amenity"="restaurant"${nameFilter}](around:${radius},${lat},${lon});
  way["amenity"="restaurant"${nameFilter}](around:${radius},${lat},${lon});
  relation["amenity"="restaurant"${nameFilter}](around:${radius},${lat},${lon});
);
out center tags;
`;
  }

  async search(params: SearchParams): Promise<Place[]> {
    const body = this.buildQuery(params);
    const response = await fetch(CONFIG.overpassEndpoint, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) {
      throw new Error(
        `Overpass error ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as { elements: OverpassElement[] };
    const elements = json.elements || [];
    console.log(
      "[overpass] endpoint",
      CONFIG.overpassEndpoint,
      "elements",
      elements.length
    );
    return elements.map((el) => this.normalize(el));
  }

  private normalize(el: OverpassElement): Place {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) {
      throw new Error("Overpass element missing coordinates");
    }

    const cuisines =
      tags.cuisine?.split(";").map((c) => c.trim()).filter(Boolean) || [];

    const address = [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:city"],
      tags["addr:postcode"],
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: `osm:${el.type}-${el.id}`,
      source: "osm",
      lat,
      lon,
      name: tags.name || "Unnamed restaurant",
      address: address || undefined,
      phone: tags.phone || tags["contact:phone"],
      website: tags.website || tags["contact:website"],
      cuisine: cuisines.length ? cuisines : undefined,
      openingHours: tags.opening_hours,
      tags,
      updatedAt: tags["source:date"] || undefined,
      freshnessScore: tags["source:date"] ? 0.9 : 0.6,
    };
  }

  private escape(text: string): string {
    return text.replace(/"/g, '\\"');
  }
}
