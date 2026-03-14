import type { NormalizedPlace } from "../types.js";
import { getKey } from "../../../lib/apiKeyStore.js";

const PLACES_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const PHOTO_BASE_URL    = "https://places.googleapis.com/v1";

const getPhotoEnrichLimit = () => Number(process.env.PHOTO_ENRICH_LIMIT ?? 20);
const getDailyBudget = () => Number(process.env.GOOGLE_DAILY_BUDGET_USD ?? 5.0);

// Cost per call in USD — Advanced SKU (photos/reviews in FieldMask)
const COST_NEARBY_SEARCH = 0.035;
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

// Places API (New) response shape
interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  shortFormattedAddress?: string;
  types?: string[];
  rating?: number;
  priceLevel?: string; // enum string e.g. "PRICE_LEVEL_MODERATE"
  photos?: { name: string }[];
}

function parsePriceLevel(priceLevel?: string): number | undefined {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
    case "PRICE_LEVEL_INEXPENSIVE":    return 1;
    case "PRICE_LEVEL_MODERATE":       return 2;
    case "PRICE_LEVEL_EXPENSIVE":      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE": return 4;
    default:                           return undefined;
  }
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

  try {
    const res = await fetch(PLACES_NEARBY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.shortFormattedAddress,places.rating,places.priceLevel,places.photos,places.types",
      },
      body: JSON.stringify({
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radiusMeters: radius } },
        includedTypes: ["restaurant"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
      }),
    });

    if (!res.ok) return [];

    dailySpend += COST_NEARBY_SEARCH;
    if (dailySpend / getDailyBudget() >= 0.8) {
      console.warn(`[google] Daily spend at ${((dailySpend / getDailyBudget()) * 100).toFixed(0)}% of budget`);
    }

    const json = (await res.json()) as { places?: GooglePlace[]; error?: { message?: string } };
    if (json.error) {
      console.warn("[google] Places API (New) error:", json.error.message);
      return [];
    }

    const results = json.places ?? [];

    return results.map((p): NormalizedPlace => {
      const photos = enrichPhotos(p, apiKey);
      return {
        id: `google:${p.id}`,
        name: p.displayName?.text ?? "",
        lat: p.location?.latitude ?? 0,
        lng: p.location?.longitude ?? 0,
        address: p.shortFormattedAddress ?? "",
        category: toCategory(p.types ?? []),
        rating: p.rating != null ? String(p.rating) : undefined,
        priceLevel: parsePriceLevel(p.priceLevel),
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
  const photoName = place.photos[0].name; // e.g. "places/ChIJ.../photos/AUc7tXx"
  dailyPhotoCount += 1;
  dailySpend += COST_PHOTO;
  return [`${PHOTO_BASE_URL}/${photoName}/media?maxWidthPx=400&key=${encodeURIComponent(apiKey)}`];
}
