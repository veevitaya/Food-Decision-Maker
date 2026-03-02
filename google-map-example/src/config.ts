import { BoundingBoxPrefetch } from "./types.js";
import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseTtl = (value: string | undefined, fallbackMs: number): number => {
  if (!value) return fallbackMs;
  const lower = value.toLowerCase();
  if (lower === "never" || lower === "infinite" || lower === "none") {
    return Number.MAX_SAFE_INTEGER; // effectively no expiry
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return fallbackMs;
  if (n <= 0) return Number.MAX_SAFE_INTEGER;
  return n;
};

const defaultPrefetch = [
  { lat: 13.7563, lon: 100.5018, radius: 2000, query: "restaurant" }, // Bangkok
  { lat: 18.7883, lon: 98.9853, radius: 2000, query: "restaurant" }, // Chiang Mai
  { lat: 7.9519, lon: 98.3381, radius: 2000, query: "restaurant" }, // Phuket
];

export const CONFIG = {
  port: toNumber(process.env.PORT, 4000),
  overpassEndpoint:
    process.env.OVERPASS_ENDPOINT ||
    "https://overpass-api.de/api/interpreter",
  providerFallback: ((process.env.PROVIDER_FALLBACK || "none").toLowerCase() ||
    "none") as
    | "google"
    | "none",
  googleApiKey: process.env.GOOGLE_PLACES_API_KEY,
  cacheTtlPlacesMs: parseTtl(
    process.env.CACHE_TTL_PLACES,
    7 * 24 * 60 * 60 * 1000
  ), // 7 days default; "never"/<=0 means effectively no expiry
  cacheTtlGeocodeMs: parseTtl(
    process.env.CACHE_TTL_GEOCODE,
    14 * 24 * 60 * 60 * 1000
  ), // 14 days default
  prefetchIntervalMs: toNumber(
    process.env.PREFETCH_INTERVAL_MS,
    12 * 60 * 60 * 1000
  ), // 12h
  prefetchBBoxes: (() => {
    try {
      const raw = process.env.PREFETCH_BBOXES;
      if (!raw) return defaultPrefetch as BoundingBoxPrefetch[];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => ({
          lat: Number(item.lat),
          lon: Number(item.lon),
          radius: Number(item.radius),
          query: item.query || "restaurant",
        }))
        .filter(
          (b) =>
            Number.isFinite(b.lat) &&
            Number.isFinite(b.lon) &&
            Number.isFinite(b.radius)
        );
    } catch {
      return defaultPrefetch as BoundingBoxPrefetch[];
    }
  })(),
  dbPath: process.env.DB_PATH || "data/app.db",
  googlePhotoEnrich:
    (process.env.GOOGLE_PHOTO_ENRICH || "true").toLowerCase() === "true",
  photoEnrichLimit: toNumber(process.env.PHOTO_ENRICH_LIMIT, 50),
  minResultsBeforeUsingCache: toNumber(
    process.env.MIN_RESULTS_BEFORE_CACHE,
    5
  ),
};
