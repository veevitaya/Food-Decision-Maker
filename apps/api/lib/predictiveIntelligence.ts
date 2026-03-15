import type { IStorage } from "../storage";
import { getLoadedMlModelVersion, predictMlProbability, type MlFeatureVector } from "./mlRanking";

type ImpactLevel = "high" | "medium" | "low";
type PredictionType = "demand" | "trend" | "retention";

type PredictiveOverview = {
  generatedAt: string;
  windowDays: number;
  modelMetrics: Array<{ label: string; value: string; desc: string }>;
  activePredictions: Array<{
    title: string;
    area: string;
    timeframe: string;
    confidence: number;
    impact: ImpactLevel;
    type: PredictionType;
  }>;
  restaurantForecasts: Array<{
    name: string;
    prediction: "Outperform" | "Steady" | "Underperform";
    confidence: number;
    reason: string;
  }>;
  segmentForecasts: Array<{
    segment: string;
    growth: string;
    nextMonth: number;
  }>;
};

function pct(current: number, base: number): number {
  if (base <= 0) return 0;
  return (current / base) * 100;
}

function growthPct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function impactFromGrowth(value: number): ImpactLevel {
  const abs = Math.abs(value);
  if (abs >= 20) return "high";
  if (abs >= 10) return "medium";
  return "low";
}

function parseDirection(metadata: unknown): string {
  const raw = (metadata as Record<string, unknown> | null)?.direction;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

function buildMlVector(params: {
  categoryAffinity: number;
  restaurantPriceLevel: number | null | undefined;
  preferredPriceLevel: number;
  trendingScore: number | null | undefined;
  itemSeenCount: number;
  isWeekend: boolean;
  hourActive: boolean;
}): MlFeatureVector {
  const priceGap = Math.abs((params.restaurantPriceLevel ?? 2) - params.preferredPriceLevel);
  return {
    cuisine_affinity: clamp(params.categoryAffinity, 0, 1),
    price_match: clamp(1 - priceGap / 3, 0, 1),
    distance_score: 0.5,
    popularity_score: clamp((params.trendingScore ?? 0) / 100, 0, 1),
    disliked: 0,
    hour_active: params.hourActive ? 1 : 0,
    is_weekend: params.isWeekend ? 1 : 0,
    new_restaurant: params.itemSeenCount < 10 ? 1 : 0,
  };
}

export async function buildPredictiveIntelligenceOverview(storage: IStorage, days = 30): Promise<PredictiveOverview> {
  const boundedDays = clamp(Math.floor(days || 30), 7, 180);
  const now = Date.now();
  const nowDate = new Date(now);
  const currentStart = new Date(now - boundedDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now - boundedDays * 2 * 24 * 60 * 60 * 1000);

  const [logs, restaurants, snapshots] = await Promise.all([
    storage.listEventLogs(50_000, previousStart),
    storage.getRestaurants(),
    storage.listUserFeatureSnapshots(5_000),
  ]);

  const currentLogs = logs.filter((e) => new Date(e.createdAt).getTime() >= currentStart.getTime());
  const previousLogs = logs.filter((e) => new Date(e.createdAt).getTime() < currentStart.getTime());

  const swipeCurrent = currentLogs.filter((e) => e.eventType === "swipe");
  const swipeRightCurrent = swipeCurrent.filter((e) => parseDirection(e.metadata) === "right" || parseDirection(e.metadata) === "super");
  const swipePrev = previousLogs.filter((e) => e.eventType === "swipe");
  const swipeRightPrev = swipePrev.filter((e) => parseDirection(e.metadata) === "right" || parseDirection(e.metadata) === "super");
  const clickoutsCurrent = currentLogs.filter((e) => e.eventType === "deeplink_click" || e.eventType === "order_click" || e.eventType === "booking_click");

  const acceptance = pct(swipeRightCurrent.length, swipeCurrent.length || 1);
  const clickoutAccuracy = pct(clickoutsCurrent.length, swipeRightCurrent.length || 1);
  const retentionCurrentUsers = new Set(currentLogs.map((e) => e.userId).filter(Boolean) as string[]);
  const retentionPrevUsers = new Set(previousLogs.map((e) => e.userId).filter(Boolean) as string[]);
  let retained = 0;
  retentionPrevUsers.forEach((uid) => {
    if (retentionCurrentUsers.has(uid)) retained += 1;
  });
  const retentionRate = pct(retained, retentionPrevUsers.size || 1);
  const demandMae = Math.abs(growthPct(swipeRightCurrent.length, swipeRightPrev.length));

  const restaurantMap = new Map(restaurants.map((r) => [r.id, r]));

  const currentRestaurantRight: Record<number, number> = {};
  const prevRestaurantRight: Record<number, number> = {};
  for (const e of swipeRightCurrent) {
    if (!e.itemId) continue;
    currentRestaurantRight[e.itemId] = (currentRestaurantRight[e.itemId] ?? 0) + 1;
  }
  for (const e of swipeRightPrev) {
    if (!e.itemId) continue;
    prevRestaurantRight[e.itemId] = (prevRestaurantRight[e.itemId] ?? 0) + 1;
  }

  const cuisineCurrent: Record<string, number> = {};
  const cuisinePrev: Record<string, number> = {};
  for (const e of swipeRightCurrent) {
    const category = e.itemId ? (restaurantMap.get(e.itemId)?.category ?? "Other") : "Other";
    cuisineCurrent[category] = (cuisineCurrent[category] ?? 0) + 1;
  }
  for (const e of swipeRightPrev) {
    const category = e.itemId ? (restaurantMap.get(e.itemId)?.category ?? "Other") : "Other";
    cuisinePrev[category] = (cuisinePrev[category] ?? 0) + 1;
  }

  const maxCuisineCurrent = Math.max(1, ...Object.values(cuisineCurrent));
  const weightedPrice = restaurants
    .map((r) => ({ weight: currentRestaurantRight[r.id] ?? 0, priceLevel: r.priceLevel ?? 2 }))
    .reduce((acc, row) => ({ sum: acc.sum + row.priceLevel * row.weight, weight: acc.weight + row.weight }), { sum: 0, weight: 0 });
  const preferredPriceLevel = weightedPrice.weight > 0 ? weightedPrice.sum / weightedPrice.weight : 2;

  const hourBuckets = new Array<number>(24).fill(0);
  for (const e of currentLogs) {
    const h = new Date(e.createdAt).getHours();
    hourBuckets[h] += 1;
  }
  const topHours = new Set(
    hourBuckets
      .map((count, hour) => ({ count, hour }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((v) => v.hour),
  );
  const currentHour = nowDate.getHours();
  const isWeekend = nowDate.getDay() === 0 || nowDate.getDay() === 6;

  const modelVersion = getLoadedMlModelVersion();
  let mlScoredCount = 0;

  const totalForecastCandidates = Object.keys(currentRestaurantRight).length;
  const restaurantForecasts: PredictiveOverview["restaurantForecasts"] = Object.entries(currentRestaurantRight)
    .map(([idText, count]) => {
      const id = Number(idText);
      const restaurant = restaurantMap.get(id);
      const prev = prevRestaurantRight[id] ?? 0;
      const growth = growthPct(count, prev);
      const category = restaurant?.category ?? "Other";
      const categoryAffinity = (cuisineCurrent[category] ?? 0) / maxCuisineCurrent;
      const itemSeenCount = count + prev;

      const vector = buildMlVector({
        categoryAffinity,
        restaurantPriceLevel: restaurant?.priceLevel,
        preferredPriceLevel,
        trendingScore: restaurant?.trendingScore,
        itemSeenCount,
        isWeekend,
        hourActive: topHours.has(currentHour),
      });
      const mlProb = predictMlProbability(vector);
      const useMl = mlProb != null;
      if (useMl) mlScoredCount += 1;

      const prediction: PredictiveOverview["restaurantForecasts"][number]["prediction"] = useMl
        ? mlProb >= 0.62
          ? "Outperform"
          : mlProb <= 0.38
            ? "Underperform"
            : "Steady"
        : growth >= 15
          ? "Outperform"
          : growth <= -10
            ? "Underperform"
            : "Steady";

      const confidence = useMl
        ? clamp(Math.round(55 + Math.abs(mlProb - 0.5) * 90), 55, 95)
        : clamp(Math.round(55 + Math.min(35, Math.abs(growth) * 0.8)), 55, 95);

      const reason = useMl
        ? `ML score ${(mlProb * 100).toFixed(1)}% with ${growth >= 0 ? "+" : ""}${Math.round(growth)}% demand trend`
        : growth >= 15
          ? "Strong right-swipe momentum vs previous window"
          : growth <= -10
            ? "Demand softening vs previous window"
            : "Stable engagement in current period";

      return {
        name: restaurant?.name ?? `Restaurant #${id}`,
        prediction,
        confidence,
        reason,
        volume: count,
        mlProb: mlProb ?? -1,
      };
    })
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8)
    .map(({ volume: _volume, mlProb: _mlProb, ...item }) => item);

  const topCuisineGrowth = Object.keys(cuisineCurrent).map((name) => ({
    name,
    growth: growthPct(cuisineCurrent[name] ?? 0, cuisinePrev[name] ?? 0),
    volume: cuisineCurrent[name] ?? 0,
  }))
    .sort((a, b) => b.growth - a.growth || b.volume - a.volume);

  const districtCurrent: Record<string, number> = {};
  for (const e of swipeRightCurrent) {
    const district = e.itemId ? (restaurantMap.get(e.itemId)?.district ?? "City-wide") : "City-wide";
    districtCurrent[district] = (districtCurrent[district] ?? 0) + 1;
  }
  const topDistrict = Object.entries(districtCurrent).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "City-wide";
  const topTrend = topCuisineGrowth[0];
  const worstTrend = [...topCuisineGrowth].sort((a, b) => a.growth - b.growth)[0];

  const activePredictions: PredictiveOverview["activePredictions"] = [];
  if (topTrend) {
    const topCuisineRestaurants = restaurants.filter((r) => (r.category ?? "Other") === topTrend.name);
    const probs = topCuisineRestaurants
      .map((r) => {
        const vector = buildMlVector({
          categoryAffinity: (cuisineCurrent[topTrend.name] ?? 0) / maxCuisineCurrent,
          restaurantPriceLevel: r.priceLevel,
          preferredPriceLevel,
          trendingScore: r.trendingScore,
          itemSeenCount: (currentRestaurantRight[r.id] ?? 0) + (prevRestaurantRight[r.id] ?? 0),
          isWeekend,
          hourActive: topHours.has(currentHour),
        });
        return predictMlProbability(vector);
      })
      .filter((v): v is number => v != null);
    const cuisineMl = probs.length > 0 ? probs.reduce((s, v) => s + v, 0) / probs.length : null;
    activePredictions.push({
      title: `${topTrend.name} demand spike expected`,
      area: topDistrict,
      timeframe: "Next 7 days",
      confidence: cuisineMl != null ? clamp(Math.round(cuisineMl * 100), 55, 95) : clamp(Math.round(65 + Math.abs(topTrend.growth) * 0.6), 60, 95),
      impact: impactFromGrowth(topTrend.growth),
      type: "demand",
    });
  }
  if (worstTrend && worstTrend.growth < 0) {
    activePredictions.push({
      title: `${worstTrend.name} interest declining`,
      area: "City-wide",
      timeframe: "Next 2-4 weeks",
      confidence: clamp(Math.round(60 + Math.abs(worstTrend.growth) * 0.5), 55, 90),
      impact: impactFromGrowth(worstTrend.growth),
      type: "trend",
    });
  }
  activePredictions.push({
    title: "Returning user cohort likely to revisit",
    area: "City-wide",
    timeframe: "Within 3 days",
    confidence: clamp(Math.round(retentionRate), 50, 90),
    impact: retentionRate >= 20 ? "medium" : "low",
    type: "retention",
  });

  const snapshotByUser = new Map(snapshots.map((s) => [s.userId, s]));
  const segmentDefs = [
    { key: "Power Users", test: (s: (typeof snapshots)[number]) => (s.activeHours ?? []).length >= 10 },
    { key: "Weekend Browsers", test: (s: (typeof snapshots)[number]) => (s.activeHours ?? []).some((h) => h >= 10 && h <= 13) },
    { key: "Lunch Regulars", test: (s: (typeof snapshots)[number]) => (s.activeHours ?? []).some((h) => h >= 12 && h <= 14) },
    { key: "New Users", test: (s: (typeof snapshots)[number]) => Object.keys(s.cuisineAffinity ?? {}).length <= 2 },
    { key: "Churning Risk", test: (s: (typeof snapshots)[number]) => (s.dislikedItemIds ?? []).length >= 8 },
  ];

  const segmentCountsCurrent: Record<string, number> = {};
  const segmentCountsPrev: Record<string, number> = {};
  for (const e of currentLogs) {
    if (!e.userId) continue;
    const snap = snapshotByUser.get(e.userId);
    if (!snap) continue;
    for (const seg of segmentDefs) {
      if (seg.test(snap)) segmentCountsCurrent[seg.key] = (segmentCountsCurrent[seg.key] ?? 0) + 1;
    }
  }
  for (const e of previousLogs) {
    if (!e.userId) continue;
    const snap = snapshotByUser.get(e.userId);
    if (!snap) continue;
    for (const seg of segmentDefs) {
      if (seg.test(snap)) segmentCountsPrev[seg.key] = (segmentCountsPrev[seg.key] ?? 0) + 1;
    }
  }

  const segmentForecasts = segmentDefs.map((seg) => {
    const curr = segmentCountsCurrent[seg.key] ?? 0;
    const prev = segmentCountsPrev[seg.key] ?? 0;
    const growth = Math.round(growthPct(curr, prev));
    const projected = Math.max(0, Math.round(curr * (1 + growth / 100)));
    return {
      segment: seg.key,
      growth: `${growth >= 0 ? "+" : ""}${growth}%`,
      nextMonth: projected,
    };
  });

  const mlCoverage = totalForecastCandidates > 0 ? Math.round((mlScoredCount / totalForecastCandidates) * 100) : 0;

  return {
    generatedAt: new Date().toISOString(),
    windowDays: boundedDays,
    modelMetrics: [
      { label: "ML Model Version", value: modelVersion ?? "not_loaded", desc: "Model artifact used for inference" },
      { label: "ML Inference Coverage", value: `${mlCoverage}%`, desc: "Forecast rows scored by model" },
      { label: "Recommendation Acceptance", value: `${Math.round(acceptance)}%`, desc: "Right-swipes from swipe sessions" },
      { label: "Clickout Prediction Accuracy", value: `${Math.round(clickoutAccuracy)}%`, desc: "Clickouts over right-swipes" },
      { label: "Return Window Accuracy", value: `${Math.round(retentionRate)}%`, desc: "Users retained from previous window" },
      { label: "Demand Forecast MAE", value: `+/-${Math.round(demandMae)}%`, desc: "Window-over-window demand error proxy" },
    ],
    activePredictions,
    restaurantForecasts,
    segmentForecasts,
  };
}
