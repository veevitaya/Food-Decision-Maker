export function normalizeSwipeDirection(metadata: Record<string, unknown> | null | undefined): string {
  const raw = metadata?.direction;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export function getSwipeSignalWeight(
  eventType: string,
  metadata: Record<string, unknown> | null | undefined,
): number {
  if (eventType !== "swipe") return 0;
  const direction = normalizeSwipeDirection(metadata);
  if (direction === "super") return 3;
  if (direction === "right") return 1;
  return 0;
}

export function getSuperLikeMultiplier(affinity: number): number {
  if (affinity >= 0.85) return 1.2;
  if (affinity >= 0.7) return 1.1;
  return 1;
}
