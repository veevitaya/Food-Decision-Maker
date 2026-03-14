import type { InsertItemFeatureSnapshot } from "@shared/schema";

type ItemMetricDelta = Pick<InsertItemFeatureSnapshot, "ctr" | "likeRate" | "superLikeRate" | "conversionRate">;

export function deriveItemFeatureDelta(
  eventType: string,
  metadata: Record<string, unknown> | undefined,
): ItemMetricDelta {
  const directionRaw = metadata?.direction;
  const direction = typeof directionRaw === "string" ? directionRaw.toLowerCase() : "";
  const isLikeSwipe = eventType === "swipe" && (direction === "right" || direction === "super");

  return {
    ctr: eventType === "view_card" ? 1 : 0,
    likeRate: isLikeSwipe ? 1 : 0,
    superLikeRate: eventType === "swipe" && direction === "super" ? 1 : 0,
    conversionRate: eventType === "deeplink_click" ? 1 : 0,
  };
}

export function hasItemFeatureDelta(delta: ItemMetricDelta): boolean {
  return (delta.ctr ?? 0) > 0 || (delta.likeRate ?? 0) > 0 || (delta.superLikeRate ?? 0) > 0 || (delta.conversionRate ?? 0) > 0;
}
