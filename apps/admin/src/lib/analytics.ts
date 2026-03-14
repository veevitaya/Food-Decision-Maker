import { trackEvent as enqueueEvent, type CanonicalEventType } from "@/lib/eventTracker";

function mapToCanonical(eventType: string): CanonicalEventType {
  switch (eventType) {
    case "swipe_left":
    case "swipe_right":
    case "swipe_super":
      return "swipe";
    case "view_detail":
      return "view_card";
    case "delivery_click":
      return "deeplink_click";
    case "quiz_start":
      return "session_join";
    case "favorite":
      return "favorite";
    case "dismiss":
      return "dismiss";
    case "search":
      return "search";
    case "filter":
      return "filter";
    case "booking_click":
      return "booking_click";
    default:
      return "view_card";
  }
}

export function trackEvent(
  eventType: string,
  data?: { userId?: string; restaurantId?: number; metadata?: Record<string, unknown> },
) {
  const canonicalType = mapToCanonical(eventType);
  const direction = eventType === "swipe_left"
    ? "left"
    : eventType === "swipe_right"
    ? "right"
    : eventType === "swipe_super"
    ? "super"
    : undefined;
  enqueueEvent({
    eventType: canonicalType,
    eventName: eventType,
    userId: data?.userId,
    itemId: data?.restaurantId,
    metadata: {
      ...(data?.metadata ?? {}),
      ...(direction ? { direction } : {}),
    },
  });
}
