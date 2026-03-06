# Toast App — Implementation Plan (Phase Gap Analysis)

Based on `Toast-app-full-implemetation.MD` spec vs current codebase state.

---

## Phase A — Contracts and Docs ✅ COMPLETE

All contract changes are in place:

- `shared/routes.ts` — new query fields (`radius`, `forceRefresh`, `sourcePreference`) and response metadata (`source`, `distanceMeters`, `photos`, `freshnessScore`, `isFallback`) are defined
- `client/src/hooks/use-restaurants.ts` — accepts full `RestaurantsQueryOptions` object including geo/radius
- `server/routes.ts` — passes all new query fields through to storage
- `server/storage.ts` — method signature accepts `radius`, `forceRefresh`, `sourcePreference`

---

## Phase B — Provider & Cache Service Layer ❌ NOT STARTED

The `server/services/` directory does not exist. This is the biggest missing piece — without it, all OSM/Google/cache logic is absent.

### Files to create

#### `server/services/places/types.ts`
Normalized internal place model shared across all providers:
```ts
export interface NormalizedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  category: string;
  rating?: string;
  priceLevel?: number;
  photos?: string[];
  source: "osm" | "google" | "cache" | "mixed";
  distanceMeters?: number;
  freshnessScore?: number;
  isFallback?: boolean;
}
```

#### `server/services/places/providers/overpass.ts`
- Query Overpass API (OSM) for restaurants near lat/lng/radius
- Parse OSM tags into `NormalizedPlace[]`
- Handle Overpass timeout/error gracefully (return empty array, do not throw)
- Rate: free, no API key required

#### `server/services/places/providers/google.ts`
- Query Google Places Nearby Search API
- Respect `PHOTO_ENRICH_LIMIT` env var — stop photo fetching after N enrichments
- Track spend estimate per call
- Only called when: OSM result is empty, OSM errors, or explicit `sourcePreference: "google-first"`

#### `server/services/places/cache/cacheRepo.ts`
Cache key format: `places:{lat5}:{lng5}:{radius}:{query}`
- `get(key)` — return cached result + TTL metadata
- `set(key, data, ttlMs)` — store result
- `isStale(key)` — check freshness
- TTL defaults (from env or fallback):
  - `CACHE_TTL_PLACES` — default 7 days
  - `CACHE_TTL_GEOCODE` — default 14 days
- `MIN_RESULTS_BEFORE_CACHE` — if cached count < this value, treat as cache miss and refetch

#### `server/services/places/placesService.ts`
Main orchestration — OSM-first, cache-first:

```
1. Round lat/lng to 5 decimal places → build cache key
2. Read from cacheRepo
3. If cache fresh AND count >= MIN_RESULTS_BEFORE_CACHE → return immediately
4. If cache stale → return stale data + trigger background refresh
5. If cache miss or insufficient:
   a. Call overpass.ts
   b. If OSM empty/error AND PROVIDER_FALLBACK != "none" → call google.ts
   c. Deduplicate by normalized name + 100m proximity
   d. Set source = "mixed" if both providers contributed
   e. Write to cacheRepo
6. If forceRefresh=true → skip step 2-3, go straight to step 5
```

**Budget circuit breaker:**
- Track daily Google call count in memory or DB
- At 80% of daily budget → log warning
- At 100% → disable non-critical Google calls (photos, enrichment)
- Keep admin override path via env `PROVIDER_FALLBACK=google-only`

---

## Phase C — Route Integration ❌ NOT WIRED

The route scaffolding exists but storage ignores the new params and returns hardcoded metadata.

### Changes needed

#### `server/routes.ts` — `/api/restaurants`
- After Phase B is complete, call `placesService.query(...)` when `lat` and `lng` are present
- Keep existing `storage.getRestaurants()` DB path as fallback when no geo params
- Add `forceRefresh` path through to `placesService`
- Write a `PlacesRequestLog` entry on every call:
  ```ts
  await storage.insertPlacesRequestLog({
    source: result.source,
    cacheHit: result.fromCache,
    fallbackUsed: result.isFallback ?? false,
    resultCount: result.data.length,
    latRounded: roundedLat,
    lngRounded: roundedLng,
    ts: new Date().toISOString(),
  });
  ```
- Replace hardcoded `source: "osm", cacheHit: true` mock metadata with real values from the service

---

## Phase D — Observability / Admin APIs ⚠️ PARTIAL

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/admin/places/health` | ✅ Exists | But always shows empty stats since logs are never written |
| `GET /api/admin/places/logs` | ✅ Exists | Always empty — nothing calls `insertPlacesRequestLog` |
| `POST /api/places/prefetch` | ❌ Missing | Not implemented anywhere |

### Changes needed

#### Wire request log writes (Phase C prerequisite)
`insertPlacesRequestLog` must be called inside the `/api/restaurants` route handler (see Phase C above).

#### `POST /api/places/prefetch`
Accept a list of `{ lat, lng, radius }` locations and warm the cache proactively:
```ts
app.post("/api/places/prefetch", async (req, res) => {
  const { locations } = req.body; // [{ lat, lng, radius }]
  const results = await Promise.allSettled(
    locations.map((loc) => placesService.query({ ...loc, forceRefresh: true }))
  );
  res.json({ prefetched: results.filter(r => r.status === "fulfilled").length });
});
```

---

## Phase E — Frontend Wiring ⚠️ PARTIAL

| Page / Component | Passes `lat/lng/radius/sourcePreference`? | Action needed |
|---|---|---|
| `Home.tsx` | ✅ Yes | Done |
| `SwipePage.tsx` | ❌ No | Add geolocation + pass `lat`, `lng`, `radius`, `sourcePreference: "osm-first"` |
| `RestaurantList.tsx` | ❌ No | Add query-string `lat/lng` support or user location hook |
| `SoloResults.tsx` | ❌ No | Pass user location so results are geographically relevant |
| `BottomSheet.tsx` (mode: "new") | ❌ No | Pass parent's `userLocation` via prop or context |

### Geo params pattern to follow (from `Home.tsx`)
```ts
const { data: restaurants = [] } = useRestaurants({
  lat: userLocation.lat,
  lng: userLocation.lng,
  radius: 5000,
  sourcePreference: "osm-first",
});
```

All pages that show a restaurant list should follow this same pattern. User location is already resolved in `Home.tsx` via `navigator.geolocation` — consider extracting this into a shared `useUserLocation` hook to avoid duplication.

---

## Phase F — Validation & Launch ❌ NOT STARTED

### Contract tests
- `GET /api/restaurants?lat=13.74&lng=100.54&radius=2000` returns valid schema
- New optional fields (`source`, `distanceMeters`, etc.) parse correctly when absent
- `sourcePreference` query param is accepted and forwarded

### Provider failover tests
- OSM returns empty → Google fallback triggered (when `PROVIDER_FALLBACK != "none"`)
- OSM throws error → fallback path reached, response still 200
- `forceRefresh=true` bypasses cache

### Cost budget alert tests
- After N Google calls in one day, warning log emitted at 80%
- After budget limit reached, photo enrichment calls are blocked

### Staging checklist
- [ ] Deploy with `PROVIDER_FALLBACK=none` first (OSM only, zero Google spend)
- [ ] Verify OSM results for Bangkok coordinates
- [ ] Enable `PROVIDER_FALLBACK=osm-error-only` and test fallback path
- [ ] Check `/api/admin/places/health` shows real cache hit ratio

---

## Missing Env Vars

None of these are in `.env` or `.env.example` yet:

```env
# Provider policy
PROVIDER_FALLBACK=osm-error-only   # none | osm-error-only | google-first

# Google budget controls
PHOTO_ENRICH_LIMIT=20              # max photo enrichment calls per day
GOOGLE_DAILY_BUDGET_USD=5.00       # circuit breaker threshold

# Cache TTLs (milliseconds)
CACHE_TTL_PLACES=604800000         # 7 days
CACHE_TTL_GEOCODE=1209600000       # 14 days

# Quality threshold
MIN_RESULTS_BEFORE_CACHE=5         # min OSM results to accept before falling back
```

---

## Execution Order

```
Phase B (service layer)
  └─> Phase C (wire route + log writes)
        └─> Phase D (prefetch endpoint, logs now populated)
              └─> Phase E (geo params on remaining pages)
                    └─> Phase F (tests + staging)
```

Phase A is already done. Start with Phase B.
