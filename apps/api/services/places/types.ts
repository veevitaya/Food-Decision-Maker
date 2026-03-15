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
  source: "google" | "cache";
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
}

export interface PlacesResult {
  data: NormalizedPlace[];
  source: "google" | "cache";
  fromCache: boolean;
  isFallback: boolean;
}
