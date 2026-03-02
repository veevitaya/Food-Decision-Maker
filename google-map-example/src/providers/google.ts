import { Place, SearchParams } from "../types.js";
import { CONFIG } from "../config.js";

/**
 * Lightweight Google Places Text Search + Details fallback.
 * Called only when Overpass returnsว่างเปล่า และเปิด PROVIDER_FALLBACK=google
 */
export class GooglePlacesProvider {
  private readonly base = "https://maps.googleapis.com/maps/api/place";

  private ensureKey() {
    if (!CONFIG.googleApiKey) {
      throw new Error("Google API key not provided");
    }
  }

  /**
   * Get only photo URLs for a given place name near a coordinate (for OSM enrichment).
   */
  async findPhoto(
    name: string,
    lat: number,
    lon: number
  ): Promise<string[] | undefined> {
    this.ensureKey();
    const url = `${this.base}/textsearch/json?query=${encodeURIComponent(
      name
    )}&location=${lat},${lon}&radius=150&key=${CONFIG.googleApiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[google photo] http error", res.status, res.statusText);
      return undefined;
    }
    const json = await res.json();
    if (!json.results || !json.results.length) {
      console.log("[google photo] no results for", name);
      return undefined;
    }
    const first = json.results?.[0];
    if (!first?.photos) return undefined;
    console.log(
      "[google photo] found",
      first.photos.length,
      "photos for",
      first.name || name
    );
    return this.extractPhotos(first.photos);
  }

  async search(params: SearchParams): Promise<Place[]> {
    this.ensureKey();
    const { lat, lon, radius, query } = params;
    const url = `${this.base}/textsearch/json?query=${encodeURIComponent(
      query || "restaurant"
    )}&location=${lat},${lon}&radius=${radius}&key=${CONFIG.googleApiKey}`;
    console.log("[google] text search", { lat, lon, radius, query, url });
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[google] text search http error", res.status, res.statusText);
      throw new Error(`Google Places error ${res.status}`);
    }
    const json = await res.json();
    if (!json.results) {
      console.warn("[google] text search empty results");
    } else {
      console.log("[google] text search results", json.results.length);
    }
    const places: Place[] = (json.results || []).map((r: any) => ({
      id: `google:${r.place_id}`,
      source: "google" as const,
      lat: r.geometry?.location?.lat,
      lon: r.geometry?.location?.lng,
      name: r.name,
      address: r.formatted_address,
      phone: undefined,
      website: undefined,
      cuisine: undefined,
      openingHours: r.opening_hours?.weekday_text?.join(" | "),
      tags: { types: (r.types || []).join(",") },
      freshnessScore: 0.8,
      photos: this.extractPhotos(r.photos),
    }));

    // Optionally enrich first N results with Details for phone/website
    const withDetails = await Promise.all(
      places.slice(0, 5).map((p) => this.enrichDetails(p))
    );
    return withDetails;
  }

  private async enrichDetails(place: Place): Promise<Place> {
    this.ensureKey();
    const placeId = place.id.replace("google:", "");
    const url = `${this.base}/details/json?place_id=${placeId}&fields=formatted_phone_number,website,photos&key=${CONFIG.googleApiKey}`;
    try {
      console.log("[google] details", placeId);
      const res = await fetch(url);
      if (!res.ok) return place;
      const json = await res.json();
      const result = json.result;
      if (!result) return place;
      return {
        ...place,
        phone: result.formatted_phone_number || place.phone,
        website: result.website || place.website,
        photos: place.photos?.length
          ? place.photos
          : this.extractPhotos(result.photos) || place.photos,
      };
    } catch {
      return place;
    }
  }

  private extractPhotos(photos: any[] | undefined): string[] | undefined {
    if (!photos || !photos.length) return undefined;
    const list = photos.slice(0, 3).map((p) => {
      const ref = p.photo_reference;
      if (!ref) return null;
      return `${this.base}/photo?maxwidth=800&photo_reference=${ref}&key=${CONFIG.googleApiKey}`;
    });
    return list.filter(Boolean) as string[];
  }
}
