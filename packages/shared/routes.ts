import { z } from 'zod';
import { insertUserPreferenceSchema, userPreferences } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const restaurantListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string(),
  lat: z.string(),
  lng: z.string(),
  category: z.string(),
  priceLevel: z.number(),
  rating: z.string(),
  address: z.string(),
  isNew: z.boolean().nullable().optional(),
  trendingScore: z.number().nullable().optional(),
  source: z.enum(["cache", "osm", "google", "mixed"]).optional(),
  distanceMeters: z.number().optional(),
  photos: z.array(z.string()).optional(),
  freshnessScore: z.number().optional(),
  isFallback: z.boolean().optional(),
  phone: z.string().optional(),
  openingHours: z.array(z.object({
    day: z.string(),
    hours: z.string(),
  })).optional(),
  reviews: z.array(z.object({
    author: z.string(),
    rating: z.number().min(1).max(5),
    text: z.string(),
    timeAgo: z.string().optional(),
  })).optional(),
});

const analyticsEventSchema = z.object({
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
  ]),
  eventName: z.string().optional(),
  timestamp: z.string().datetime(),
  platform: z.string().min(1),
  context: z.string().min(1),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  itemId: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const api = {
  restaurants: {
    list: {
      method: 'GET' as const,
      path: '/api/restaurants' as const,
      input: z.object({
        mode: z.string().optional(), // 'trending', 'hot', 'new', 'nearby'
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        query: z.string().optional(),
        radius: z.coerce.number().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        localOnly: z.coerce.boolean().optional(),
        forceRefresh: z.coerce.boolean().optional(),
        sourcePreference: z.enum(["osm-first", "google-first", "hybrid"]).optional().default("osm-first"),
      }).optional(),
      responses: {
        200: z.array(restaurantListItemSchema),
      }
    },
    suggestions: {
      method: 'GET' as const,
      path: '/api/restaurants/suggestions' as const,
      responses: {
        200: z.array(restaurantListItemSchema),
      }
    }
  },
  preferences: {
    create: {
      method: 'POST' as const,
      path: '/api/preferences' as const,
      input: insertUserPreferenceSchema,
      responses: {
        201: z.custom<typeof userPreferences.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  events: {
    batch: {
      method: "POST" as const,
      path: "/api/events/batch" as const,
      input: z.object({
        events: z.array(analyticsEventSchema).min(1).max(200),
      }),
      responses: {
        200: z.object({
          accepted: z.number().int(),
          skipped: z.number().int(),
        }),
      },
    },
  },
  recommendations: {
    personalized: {
      method: "GET" as const,
      path: "/api/recommendations/personalized" as const,
      input: z.object({
        userId: z.string(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        limit: z.coerce.number().int().positive().max(50).optional().default(20),
      }),
      responses: {
        200: z.object({
          source: z.enum(["personalized", "segment", "trending"]),
          items: z.array(restaurantListItemSchema.extend({
            score: z.number(),
            explanation: z.array(z.string()),
          })),
        }),
      },
    },
  },
  privacy: {
    export: {
      method: "POST" as const,
      path: "/api/privacy/export" as const,
      input: z.object({
        userId: z.string(),
      }),
      responses: {
        200: z.object({
          userId: z.string(),
          events: z.array(z.unknown()),
          features: z.unknown().nullable(),
          consents: z.array(z.unknown()),
        }),
      },
    },
    delete: {
      method: "POST" as const,
      path: "/api/privacy/delete" as const,
      input: z.object({
        userId: z.string(),
      }),
      responses: {
        200: z.object({
          ok: z.boolean(),
          deleted: z.number().int(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type RestaurantResponse = z.infer<typeof api.restaurants.list.responses[200]>[0];
export type UserPreferenceResponse = z.infer<typeof api.preferences.create.responses[201]>;
