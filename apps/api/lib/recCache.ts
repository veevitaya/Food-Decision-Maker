/**
 * Per-user recommendation cache
 *
 * Caches the result of buildPersonalizedRecommendations() per user with a 5-minute TTL.
 * Invalidated when a user's feature snapshot is rebuilt (i.e. after new swipe events).
 *
 * At scale this should be replaced by Redis, but this in-process cache already
 * eliminates redundant DB reads + scoring for the majority of requests.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function getRecCache(userId: string): unknown | undefined {
  const entry = store.get(userId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(userId);
    return undefined;
  }
  return entry.data;
}

export function setRecCache(userId: string, data: unknown): void {
  store.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateRecCache(userId: string): void {
  store.delete(userId);
}

// Cleanup expired entries every 10 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 10 * 60 * 1000).unref();
