import { getStoredProfile } from "@/hooks/use-line-profile";

export type CanonicalEventType =
  | "view_card"
  | "swipe"
  | "session_join"
  | "session_result_click_map"
  | "favorite"
  | "dismiss"
  | "search"
  | "filter"
  | "order_click"
  | "booking_click"
  | "deeplink_click"
  | "view_menu_item"
  | "click_menu_item";

type EventPayload = {
  eventType: CanonicalEventType;
  eventName?: string;
  itemId?: number;
  menuItemId?: number;
  metadata?: Record<string, unknown>;
  context?: string;
  platform?: string;
  timestamp?: string;
  sessionId?: string;
  userId?: string;
};

type QueuedEvent = {
  eventId: string;
  eventVersion: string;
  idempotencyKey: string;
  eventType: CanonicalEventType;
  eventName?: string;
  timestamp: string;
  platform: string;
  context: string;
  userId?: string;
  itemId?: number;
  menuItemId?: number;
  metadata?: Record<string, unknown>;
  sessionId?: string;
};

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function getUserId(): string | undefined {
  const profile = getStoredProfile();
  return profile?.userId || undefined;
}

function getSessionId(): string | undefined {
  const key = "toast_analytics_session_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    return undefined;
  }
}

function flushNow() {
  if (queue.length === 0) return;
  const payload = queue.slice(0, 100);
  queue = queue.slice(100);

  const storedProfile = getStoredProfile();
  const body: Record<string, unknown> = { events: payload };
  if (storedProfile?.userId && storedProfile?.displayName) {
    body.actorProfile = {
      userId: storedProfile.userId,
      displayName: storedProfile.displayName,
      pictureUrl: storedProfile.pictureUrl,
    };
  }

  fetch("/api/events/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }).catch(() => {
    queue = [...payload, ...queue];
  });

  if (queue.length > 0) {
    timer = setTimeout(flushNow, 1200);
  }
}

export function trackEvent(input: EventPayload) {
  const now = input.timestamp ?? new Date().toISOString();
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const event: QueuedEvent = {
    eventId,
    eventVersion: "v1",
    idempotencyKey: eventId,
    eventType: input.eventType,
    eventName: input.eventName,
    timestamp: now,
    platform: input.platform ?? "web",
    context: input.context ?? window.location.pathname,
    userId: input.userId ?? getUserId(),
    itemId: input.itemId,
    menuItemId: input.menuItemId,
    sessionId: input.sessionId ?? getSessionId(),
    metadata: input.metadata ?? {},
  };
  queue.push(event);

  if (!timer) {
    timer = setTimeout(() => {
      timer = null;
      flushNow();
    }, 800);
  }
}

export async function grantBehaviorConsent() {
  const userId = getUserId();
  if (!userId) return;
  await fetch("/api/privacy/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, granted: true, version: "v1" }),
  });
}
