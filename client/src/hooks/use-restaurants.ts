import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type RestaurantResponse, type UserPreferenceResponse } from "@shared/routes";
import { z } from "zod";

type RestaurantsQueryOptions = {
  mode?: string;
  lat?: number;
  lng?: number;
  query?: string;
  radius?: number;
  forceRefresh?: boolean;
  sourcePreference?: "osm-first" | "google-first" | "hybrid";
};

// Fetch restaurants for the swipe deck
export function useRestaurants(options: RestaurantsQueryOptions = {}) {
  const {
    mode,
    lat,
    lng,
    query,
    radius,
    forceRefresh,
    sourcePreference,
  } = options;

  return useQuery({
    queryKey: [
      api.restaurants.list.path,
      { mode, lat, lng, query, radius, forceRefresh, sourcePreference },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mode) params.append("mode", mode);
      if (typeof lat === "number") params.append("lat", String(lat));
      if (typeof lng === "number") params.append("lng", String(lng));
      if (query) params.append("query", query);
      if (typeof radius === "number") params.append("radius", String(radius));
      if (typeof forceRefresh === "boolean") {
        params.append("forceRefresh", String(forceRefresh));
      }
      if (sourcePreference) params.append("sourcePreference", sourcePreference);

      const url = params.toString() ? `${api.restaurants.list.path}?${params.toString()}` : api.restaurants.list.path;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch restaurants");

      const data = await res.json();
      return api.restaurants.list.responses[200].parse(data);
    },
  });
}

// Fetch suggestions (Because you liked...)
export function useSuggestions() {
  return useQuery({
    queryKey: [api.restaurants.suggestions.path],
    queryFn: async () => {
      const res = await fetch(api.restaurants.suggestions.path, { credentials: "include" });
      if (!res.ok) {
        // Fallback to empty array if endpoint doesn't exist yet so UI doesn't break entirely
        if (res.status === 404) return [];
        throw new Error("Failed to fetch suggestions");
      }
      
      const data = await res.json();
      return api.restaurants.suggestions.responses[200].parse(data);
    },
  });
}

// Record a swipe preference (like/dislike/save)
export function useRecordPreference() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { userId: string; restaurantId: number; preference: string }) => {
      const validated = api.preferences.create.input.parse(data);
      
      const res = await fetch(api.preferences.create.path, {
        method: api.preferences.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to record preference");
      
      const resultData = await res.json();
      return api.preferences.create.responses[201].parse(resultData);
    },
    onSuccess: () => {
      // Invalidate suggestions or other queries if needed after a swipe
      // queryClient.invalidateQueries({ queryKey: [api.restaurants.suggestions.path] });
    },
  });
}
