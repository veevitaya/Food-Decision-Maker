export function trackEvent(
  eventType: string,
  data?: { userId?: string; restaurantId?: number; metadata?: Record<string, any> }
) {
  let userId = "anonymous";
  try {
    const guestProfile = localStorage.getItem("toast_guest_profile");
    if (guestProfile) {
      const parsed = JSON.parse(guestProfile);
      if (parsed.userId) userId = parsed.userId;
    }
  } catch {}

  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType,
      userId: data?.userId || userId,
      restaurantId: data?.restaurantId,
      metadata: data?.metadata ? JSON.stringify(data.metadata) : undefined,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}
