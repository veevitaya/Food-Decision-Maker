import { z } from 'zod';
import { insertRestaurantSchema, insertUserPreferenceSchema, restaurants, userPreferences } from './schema';

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
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof restaurants.$inferSelect>()),
      }
    },
    suggestions: {
      method: 'GET' as const,
      path: '/api/restaurants/suggestions' as const,
      responses: {
        200: z.array(z.custom<typeof restaurants.$inferSelect>()),
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
  }
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
