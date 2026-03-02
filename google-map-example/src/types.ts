export type Source = "osm" | "google";

export interface Place {
  id: string; // unique per source, prefixed with source
  source: Source;
  lat: number;
  lon: number;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  cuisine?: string[];
  openingHours?: string;
  tags?: Record<string, string>;
  updatedAt?: string; // ISO string
  freshnessScore?: number; // 0-1, derived from data age
  photos?: string[]; // URL list (can be presigned / external)
}

export interface SearchParams {
  lat: number;
  lon: number;
  radius: number;
  query: string;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms
}

export interface BoundingBoxPrefetch {
  lat: number;
  lon: number;
  radius: number;
  query?: string;
}
