# TOAST Additional Algorithms (Implementation Spec)

## Scope
This document defines implementation-ready algorithms for personalization, ranking, and group decision quality in TOAST.

## Shared Data Contracts
### Input Events
```ts
type SwipeEvent = {
  userId: string;
  itemId: string;
  phase: "menu" | "restaurant";
  action: "left" | "right" | "super_like";
  durationMs?: number;
  ts: number;
};
```

### Item Feature Contract
```ts
type ItemFeatures = {
  itemId: string;
  cuisine?: string;
  priceLevel?: number; // 1..4
  tags: string[]; // e.g. ["spicy", "quick-bite", "rainy-day-comfort"]
  imageVariants?: string[]; // ordered by quality
};
```

### Common Scoring Helpers
- `left = 0`, `right = +1`, `super_like = +2`
- Exponential decay for old behavior: `w = exp(-daysAgo / HALF_LIFE_DAYS)`
- `HALF_LIFE_DAYS` default: `14`

---

## Algorithm A: Personalized Image Variant Selection (Contextual Bandit Lite)
### Goal
Increase right/super-like rate by selecting the best image variant per user and item.

### Input Schema
```ts
type AInput = {
  userId: string;
  itemId: string;
  variants: string[]; // >=1
  userTagAffinity: Record<string, number>; // normalized 0..1
  variantTagMap: Record<string, string[]>; // variantUrl -> tags
  priorStats: Record<string, { impressions: number; rewards: number }>; // per variant
};
```

### Output Schema
```ts
type AOutput = { chosenVariant: string; scoreByVariant: Record<string, number> };
```

### Decision Rule
Use UCB1-style score:
- `meanReward(v) = rewards / max(impressions,1)`
- `exploration(v) = sqrt(2 * ln(totalImpressions + 1) / max(impressions,1))`
- `affinityBoost(v) = avg(userTagAffinity[tag]) for tags in variantTagMap[v]`
- `score(v) = meanReward(v) + ALPHA * exploration(v) + BETA * affinityBoost(v)`

Defaults:
- `ALPHA = 0.15`
- `BETA = 0.25`

### Pseudocode
```ts
function chooseVariant(input: AInput): AOutput {
  if (input.variants.length === 1) return { chosenVariant: input.variants[0], scoreByVariant: { [input.variants[0]]: 1 } };
  const total = sum(impressions for all variants);
  const scores = {};
  for (const v of input.variants) {
    const s = input.priorStats[v] ?? { impressions: 0, rewards: 0 };
    const mean = s.rewards / Math.max(s.impressions, 1);
    const explore = Math.sqrt((2 * Math.log(total + 1)) / Math.max(s.impressions, 1));
    const tags = input.variantTagMap[v] ?? [];
    const affinity = tags.length ? avg(tags.map(t => input.userTagAffinity[t] ?? 0.5)) : 0.5;
    scores[v] = mean + 0.15 * explore + 0.25 * affinity;
  }
  return { chosenVariant: argmax(scores), scoreByVariant: scores };
}
```

### Failure Modes and Fallback
- No prior stats: uniform cold start with random tie-break.
- Missing tags: assign neutral affinity `0.5`.
- Missing variants: use item default image.

### Acceptance Metrics
- `+8%` relative improvement in right+super-like per 1k impressions.
- No worse than baseline by more than `-2%` for any cuisine segment.

---

## Algorithm B: In-Session Deck Adaptation (Real-Time Re-Ranking)
### Goal
Adapt the remaining deck after early swipes to reduce low-probability cards.

### Input Schema
```ts
type BInput = {
  userId: string;
  shownItems: { itemId: string; action: "left" | "right" | "super_like" }[];
  remainingCandidates: ItemFeatures[];
  minSignals: number; // default 3
};
```

### Output Schema
```ts
type BOutput = { reranked: ItemFeatures[]; replacedCount: number };
```

### Decision Rules
- Trigger adaptation only when:
  - `shownItems.length >= minSignals`
  - at least 2 signals are same polarity.
- Build session intent vector from last `K=5` swipes:
  - right/super_like: positive tag weight
  - left: negative tag weight
- Item session score:
  - `sessionScore(item) = sum(tagWeight[tag] * itemHasTag(tag))`
- Final re-rank score:
  - `final = BASE_MODEL_SCORE + GAMMA * sessionScore`
  - `GAMMA = 0.35`

### Guardrails
- Keep at least `30%` of original order for stability.
- Never remove all items from any top-level cuisine chosen in onboarding.

### Pseudocode
```ts
function adaptDeck(input: BInput): BOutput {
  if (!shouldAdapt(input.shownItems, input.minSignals)) return { reranked: input.remainingCandidates, replacedCount: 0 };
  const tagWeights = buildSessionTagWeights(input.shownItems.slice(-5));
  const rescored = input.remainingCandidates.map(i => ({ i, s: baseScore(i) + 0.35 * sessionScore(i, tagWeights) }));
  const reranked = stableBlendOriginalOrder(sortDesc(rescored), 0.3);
  return { reranked: reranked.map(x => x.i), replacedCount: countMoved(reranked) };
}
```

### Acceptance Metrics
- `-15%` median swipes-to-match.
- `+10%` session completion rate.

---

## Algorithm C: Group Collaborative Pre-Sort (Taste Neighbor Prior)
### Goal
Pre-sort initial deck for group sessions using overlap in member preferences.

### Input Schema
```ts
type CInput = {
  sessionId: string;
  memberIds: string[];
  candidateItems: ItemFeatures[];
  userItemPreferenceMatrix: Record<string, Record<string, number>>; // -1..+2
};
```

### Output Schema
```ts
type COutput = { rankedItems: ItemFeatures[]; groupAffinityByItem: Record<string, number> };
```

### Decision Rules
- Compute pairwise user similarity (cosine) using last 200 interactions.
- Group affinity:
  - `groupAffinity(item) = avg(userPrefScore(user,item) weighted by similarity centrality)`
- Final score:
  - `score(item) = 0.6 * groupAffinity + 0.4 * popularityPrior`

### Guardrails
- Cap dominance: no single user contributes more than `40%` of item score.
- If member history sparse (`<20` events): fallback to popularity prior.

### Acceptance Metrics
- `+12%` strong-match frequency in first 10 swipes.
- Fairness: stddev of per-user satisfaction <= baseline + 5%.

---

## Algorithm D: Explore/Exploit Balance (UCB Quota)
### Goal
Avoid filter bubbles and improve long-term discovery.

### Input Schema
```ts
type DInput = {
  rankedItems: ItemFeatures[];
  seenByGroup: Set<string>;
  deckSize: number; // default 15
  explorationQuota: number; // default 3
  itemStats: Record<string, { impressions: number; reward: number }>;
};
```

### Output Schema
```ts
type DOutput = { finalDeck: ItemFeatures[]; explorationItemIds: string[] };
```

### Decision Rules
- Exploit set: top-scoring familiar items.
- Explore set: unseen/new items with highest UCB:
  - `UCB = meanReward + DELTA * sqrt(ln(total+1)/n)`
  - `DELTA = 0.30`
- Fill deck with:
  - `deckSize - explorationQuota` exploit items
  - `explorationQuota` explore items

### Guardrails
- Hard limit exploration quota `[2, 4]`.
- Never place >2 exploration items consecutively.

### Acceptance Metrics
- `+20%` increase in unique restaurants chosen per 30 days.
- Short-term conversion drop must stay under `3%`.

---

## Algorithm E: Micro-Tag Content Scoring
### Goal
Use fine-grained tags to improve mapping from winning menu vibe to restaurant candidates.

### Input Schema
```ts
type EInput = {
  winningMenuTags: string[];
  restaurantTagVectors: Record<string, Record<string, number>>; // tag->weight
  hardFilters: { maxDistanceM?: number; priceLevelRange?: [number, number] };
  userNegativeTags?: string[];
};
```

### Output Schema
```ts
type EOutput = { rankedRestaurantIds: string[]; scores: Record<string, number> };
```

### Exact Formula
- `tagSim = cosine(menuVector, restaurantVector)`
- `distancePenalty = min(distanceM / maxDistanceM, 1) * 0.25`
- `negativePenalty = 0.2 if overlap(userNegativeTags, restaurantTags) else 0`
- `finalScore = tagSim - distancePenalty - negativePenalty`

### Guardrails
- Respect hard filters first; scoring does not bypass eligibility.
- If no tag coverage, fallback to category + rating sort.

### Acceptance Metrics
- `+10%` click-through to restaurant details from result list.
- `+7%` accepted final choice without restart.

---

## Integration Points in This Repo
### `server/storage.ts`
- Add pluggable ranking pipeline interface:
  - `buildInitialDeck(sessionCtx)`
  - `adaptDeck(sessionCtx, swipeEvent)`
  - `rankRestaurantsFromMenu(menuCtx)`
- Add place provider abstraction and cache repository contracts.

### `server/routes.ts`
- Extend `/api/restaurants` query parsing with:
  - `radius`, `forceRefresh`, `sourcePreference`
- Route to provider pipeline:
  - cache-first lookup
  - OSM primary
  - Google fallback by policy
- Future endpoints:
  - `/api/places/health`
  - `/api/places/logs`
  - `/api/places/prefetch`

### `client/src/hooks/use-restaurants.ts`
- Accept structured options:
  - `mode`, `lat`, `lng`, `query`, `radius`, `forceRefresh`, `sourcePreference`
- Keep default source preference as `"osm-first"`.

---

## Operational Defaults
- `CACHE_TTL_PLACES = 7 days`
- `CACHE_TTL_GEOCODE = 14 days`
- `PHOTO_ENRICH_LIMIT = 50`
- `MIN_RESULTS_BEFORE_CACHE = 5`
- `PROVIDER_FALLBACK = "none"` in development, `"google"` in production with budget control
- Daily Google budget circuit breaker:
  - warn at `80%`
  - fallback disable at `100%` (except explicit force fallback for admin)
