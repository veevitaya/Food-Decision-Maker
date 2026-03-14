import type { NormalizedPlace, PlacesQuery, PlacesResult } from "./types.js";
import * as cache from "./cache/cacheRepo.js";
import { queryOverpass } from "./providers/overpass.js";
import { queryGoogle } from "./providers/google.js";
import { storage } from "../../storage.js";
import type { Restaurant } from "@shared/schema";

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

/** Convert a DB restaurant row to a NormalizedPlace for the cache layer. */
function restaurantToPlace(r: Restaurant, userLat: number, userLng: number): NormalizedPlace {
  const rLat = Number(r.lat);
  const rLng = Number(r.lng);
  return {
    id: String(r.id),
    name: r.name,
    lat: rLat,
    lng: rLng,
    address: r.address ?? "",
    category: r.category ?? "restaurant",
    rating: r.rating ?? undefined,
    priceLevel: r.priceLevel ?? undefined,
    photos: r.imageUrl ? [r.imageUrl] : [],
    phone: r.phone ?? undefined,
    source: "cache",
    distanceMeters: distanceM(userLat, userLng, rLat, rLng),
  };
}

export async function query(params: PlacesQuery): Promise<PlacesResult> {
  const { lat, lng, radius = 2000, query: q = "restaurant", forceRefresh, sourcePreference } = params;
  const cacheKey = cache.buildKey(lat, lng, radius, q);

  // ── L1: In-memory cache ───────────────────────────────────────────────────
  if (!forceRefresh && cache.isFreshAndSufficient(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    return { data: entry.data, source: "cache", fromCache: true, isFallback: false };
  }

  // Stale-while-refresh — return stale data immediately, refresh in background
  const staleEntry = cache.get(cacheKey);
  if (!forceRefresh && staleEntry && !cache.isFreshAndSufficient(cacheKey)) {
    refreshInBackground(params, cacheKey);
    return { data: staleEntry.data, source: "cache", fromCache: true, isFallback: false };
  }

  // ── L2: DB tile cache ─────────────────────────────────────────────────────
  // Check if this ~1km grid tile has already been fetched from external APIs.
  // This survives server restarts and prevents duplicate API calls for nearby locations.
  if (!forceRefresh) {
    try {
      const tileKey = cache.buildTileKey(lat, lng, radius, q);
      // A tile that exists is always valid — once fetched, DB data is the source of truth forever.
      // Use forceRefresh: true to explicitly re-fetch an area from the external APIs.
      const tile = await storage.getPlacesTile(tileKey);

      if (tile) {
        const dbRestaurants = await storage.findRestaurantsNear(lat, lng, radius);
        if (dbRestaurants.length >= cache.getMinResults()) {
          const places = dbRestaurants
            .map((r) => restaurantToPlace(r, lat, lng))
            .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

          // Warm L1 so the next request within this server lifecycle is instant
          cache.set(cacheKey, places);
          return { data: places, source: "cache", fromCache: true, isFallback: false };
        }
      }
    } catch (err) {
      // DB unavailable — fall through to external API (graceful degradation)
      console.warn("[placesService] L2 tile check failed, falling through to API:", err);
    }
  }

  // ── L3: External API fetch ────────────────────────────────────────────────
  return fetchAndCache(params, cacheKey);
}

async function fetchAndCache(params: PlacesQuery, cacheKey: string): Promise<PlacesResult> {
  const { lat, lng, radius = 2000, query: q = "restaurant", sourcePreference } = params;
  const preference = sourcePreference ?? "hybrid";

  let osmPlaces: NormalizedPlace[] = [];
  let googlePlaces: NormalizedPlace[] = [];
  let isFallback = false;

  const providerFallback = getProviderFallback();

  if (preference === "google-first") {
    googlePlaces = await queryGoogle(lat, lng, radius);
    if (googlePlaces.length === 0 && providerFallback !== "none") {
      try {
        osmPlaces = await queryOverpass(lat, lng, radius);
      } catch {
        osmPlaces = [];
      }
    }
  } else {
    // osm-first or hybrid (default)
    try {
      osmPlaces = await queryOverpass(lat, lng, radius);
    } catch {
      osmPlaces = [];
    }

    const shouldFallback =
      providerFallback !== "none" &&
      (osmPlaces.length === 0 || preference === "hybrid");

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

  // Write to L1 memory cache
  cache.set(cacheKey, combined);

  // Write to L2 DB tile tracker (async, non-blocking — don't delay the response)
  const tileKey = cache.buildTileKey(lat, lng, radius, q);
  storage.upsertPlacesTile(tileKey, combined.length, source).catch((err) => {
    console.warn("[placesService] Failed to write places tile:", err);
  });

  return { data: combined, source, fromCache: false, isFallback };
}

function refreshInBackground(params: PlacesQuery, cacheKey: string): void {
  fetchAndCache(params, cacheKey).catch((err) => {
    console.error("[placesService] background refresh failed:", err);
  });
}
