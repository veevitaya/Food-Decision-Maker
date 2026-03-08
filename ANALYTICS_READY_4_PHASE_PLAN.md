# Analytics-Ready Plan (4 Phases)

## Phase 1: Tracking Foundation and Coverage
- Define a canonical event taxonomy across frontend and backend.
- Standardize event payload fields:
  - `event_id`, `event_version`, `user_id`, `session_id`, `item_id`, `event_type`, `timestamp`, `platform`, `context`, `metadata`.
- Enforce schema validation at ingest APIs and reject/flag invalid payloads.
- Instrument all key user actions end-to-end:
  - feed impression, swipe left/right, detail view, favorite, dismiss, search/filter, map click, order/booking click.
- Ensure idempotency keys are always sent to prevent duplicate events.
- Make tracking consent-aware and auditable.

## Phase 2: Data Quality, Storage Model, and Reliability
- Implement ingestion data quality checks:
  - null-rate, unknown event types, duplicate rate, timestamp skew, missing user/session ratios.
- Add deduplication and late-event handling logic.
- Build derived analytics layers:
  - user activity aggregates, item aggregates, funnel tables, retention/cohort tables.
- Define retention and privacy-safe storage policies.
- Add daily data health reports and alerts for broken tracking.

## Phase 3: Feature Store and Recommendation Engine
- Create shared online/offline feature definitions for:
  - user affinity (cuisine, budget, time, location),
  - item quality (CTR, like rate, conversion, freshness),
  - context features (time-of-day, campaign exposure, geography).
- Build a hybrid ranking pipeline:
  - business constraints + popularity + personalization score.
- Add robust cold-start and fallback ranking for missing features.
- Expose score breakdown/debug info (`why_this_item`) for internal validation.
- Add model/feature freshness checks and scheduled recomputation jobs.

## Phase 4: Experimentation, Observability, and Governance
- Implement A/B testing framework:
  - variant assignment, exposure logging, outcome tracking.
- Define success metrics and guardrails:
  - CTR, swipe-right rate, detail-view rate, order-click rate, retention, latency, error rate.
- Add production observability:
  - ingest -> features -> ranking -> outcome dashboards with alerts.
- Add incident recovery tooling (replay/backfill) and runbooks.
- Enforce governance:
  - role-based analytics access, PII minimization/masking, consent withdrawal propagation, audit logs.

## Exit Criteria (Project Considered Fully Analytics-Ready)
- Event taxonomy and payload contract are stable and versioned.
- Tracking coverage for all critical flows is complete and validated.
- Data quality SLAs are monitored with active alerting.
- Recommendation ranking uses real-time or near-real-time features reliably.
- A/B experimentation can safely evaluate ranking changes.
- Privacy/compliance controls are enforceable and auditable.

## Repo Mapping (Exact Implementation Targets)

### Phase 1 Targets
- Frontend event instrumentation:
  - `apps/frontend/src/lib/eventTracker.ts`
  - `apps/frontend/src/lib/analytics.ts`
  - `apps/frontend/src/pages/*` and `apps/frontend/src/hooks/*` (swipe/detail/favorite/search/map/order-click flows)
- Admin/client parity if needed:
  - `apps/admin/src/lib/eventTracker.ts`
  - `apps/admin/src/lib/analytics.ts`
- Event ingest + validation:
  - `apps/api/routes.ts`:
    - `POST /api/events/batch`
    - `POST /api/privacy/consent`
    - `GET /api/analytics/events`
- Shared schemas/contracts:
  - `packages/shared/schema.ts`
  - `packages/shared/routes.ts`

### Phase 2 Targets
- Storage/query and derived read models:
  - `apps/api/storage.ts`
  - `apps/api/routes.ts` analytics endpoints:
    - `GET /api/analytics/summary`
    - `GET /api/analytics/user-segments`
    - `GET /api/analytics/top-restaurants`
    - `GET /api/admin/dashboard/details`
- DB schema/migrations:
  - `migrations/*`
  - `packages/shared/schema.ts`
- Seed/backfill/utility scripts:
  - `script/seed.ts`
  - `script/build.ts`

### Phase 3 Targets
- Recommendation logic:
  - `apps/api/services/recommendations/personalized.ts`
  - `apps/api/routes.ts`:
    - `GET /api/recommendations/personalized`
    - `GET /api/analytics/recommendations`
    - `GET /api/restaurants/suggestions`
- Feature inputs:
  - event logs + snapshots in `packages/shared/schema.ts`
  - read/write paths in `apps/api/storage.ts`

### Phase 4 Targets
- Observability/admin surfaces:
  - `apps/frontend/src/pages/admin/AdminAnalytics.tsx`
  - `apps/admin/src/pages/admin/AdminAnalytics.tsx`
  - `apps/api/routes.ts` (health/analytics/admin endpoints)
- Privacy and governance:
  - `POST /api/privacy/export`
  - `POST /api/privacy/delete`
  - `POST /api/privacy/consent`
  - consent/snapshot/event models in `packages/shared/schema.ts`

## Effort Estimate (Per Phase)
- Phase 1: 1 to 1.5 weeks
  - Main risk: missed event points and inconsistent `userId/sessionId`.
- Phase 2: 1.5 to 2 weeks
  - Main risk: historical data quality and migration/backfill correctness.
- Phase 3: 2 to 3 weeks
  - Main risk: ranking quality and cold-start behavior.
- Phase 4: 1 to 1.5 weeks
  - Main risk: metric trustworthiness and alert fatigue.

Total estimated timeline: 5.5 to 8 weeks (single engineer, iterative rollout).
