# Toast App Full Implementation

## 1. Summary
This document is the execution plan for TOAST frontend plus low-cost places backend integration in this repository.

Primary outcomes:
- Keep existing frontend flows functional.
- Introduce OSM-first place discovery with cache-first behavior.
- Use Google Places only as selective fallback/enrichment under hard budget limits.
- Add observability for cost and cache efficiency.

---

## 2. Current State Baseline
### Existing repo shape
- `client/`: React + TanStack Query UI flows and map rendering (Leaflet).
- `server/`: Express routes + storage abstraction (`server/routes.ts`, `server/storage.ts`).
- `shared/`: API contracts and Zod schemas (`shared/routes.ts`, `shared/schema.ts`).
- `google-map-example/`: working reference for OSM+cache+fallback architecture.

### Existing restaurant API path
- UI hook calls `GET /api/restaurants`.
- Route validates query and delegates to `storage.getRestaurants(...)`.
- Storage currently reads local `restaurants` table only.

### Gaps
- No provider abstraction for OSM/Google.
- No cache TTL policy or stale refresh flow.
- No place request logs/health endpoints.
- No documented budget circuit breaker.

---

## 3. Public Contract Changes
### 3.1 `GET /api/restaurants` query
Current + planned:
- `mode?: string`
- `lat?: number`
- `lng?: number`
- `query?: string`
- `radius?: number` (new)
- `forceRefresh?: boolean` (new)
- `sourcePreference?: "osm-first" | "google-first" | "hybrid"` (new, default `"osm-first"`)

### 3.2 Restaurant response metadata
Add optional fields to standardized response item:
- `source?: "cache" | "osm" | "google" | "mixed"`
- `distanceMeters?: number`
- `photos?: string[]`
- `freshnessScore?: number`
- `isFallback?: boolean`

Compatibility note:
- All new fields are optional to avoid breaking existing UI.

### 3.3 Admin/Ops endpoints (to implement after provider layer)
- `GET /api/places/health`
- `GET /api/places/logs?limit=&source=&cacheHit=&fallbackUsed=`
- `POST /api/places/prefetch`

---

## 4. Architecture: OSM-First Low-Cost Places
### 4.1 Provider policy
1. Read cache by rounded geo query key.
2. Return cache immediately if fresh.
3. If stale, return stale data and refresh in background.
4. If cache miss or insufficient cached result size:
   - query Overpass/Nominatim first.
5. Google usage allowed only when:
   - OSM result empty, or OSM provider error, or explicit policy override.

### 4.2 Cache policy
- Key: `places:{lat5}:{lng5}:{radius}:{query}`
- Place key: `place:{provider}:{id}`
- TTL defaults:
  - places: 7 days
  - geocode: 14 days
- If cached result count `< MIN_RESULTS_BEFORE_CACHE`, bypass cache and refetch.

### 4.3 Data normalization and dedupe
- Normalize into internal place model:
  - id, name, lat/lon, address, source, photos, freshnessScore
- Deduplicate by:
  - normalized name + distance threshold (e.g. 100m)
- Merge source metadata:
  - combined record sets `source = "mixed"` when merged.

### 4.4 Google spend controls
- Env controls:
  - `PROVIDER_FALLBACK`
  - `PHOTO_ENRICH_LIMIT`
  - `CACHE_TTL_PLACES`
  - `CACHE_TTL_GEOCODE`
  - `MIN_RESULTS_BEFORE_CACHE`
- Budget circuit breaker:
  - warning at 80% daily budget
  - disable non-critical Google calls at 100%
  - keep admin override path for incident response

---

## 5. File-by-File Implementation Checklist
### Phase A: Contracts and docs
- [x] `docs/additional-algorithms.MD`: rewrite to implementation-spec format.
- [x] `shared/routes.ts`: add query fields and response metadata schema.
- [x] `client/src/hooks/use-restaurants.ts`: support full query option object.
- [x] `server/routes.ts`: pass through new query fields to storage interface.
- [x] `server/storage.ts`: update method signature to accept expanded query contract.

### Phase B: Provider and cache service layer
- [ ] Add `server/services/places/types.ts` (normalized place model).
- [ ] Add `server/services/places/providers/overpass.ts`.
- [ ] Add `server/services/places/providers/google.ts`.
- [ ] Add `server/services/places/cache/cacheRepo.ts`.
- [ ] Add `server/services/places/placesService.ts` with cache-first orchestration.

### Phase C: Route integration
- [ ] Wire `/api/restaurants` to places service when `lat/lng` present.
- [ ] Keep current DB fallback when no geo params provided.
- [ ] Add `forceRefresh` path.

### Phase D: Observability/admin APIs
- [ ] Add request log repository.
- [ ] Add `/api/places/health`.
- [ ] Add `/api/places/logs`.
- [ ] Add `/api/places/prefetch`.

### Phase E: Frontend wiring
- [ ] Update pages using `useRestaurants(...)` to pass geo/radius options where relevant.
- [ ] Ensure map list handles optional fields safely.

### Phase F: Validation and launch
- [ ] Contract tests for new query schema.
- [ ] Provider failover tests.
- [ ] Cost budget alert tests.
- [ ] Staging verification and rollout.

---

## 6. Dependency Graph (Execution Order)
1. Contract updates in `shared/routes.ts`.
2. Provider/cache service layer.
3. Route integration in `server/routes.ts` and `server/storage.ts`.
4. Frontend hook/query parameter support.
5. Observability/admin APIs.
6. Validation, launch gates, and production rollout.

---

## 7. Test Cases and Scenarios
### API behavior
- Repeated same `lat/lng/radius/query` should hit cache.
- OSM empty/error should trigger fallback when enabled.
- `forceRefresh=true` should bypass cached aggregate result.

### Data quality
- OSM and Google duplicates should merge by name+proximity.
- Missing photos, address, or phone should not break response parse.

### Cost safety
- Photo enrichment must stop after `PHOTO_ENRICH_LIMIT`.
- Logs must expose cache hit ratio and fallback usage.

### Frontend
- Existing pages render with optional metadata fields absent.
- Nearby/filter experience stays functional with OSM-only payload.

---

## 8. Risks, Mitigations, Rollback
### Risks
- OSM quality variability by area.
- Latency spikes from external providers.
- Unbounded fallback usage if controls fail.

### Mitigations
- Aggressive cache + stale-while-refresh behavior.
- Thresholded fallback and daily budget circuit breaker.
- Prefetch high-demand Thai areas.

### Rollback
- Feature flag provider layer off and return DB-only path.
- Disable Google fallback with `PROVIDER_FALLBACK=none`.
- Increase cache TTL temporarily to reduce external traffic.

---

## 9. Cost Model and Monitoring Spec
Track daily:
- total `/api/restaurants` requests
- cache hit ratio (`cache_hits / total`)
- OSM calls
- Google search calls
- Google photo enrichment calls
- fallback trigger ratio
- estimated Google spend vs budget

Alerting:
- cache hit ratio < 60% for 30 minutes
- fallback ratio > 25% for 30 minutes
- spend >= 80% daily budget

---

## 10. Final MVP Acceptance Checklist
- [ ] All query contract changes deployed and backward compatible.
- [ ] OSM-first + cache-first behavior verified in staging.
- [ ] Google fallback restricted and budget-protected.
- [ ] Admin health/log/prefetch endpoints available.
- [ ] Frontend list/map flows stable on mobile and desktop.
- [ ] Runbook for provider outage and budget-overrun documented.
