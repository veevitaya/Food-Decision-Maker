import type { NormalizedPlace, PlacesQuery, PlacesResult } from "./types.js";
import * as cache from "./cache/cacheRepo.js";
import { queryGoogle } from "./providers/google.js";
import { storage } from "../../storage.js";
import type { Restaurant } from "@shared/schema";

const SEED_FULL_DATA_THRESHOLD = 30;

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
    source: "google",
    distanceMeters: distanceM(userLat, userLng, rLat, rLng),
  };
}

export async function query(params: PlacesQuery): Promise<PlacesResult> {
  const { lat, lng, radius = 2000, query: q = "restaurant", forceRefresh } = params;
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
  // Require 30 restaurants with full data (photos + rating + hours).
  // Once seeded, the area is served from DB forever — zero external API calls.
  if (!forceRefresh) {
    try {
      const tileKey = cache.buildTileKey(lat, lng, radius, q);
      const tile = await storage.getPlacesTile(tileKey);

      if (tile) {
        const fullCount = await storage.countFullDataRestaurantsNear(lat, lng, radius);
        if (fullCount >= SEED_FULL_DATA_THRESHOLD) {
          const dbRestaurants = await storage.findRestaurantsNear(lat, lng, radius);
          const places = dbRestaurants
            .map((r) => restaurantToPlace(r, lat, lng))
            .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

          cache.set(cacheKey, places);
          return { data: places, source: "cache", fromCache: true, isFallback: false };
        }
      }
    } catch (err) {
      console.warn("[placesService] L2 tile check failed, falling through to API:", err);
    }
  }

  // ── L3: Google Places API ─────────────────────────────────────────────────
  return fetchAndCache(params, cacheKey);
}

async function fetchAndCache(params: PlacesQuery, cacheKey: string): Promise<PlacesResult> {
  const { lat, lng, radius = 2000, query: q = "restaurant" } = params;

  const googlePlaces = await queryGoogle(lat, lng, radius);
  const combined = dedupe(googlePlaces);
  combined.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

  cache.set(cacheKey, combined);

  const tileKey = cache.buildTileKey(lat, lng, radius, q);
  storage.upsertPlacesTile(tileKey, combined.length, "google").catch((err) => {
    console.warn("[placesService] Failed to write places tile:", err);
  });

  return { data: combined, source: "google", fromCache: false, isFallback: false };
}

function refreshInBackground(params: PlacesQuery, cacheKey: string): void {
  fetchAndCache(params, cacheKey).catch((err) => {
    console.error("[placesService] background refresh failed:", err);
  });
}
