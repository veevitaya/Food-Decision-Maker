import type { NormalizedPlace } from "../types.js";
import { getKey } from "../../../lib/apiKeyStore.js";

const PLACES_NEARBY_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo";

const getPhotoEnrichLimit = () => Number(process.env.PHOTO_ENRICH_LIMIT ?? 20);
const getDailyBudget = () => Number(process.env.GOOGLE_DAILY_BUDGET_USD ?? 5.0);

// Cost per call in USD (approximate Google Places pricing)
const COST_NEARBY_SEARCH = 0.032;
const COST_PHOTO = 0.007;

// Module-level daily counters — reset at midnight
let dailySpend = 0;
let dailyPhotoCount = 0;
let lastResetDay = new Date().toDateString();

function resetIfNewDay() {
  const today = new Date().toDateString();
  if (today !== lastResetDay) {
    dailySpend = 0;
    dailyPhotoCount = 0;
    lastResetDay = today;
  }
}

function budgetExceeded(): boolean {
  resetIfNewDay();
  return dailySpend >= getDailyBudget();
}

function photoLimitReached(): boolean {
  return dailyPhotoCount >= getPhotoEnrichLimit();
}

interface GooglePlace {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  vicinity?: string;
  types?: string[];
  rating?: number;
  price_level?: number;
  photos?: { photo_reference: string }[];
}

function toCategory(types: string[]): string {
  if (types.includes("restaurant")) return "Restaurant";
  if (types.includes("cafe")) return "Cafe";
  if (types.includes("bar")) return "Bar";
  if (types.includes("meal_takeaway")) return "Fast Food";
  return "Restaurant";
}

export async function queryGoogle(
  lat: number,
  lng: number,
  radius: number,
): Promise<NormalizedPlace[]> {
  const apiKey = getKey("google_places");
  if (!apiKey) return []; // No key configured — skip silently

  if (budgetExceeded()) {
    console.warn("[google] Daily budget exceeded — skipping Google Places call");
    return [];
  }

  const url = new URL(PLACES_NEARBY_URL);
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", "restaurant");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];

    dailySpend += COST_NEARBY_SEARCH;
    if (dailySpend / getDailyBudget() >= 0.8) {
      console.warn(`[google] Daily spend at ${((dailySpend / getDailyBudget()) * 100).toFixed(0)}% of budget`);
    }

    const json = (await res.json()) as { results: GooglePlace[]; status: string };
    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") return [];

    const results = json.results ?? [];

    return results.map((p): NormalizedPlace => {
      const photos = enrichPhotos(p, apiKey);
      return {
        id: `google:${p.place_id}`,
        name: p.name,
        lat: p.geometry.location.lat,
        lng: p.geometry.location.lng,
        address: p.vicinity ?? "",
        category: toCategory(p.types ?? []),
        rating: p.rating != null ? String(p.rating) : undefined,
        priceLevel: p.price_level,
        photos,
        source: "google",
        isFallback: true,
      };
    });
  } catch {
    return [];
  }
}

/** Reset daily counters — for testing only */
export function _resetForTest(): void {
  dailySpend = 0;
  dailyPhotoCount = 0;
  lastResetDay = new Date().toDateString();
}

export function _getDailySpend(): number {
  return dailySpend;
}

function enrichPhotos(place: GooglePlace, apiKey: string): string[] {
  if (!place.photos?.length || photoLimitReached()) return [];
  const ref = place.photos[0].photo_reference;
  dailyPhotoCount += 1;
  dailySpend += COST_PHOTO;
  const url = new URL(PHOTO_URL);
  url.searchParams.set("maxwidth", "400");
  url.searchParams.set("photo_reference", ref);
  url.searchParams.set("key", apiKey);
  return [url.toString()];
}
