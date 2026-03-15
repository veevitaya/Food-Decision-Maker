import { z } from "zod";

export const ingestEventSchema = z.object({
  eventId: z.string().min(8),
  eventVersion: z.string().min(1).default("v1"),
  idempotencyKey: z.string().min(8),
  eventType: z.enum([
    "view_card",
    "swipe",
    "session_join",
    "session_result_click_map",
    "favorite",
    "dismiss",
    "search",
    "filter",
    "order_click",
    "booking_click",
    "deeplink_click",
    "view_menu_item",
    "click_menu_item",
  ]),
  eventName: z.string().optional(),
  timestamp: z.string().datetime(),
  platform: z.string().min(1),
  context: z.string().min(1),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  itemId: z.number().int().optional(),
  menuItemId: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const ingestBatchSchema = z.object({
  events: z.array(ingestEventSchema).min(1).max(200),
  // Optional profile hint so the backend can upsert a stub user_profiles row
  // without requiring a full LINE ID token verification on every batch.
  actorProfile: z.object({
    userId: z.string().min(1),
    displayName: z.string().min(1),
    pictureUrl: z.string().optional(),
  }).optional(),
});

export type IngestEvent = z.infer<typeof ingestEventSchema>;

export function validateEventTimestamp(eventIsoTs: string): "ok" | "invalid_timestamp" | "too_old" | "future_timestamp" {
  const eventTs = Date.parse(eventIsoTs);
  if (!Number.isFinite(eventTs)) return "invalid_timestamp";
  const now = Date.now();
  if (eventTs < now - 120 * 24 * 60 * 60 * 1000) return "too_old";
  if (eventTs > now + 10 * 60 * 1000) return "future_timestamp";
  return "ok";
}
