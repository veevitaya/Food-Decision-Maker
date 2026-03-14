import type { InsertItemFeatureSnapshot, ItemFeatureSnapshot } from "@shared/schema";

type ItemMetricCounters = Pick<ItemFeatureSnapshot, "ctr" | "likeRate" | "superLikeRate" | "conversionRate">;
type ItemMetricDelta = Partial<Pick<InsertItemFeatureSnapshot, "ctr" | "likeRate" | "superLikeRate" | "conversionRate">>;

export function applyItemFeatureDeltas(current: ItemMetricCounters, delta: ItemMetricDelta): ItemMetricCounters {
  return {
    ctr: current.ctr + (delta.ctr ?? 0),
    likeRate: current.likeRate + (delta.likeRate ?? 0),
    superLikeRate: current.superLikeRate + (delta.superLikeRate ?? 0),
    conversionRate: current.conversionRate + (delta.conversionRate ?? 0),
  };
}
