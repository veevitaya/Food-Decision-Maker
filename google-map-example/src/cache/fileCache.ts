import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CacheEntry } from "../types.js";

/**
 * Lightweight JSON-file cache to avoid external dependencies (Redis/SQLite).
 * Suitable for low QPS or edge deployments. Keys are strings; values must be JSON-serializable.
 */
export class FileCache<T = unknown> {
  private data: Map<string, CacheEntry<T>> = new Map();
  private readonly filePath: string;

  constructor(filename = "cache.json") {
    const dir = join(process.cwd(), "data");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.filePath = join(dir, filename);
    this.load();
  }

  get(key: string): T | null {
    const entry = this.data.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      // stale
      return entry.value; // stale-while-revalidate: caller may choose to refresh
    }
    return entry.value;
  }

  isExpired(key: string): boolean {
    const entry = this.data.get(key);
    return !entry || Date.now() > entry.expiresAt;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.data.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.persist();
  }

  private load() {
    if (!existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed: Record<string, CacheEntry<T>> = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        this.data.set(k, v);
      }
    } catch {
      // ignore corrupted cache
    }
  }

  private persist() {
    const obj: Record<string, CacheEntry<T>> = {};
    for (const [k, v] of this.data.entries()) obj[k] = v;
    writeFileSync(this.filePath, JSON.stringify(obj), "utf8");
  }
}
