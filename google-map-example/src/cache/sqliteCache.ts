import { db } from "../db.js";
import { CacheEntry } from "../types.js";

export class SQLiteCache<T = unknown> {
  private selectStmt = db.prepare(
    "SELECT value, expiresAt FROM cache WHERE key = ?"
  );
  private upsertStmt = db.prepare(
    "INSERT INTO cache (key, value, expiresAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, expiresAt=excluded.expiresAt"
  );

  get(key: string): T | null {
    const row = this.selectStmt.get(key) as
      | { value: string; expiresAt: number }
      | undefined;
    if (!row) return null;
    try {
      const entry: CacheEntry<T> = {
        value: JSON.parse(row.value),
        expiresAt: row.expiresAt,
      };
      return entry.value;
    } catch {
      return null;
    }
  }

  isExpired(key: string): boolean {
    const row = this.selectStmt.get(key) as
      | { value: string; expiresAt: number }
      | undefined;
    if (!row) return true;
    return Date.now() > row.expiresAt;
  }

  set(key: string, value: T, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.upsertStmt.run(key, JSON.stringify(value), expiresAt);
  }
}
