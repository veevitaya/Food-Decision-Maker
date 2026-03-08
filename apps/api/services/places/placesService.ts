import type { NormalizedPlace, PlacesQuery, PlacesResult } from "./types.js";
import * as cache from "./cache/cacheRepo.js";
import { queryOverpass } from "./providers/overpass.js";
import { queryGoogle } from "./providers/google.js";

// Read at call-time so env vars can be changed in tests
const getProviderFallback = () => process.env.PROVIDER_FALLBACK ?? "osm-error-only";

/** Haversine distance in metres between two coordinates */
function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Deduplicate by normalised name + 100m proximity */
function dedupe(places: NormalizedPlace[]): NormalizedPlace[] {
  const seen: NormalizedPlace[] = [];
  for (const p of places) {
    const normName = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isDupe = seen.some(
      (s) =>
        s.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normName &&
        distanceM(s.lat, s.lng, p.lat, p.lng) < 100,
    );
    if (!isDupe) seen.push(p);
  }
  return seen;
}

/** Merge OSM + Google results: prefer OSM base data, fill missing fields from Google */
function merge(osmPlaces: NormalizedPlace[], googlePlaces: NormalizedPlace[]): NormalizedPlace[] {
  const merged = [...osmPlaces];
  for (const gp of googlePlaces) {
    const normName = gp.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = merged.find(
      (op) =>
        op.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normName &&
        distanceM(op.lat, op.lng, gp.lat, gp.lng) < 100,
    );
    if (match) {
      // Enrich OSM entry with Google data where missing
      if (!match.rating && gp.rating) match.rating = gp.rating;
      if (!match.priceLevel && gp.priceLevel) match.priceLevel = gp.priceLevel;
      if (!match.photos?.length && gp.photos?.length) match.photos = gp.photos;
      if (!match.phone && gp.phone) match.phone = gp.phone;
      match.source = "mixed";
    } else {
      merged.push(gp);
    }
  }
  return merged;
}

export async function query(params: PlacesQuery): Promise<PlacesResult> {
  const { lat, lng, radius = 2000, query: q = "restaurant", forceRefresh, sourcePreference } = params;
  const cacheKey = cache.buildKey(lat, lng, radius, q);

  // 1. Cache hit — return immediately
  if (!forceRefresh && cache.isFreshAndSufficient(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    return { data: entry.data, source: "cache", fromCache: true, isFallback: false };
  }

  // 2. Stale-while-refresh — return stale data, refresh in background
  const staleEntry = cache.get(cacheKey);
  if (!forceRefresh && staleEntry && !cache.isFreshAndSufficient(cacheKey)) {
    // kick off background refresh (non-blocking)
    refreshInBackground(params, cacheKey);
    return { data: staleEntry.data, source: "cache", fromCache: true, isFallback: false };
  }

  // 3. Full fetch
  return fetchAndCache(params, cacheKey);
}

async function fetchAndCache(params: PlacesQuery, cacheKey: string): Promise<PlacesResult> {
  const { lat, lng, radius = 2000, sourcePreference } = params;

  let osmPlaces: NormalizedPlace[] = [];
  let googlePlaces: NormalizedPlace[] = [];
  let isFallback = false;

  const providerFallback = getProviderFallback();

  if (sourcePreference === "google-first") {
    googlePlaces = await queryGoogle(lat, lng, radius);
    if (googlePlaces.length === 0 && providerFallback !== "none") {
      try {
        osmPlaces = await queryOverpass(lat, lng, radius);
      } catch {
        osmPlaces = [];
      }
    }
  } else {
    // osm-first (default) or hybrid
    try {
      osmPlaces = await queryOverpass(lat, lng, radius);
    } catch {
      osmPlaces = [];
    }

    const shouldFallback =
      providerFallback !== "none" &&
      (osmPlaces.length === 0 || sourcePreference === "hybrid");

    if (shouldFallback) {
      googlePlaces = await queryGoogle(lat, lng, radius);
      isFallback = osmPlaces.length === 0;
    }
  }

  let combined: NormalizedPlace[];
  let source: PlacesResult["source"];

  if (osmPlaces.length > 0 && googlePlaces.length > 0) {
    combined = dedupe(merge(osmPlaces, googlePlaces));
    source = "mixed";
  } else if (googlePlaces.length > 0) {
    combined = dedupe(googlePlaces);
    source = "google";
  } else {
    combined = dedupe(osmPlaces);
    source = "osm";
  }

  // Sort by distance
  combined.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

  cache.set(cacheKey, combined);

  return { data: combined, source, fromCache: false, isFallback };
}

function refreshInBackground(params: PlacesQuery, cacheKey: string): void {
  fetchAndCache(params, cacheKey).catch((err) => {
    console.error("[placesService] background refresh failed:", err);
  });
}
