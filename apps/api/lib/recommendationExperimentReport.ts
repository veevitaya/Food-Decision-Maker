type EventLike = {
  eventType: string;
  metadata: unknown;
};

type AggregatedBucket = {
  recommendationSource: string;
  recommendationVariant: string;
  impressions: number;
  swipes: number;
  rightSwipes: number;
  rightSwipeRate: number;
  deliveryClicks: number;
  clickThroughRate: number;
};

function asMetadata(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  return input as Record<string, unknown>;
}

function toNormalizedLabel(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const normalized = input.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function isRightSwipe(metadata: Record<string, unknown>): boolean {
  const direction = metadata.direction;
  if (typeof direction !== "string") return false;
  const normalized = direction.trim().toLowerCase();
  return normalized === "right" || normalized === "super";
}

export function aggregateRecommendationExperimentReport(logs: EventLike[]): AggregatedBucket[] {
  const buckets = new Map<string, {
    recommendationSource: string;
    recommendationVariant: string;
    impressions: number;
    swipes: number;
    rightSwipes: number;
    deliveryClicks: number;
  }>();

  for (const log of logs) {
    const metadata = asMetadata(log.metadata);
    const recommendationSource = toNormalizedLabel(metadata.recommendation_source, "unknown");
    const recommendationVariant = toNormalizedLabel(metadata.recommendation_variant, "unknown");
    const key = `${recommendationSource}::${recommendationVariant}`;
    const bucket = buckets.get(key) ?? {
      recommendationSource,
      recommendationVariant,
      impressions: 0,
      swipes: 0,
      rightSwipes: 0,
      deliveryClicks: 0,
    };

    if (log.eventType === "view_card") {
      bucket.impressions += 1;
    } else if (log.eventType === "swipe") {
      bucket.swipes += 1;
      if (isRightSwipe(metadata)) bucket.rightSwipes += 1;
    } else if (log.eventType === "deeplink_click") {
      bucket.deliveryClicks += 1;
    }

    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      recommendationSource: bucket.recommendationSource,
      recommendationVariant: bucket.recommendationVariant,
      impressions: bucket.impressions,
      swipes: bucket.swipes,
      rightSwipes: bucket.rightSwipes,
      rightSwipeRate: bucket.swipes > 0 ? Number(((bucket.rightSwipes / bucket.swipes) * 100).toFixed(2)) : 0,
      deliveryClicks: bucket.deliveryClicks,
      clickThroughRate: bucket.impressions > 0 ? Number(((bucket.deliveryClicks / bucket.impressions) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions || b.deliveryClicks - a.deliveryClicks);
}
