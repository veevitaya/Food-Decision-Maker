/**
 * Trending feed builder.
 *
 * Pipeline:
 *  1. Fetch Google Trends daily RSS for Thailand (free, no API key)
 *  2. Filter keywords that look food-related
 *  3. For each keyword, run a Google Places Text Search to find nearby restaurants
 *  4. Deduplicate + rank by rating × review count
 *  5. Return array of TrendingPost objects ready for the frontend
 */
import { getKey } from "../../lib/apiKeyStore.js";

const TRENDS_RSS_URL =
  "https://trends.google.com/trends/trendingsearches/daily/rss?geo=TH";

const PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

const PHOTO_BASE_URL = "https://places.googleapis.com/v1";

// Cost of Text Search (Basic) — $0.017 per call
const COST_TEXT_SEARCH = 0.017;

// Max API spend this invocation
const MAX_SPEND = Number(process.env.TRENDING_BUDGET_USD ?? 1.0);

export interface TrendingPost {
  id: number;
  restaurantId: number;
  restaurantName: string;
  category: string;
  description: string;
  rating: string;
  priceLevel: number;
  address: string;
  distance: string;
  mediaItems: { type: "image" | "video"; url: string; poster?: string }[];
  tags: string[];
  trendingRank: number;
  reviewCount: number;
  isNew: boolean;
}

// ── RSS helpers ───────────────────────────────────────────────────────────────

const FOOD_KEYWORDS_EN = [
  "restaurant", "food", "cafe", "coffee", "bar", "eat", "dining",
  "ร้าน", "อาหาร", "กาแฟ", "ข้าว", "ก๋วยเตี๋ยว", "หมู", "ไก่", "กุ้ง",
  "ปลา", "ผัด", "ต้ม", "ทอด", "สุกี้", "ชาบู", "บุฟเฟ่",
];

function isFoodRelated(text: string): boolean {
  const lower = text.toLowerCase();
  return FOOD_KEYWORDS_EN.some((kw) => lower.includes(kw));
}

async function fetchTrendingKeywords(): Promise<string[]> {
  try {
    const res = await fetch(TRENDS_RSS_URL, {
      headers: { "User-Agent": "ToastApp/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    // Extract <title> tags inside <item> blocks
    const matches = [...xml.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
    const titles = matches.map((m) => m[1]?.trim()).filter(Boolean) as string[];
    return titles.filter(isFoodRelated).slice(0, 10);
  } catch {
    return [];
  }
}

// ── Places Text Search ────────────────────────────────────────────────────────

interface PlacesTextResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string; // "PRICE_LEVEL_INEXPENSIVE" etc.
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
  photos?: { name: string }[];
  regularOpeningHours?: { openNow?: boolean };
}

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

async function searchPlacesByText(
  query: string,
  apiKey: string,
): Promise<PlacesTextResult[]> {
  const body = {
    textQuery: `${query} restaurant Bangkok`,
    languageCode: "en",
    maxResultCount: 5,
    locationBias: {
      circle: {
        center: { latitude: 13.7563, longitude: 100.5018 }, // Bangkok center
        radius: 30000,
      },
    },
  };

  const res = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.primaryTypeDisplayName,places.editorialSummary,places.photos",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    console.warn(`[trending] Places text search failed (${res.status}) for "${query}"`);
    return [];
  }

  const data = (await res.json()) as { places?: PlacesTextResult[] };
  return data.places ?? [];
}

function buildPhotoUrl(photoName: string, apiKey: string): string {
  return `${PHOTO_BASE_URL}/${photoName}/media?maxWidthPx=800&key=${apiKey}`;
}

// ── Post assembly ─────────────────────────────────────────────────────────────

let idCounter = 1;

function placeToPost(
  place: PlacesTextResult,
  rank: number,
  tag: string,
  apiKey: string,
): TrendingPost {
  const photos = (place.photos ?? []).slice(0, 3).map((p) => ({
    type: "image" as const,
    url: buildPhotoUrl(p.name, apiKey),
  }));

  // Fall back to a generic food image if no photos
  if (photos.length === 0) {
    photos.push({
      type: "image",
      url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    });
  }

  return {
    id: idCounter++,
    restaurantId: 0, // no local DB id for Places-sourced results
    restaurantName: place.displayName?.text ?? "Unknown",
    category: place.primaryTypeDisplayName?.text ?? "Restaurant",
    description: place.editorialSummary?.text ?? "",
    rating: place.rating ? place.rating.toFixed(1) : "—",
    priceLevel: PRICE_MAP[place.priceLevel ?? ""] ?? 2,
    address: place.formattedAddress ?? "",
    distance: "",
    mediaItems: photos,
    tags: [tag, rank === 1 ? "#1 Trending" : `#${rank} Trending`],
    trendingRank: rank,
    reviewCount: place.userRatingCount ?? 0,
    isNew: false,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds a fresh trending feed. Returns an empty array if the Google Places
 * API key is missing or budget is exceeded.
 */
export async function buildTrendingFeed(): Promise<TrendingPost[]> {
  idCounter = 1;

  const apiKey = getKey("google_places") ?? null;
  if (!apiKey) {
    console.warn("[trending] google_places API key not configured — skipping build");
    return [];
  }

  const keywords = await fetchTrendingKeywords();
  console.log(`[trending] ${keywords.length} food-related trending keywords: ${keywords.join(", ") || "(none)"}`);

  // If no food keywords in today's trends, fall back to generic Bangkok dining searches
  const queries =
    keywords.length > 0 ? keywords : ["top restaurant Bangkok", "must try food Bangkok"];

  let spend = 0;
  const seen = new Set<string>();
  const posts: TrendingPost[] = [];
  let rank = 1;

  for (const query of queries) {
    if (spend + COST_TEXT_SEARCH > MAX_SPEND) {
      console.log("[trending] budget limit reached, stopping");
      break;
    }

    const results = await searchPlacesByText(query, apiKey);
    spend += COST_TEXT_SEARCH;

    for (const place of results) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);

      // Only include places with a reasonable rating
      if ((place.rating ?? 0) < 3.5) continue;

      const tag = query.split(" ")[0] ?? "Trending";
      posts.push(placeToPost(place, rank++, tag, apiKey));
    }
  }

  // Sort by rating × log(reviewCount) — higher quality floats up
  posts.sort((a, b) => {
    const scoreA = parseFloat(a.rating) * Math.log1p(a.reviewCount);
    const scoreB = parseFloat(b.rating) * Math.log1p(b.reviewCount);
    return scoreB - scoreA;
  });

  // Re-assign trendingRank after sort
  posts.forEach((p, i) => {
    p.trendingRank = i + 1;
  });

  console.log(`[trending] built ${posts.length} posts (spent ~$${spend.toFixed(3)})`);
  return posts.slice(0, 20);
}
