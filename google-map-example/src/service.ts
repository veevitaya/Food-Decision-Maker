import { SQLiteCache } from "./cache/sqliteCache.js";
import { CONFIG } from "./config.js";
import { GooglePlacesProvider } from "./providers/google.js";
import { OverpassProvider } from "./providers/overpass.js";
import { Place, SearchParams } from "./types.js";
import { db } from "./db.js";

const roundCoord = (n: number) => Math.round(n * 1e5) / 1e5;

export class PlacesService {
  private cache = new SQLiteCache<any>();
  private overpass = new OverpassProvider();
  private google = CONFIG.providerFallback === "google"
    ? new GooglePlacesProvider()
    : null;

  async search(params: SearchParams): Promise<Place[]> {
    console.log("[search] request", {
      lat: params.lat,
      lon: params.lon,
      radius: params.radius,
      query: params.query,
    });
    const key = this.cacheKey(params);
    const cached = this.cache.get(key);
    const isExpired = this.cache.isExpired(key);
    if (cached) {
      const isStale = isExpired;
      const cachedArr = cached as Place[];
      console.log(
        "[search] cache hit",
        isStale ? "(stale)" : "(fresh)",
        key,
        "count",
        cachedArr.length
      );

      // if cache too small, bypass and refetch
      if (cachedArr.length < CONFIG.minResultsBeforeUsingCache) {
        console.log(
          "[search] cache count below threshold -> refetch",
          cachedArr.length,
          "<",
          CONFIG.minResultsBeforeUsingCache
        );
        const refetch = await this.fetchFromProviders(params);
        const fresh = refetch.data;
        this.cache.set(key, fresh, CONFIG.cacheTtlPlacesMs);
        fresh.forEach((place) =>
          this.cache.set(this.placeKey(place.id), place, CONFIG.cacheTtlPlacesMs)
        );
        this.logRequest(
          params,
          fresh.length,
          refetch.sourceLabel || "refetch-cache-small",
          false,
          false,
          refetch.usedGoogleSearch,
          refetch.usedGooglePhoto
        );
        return fresh;
      }

      if (this.google && CONFIG.googlePhotoEnrich) {
        try {
          await this.enrichPhotos(cachedArr, params, key);
        } catch (err) {
          console.warn("[photo-enrich] failed on cache hit", err);
        }
      }
      if (isStale) {
        this.refreshInBackground(params, key).catch((err) =>
          console.warn("refresh failed", err)
        );
      }
      this.logRequest(
        params,
        cachedArr.length,
        "cache",
        true,
        false,
        false,
        false
      );
      return cachedArr;
    }

    // fresh fetch
    console.log("[search] cache miss -> fetching providers", key);
    const resultFresh = await this.fetchFromProviders(params);
    const data = resultFresh.data;
    this.cache.set(key, data, CONFIG.cacheTtlPlacesMs);
    data.forEach((place) =>
      this.cache.set(this.placeKey(place.id), place, CONFIG.cacheTtlPlacesMs)
    );
    console.log(
      "[search] fetched and cached",
      data.length,
      "places for",
      key,
      "| sources:",
      [...new Set(data.map((d) => d.source))].join(",")
    );
    this.logRequest(
      params,
      data.length,
      resultFresh.sourceLabel,
      false,
      false,
      resultFresh.usedGoogleSearch,
      resultFresh.usedGooglePhoto
    );
    return data;
  }

  async getPlace(id: string): Promise<Place | null> {
    const key = this.placeKey(id);
    const cached = this.cache.get(key);
    if (cached && !this.cache.isExpired(key)) return cached as Place;

    if (cached) {
      // stale but return
      this.refreshPlaceInBackground(id).catch((err) =>
        console.warn("refresh place failed", err)
      );
      return cached as Place;
    }
    return null;
  }

  private async refreshPlaceInBackground(id: string) {
    if (!id.startsWith("osm:")) return;
    const [type, rawId] = id.replace("osm:", "").split("-");
    if (!rawId) return;
    // We cannot query single id without additional fetch; skip for now
  }

  private async refreshInBackground(params: SearchParams, key: string) {
    const result = await this.fetchFromProviders(params);
    const data = result.data;
    this.cache.set(key, data, CONFIG.cacheTtlPlacesMs);
    data.forEach((place) =>
      this.cache.set(this.placeKey(place.id), place, CONFIG.cacheTtlPlacesMs)
    );
  }

  private async fetchFromProviders(params: SearchParams): Promise<{
    data: Place[];
    usedGoogleSearch: boolean;
    usedGooglePhoto: boolean;
    sourceLabel: string;
  }> {
    let usedGoogleSearch = false;
    let usedGooglePhoto = false;
    try {
      const overpassData = await this.overpass.search(params);
      console.log("[provider] overpass results", overpassData.length);
      if (overpassData.length > 0) {
        // enrich photos via Google if allowed
        if (this.google && CONFIG.googlePhotoEnrich) {
          const photoUsed = await this.enrichPhotos(overpassData, params);
          usedGooglePhoto = usedGooglePhoto || photoUsed;
        }
        return {
          data: overpassData,
          usedGoogleSearch,
          usedGooglePhoto,
          sourceLabel: this.currentSourceLabel(overpassData),
        };
      }
      if (this.google === null)
        return {
          data: overpassData,
          usedGoogleSearch,
          usedGooglePhoto,
          sourceLabel: this.currentSourceLabel(overpassData),
        };
      // fallback only when empty
      console.log("[provider] overpass empty -> fallback google");
      const googleData = await this.google.search(params);
      usedGoogleSearch = true;
      console.log("[provider] google results", googleData.length);
      return {
        data: googleData,
        usedGoogleSearch,
        usedGooglePhoto,
        sourceLabel: this.currentSourceLabel(googleData),
      };
    } catch (err) {
      console.warn("Overpass error", err);
      if (this.google) {
        try {
          console.log("[provider] try google after overpass error");
          const googleData = await this.google.search(params);
          usedGoogleSearch = true;
          console.log("[provider] google results", googleData.length);
          return {
            data: googleData,
            usedGoogleSearch,
            usedGooglePhoto,
            sourceLabel: this.currentSourceLabel(googleData),
          };
        } catch (err2) {
          console.warn("Google fallback error", err2);
        }
      }
      throw err;
    }
  }

  private cacheKey(params: SearchParams): string {
    const { lat, lon, radius, query } = params;
    return `places:${roundCoord(lat)}:${roundCoord(lon)}:${radius}:${
      query || "restaurant"
    }`;
  }

  private placeKey(id: string): string {
    return `place:${id}`;
  }

  /** Force fetch providers and refresh cache for given params */
  async prefetch(params: SearchParams): Promise<number> {
    const result = await this.fetchFromProviders(params);
    const data = result.data;
    const key = this.cacheKey(params);
    this.cache.set(key, data, CONFIG.cacheTtlPlacesMs);
    data.forEach((place) =>
      this.cache.set(this.placeKey(place.id), place, CONFIG.cacheTtlPlacesMs)
    );
    this.logRequest(
      params,
      data.length,
      result.sourceLabel,
      false,
      true,
      result.usedGoogleSearch,
      result.usedGooglePhoto
    );
    return data.length;
  }

  private async enrichPhotos(
    places: Place[],
    params: SearchParams,
    searchCacheKey?: string
  ): Promise<boolean> {
    let usedGoogle = false;
    // Limit API calls
    const targets = places
      .filter((p) => !p.photos || p.photos.length === 0)
      .slice(0, CONFIG.photoEnrichLimit);
    console.log(
      "[photo-enrich] candidates",
      targets.length,
      "of",
      places.length,
      "limit",
      CONFIG.photoEnrichLimit
    );
    if (!targets.length) {
      console.log("[photo-enrich] no targets, skip");
    }
    for (const p of targets) {
      try {
        console.log(
          `[photo-enrich] fetching photos for ${p.name} @ ${p.lat},${p.lon}`
        );
        const photos = await this.google?.findPhoto(p.name, p.lat, p.lon);
        if (photos && photos.length) {
          p.photos = photos;
          this.cache.set(this.placeKey(p.id), p, CONFIG.cacheTtlPlacesMs);
          console.log(
            `[photo-enrich] got ${photos.length} photos for ${p.name} (cached)`
          );
          usedGoogle = true;
          if (searchCacheKey) {
            // update aggregated search cache as well
            this.cache.set(searchCacheKey, places, CONFIG.cacheTtlPlacesMs);
          }
        } else {
          console.log(`[photo-enrich] no photos for ${p.name}`);
        }
      } catch (e) {
        console.warn("photo enrich failed", p.name, e);
      }
    }
    return usedGoogle;
  }

  private logRequest(
    params: SearchParams,
    count: number,
    source: string,
    cacheHit: boolean,
    force: boolean,
    usedGoogleSearch: boolean,
    usedGooglePhoto: boolean
  ) {
    try {
      db.prepare(
        "INSERT INTO logs (ts, lat, lon, radius, query, resultCount, source, cacheHit, force, googleSearch, googlePhoto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        Date.now(),
        params.lat,
        params.lon,
        params.radius,
        params.query || "restaurant",
        count,
        source,
        cacheHit ? 1 : 0,
        force ? 1 : 0,
        usedGoogleSearch ? 1 : 0,
        usedGooglePhoto ? 1 : 0
      );
    } catch (e) {
      console.warn("logRequest failed", e);
    }
  }

  private currentSourceLabel(data: Place[]): string {
    const set = new Set(data.map((d) => d.source));
    return Array.from(set).join(",");
  }
}
