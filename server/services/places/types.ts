export interface NormalizedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  category: string;
  rating?: string;
  priceLevel?: number;
  photos?: string[];
  phone?: string;
  source: "osm" | "google" | "cache" | "mixed";
  distanceMeters?: number;
  freshnessScore?: number;
  isFallback?: boolean;
}

export interface PlacesQuery {
  lat: number;
  lng: number;
  radius?: number;
  query?: string;
  mode?: string;
  forceRefresh?: boolean;
  sourcePreference?: "osm-first" | "google-first" | "hybrid";
}

export interface PlacesResult {
  data: NormalizedPlace[];
  source: "osm" | "google" | "cache" | "mixed";
  fromCache: boolean;
  isFallback: boolean;
}
