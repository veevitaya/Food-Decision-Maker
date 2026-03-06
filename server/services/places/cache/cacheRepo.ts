import type { NormalizedPlace } from "../types.js";

// Read at call-time so env vars can be changed in tests
const getTTL = () => Number(process.env.CACHE_TTL_PLACES ?? 7 * 24 * 60 * 60 * 1000);
const getMinResults = () => Number(process.env.MIN_RESULTS_BEFORE_CACHE ?? 5);

interface CacheEntry {
  data: NormalizedPlace[];
  storedAt: number;
}

const store = new Map<string, CacheEntry>();

/** Round to 5 decimal places (~1m precision) */
function r5(n: number): string {
  return n.toFixed(5);
}

export function buildKey(lat: number, lng: number, radius: number, query: string): string {
  return `places:${r5(lat)}:${r5(lng)}:${radius}:${query}`;
}

export function get(key: string): CacheEntry | undefined {
  return store.get(key);
}

export function set(key: string, data: NormalizedPlace[]): void {
  store.set(key, { data, storedAt: Date.now() });
}

export function isStale(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  return Date.now() - entry.storedAt > getTTL();
}

export function isSufficient(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  return entry.data.length >= getMinResults();
}

export function isFreshAndSufficient(key: string): boolean {
  return !isStale(key) && isSufficient(key);
}

/** Clear all cache entries — for testing only */
export function _clearForTest(): void {
  store.clear();
}
