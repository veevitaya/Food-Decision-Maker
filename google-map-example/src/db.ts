import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG } from "./config.js";

export const db = (() => {
  const dbPath = CONFIG.dbPath;
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const instance = new Database(dbPath);
  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expiresAt INTEGER NOT NULL
      )`
    )
    .run();
  instance
    .prepare(
      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        lat REAL,
        lon REAL,
        radius REAL,
        query TEXT,
        resultCount INTEGER,
        source TEXT,
        cacheHit INTEGER,
        force INTEGER,
        googleSearch INTEGER DEFAULT 0,
        googlePhoto INTEGER DEFAULT 0
      )`
    )
    .run();
  // add new columns if table already existed
  try {
    instance.prepare("ALTER TABLE logs ADD COLUMN googleSearch INTEGER DEFAULT 0").run();
  } catch {}
  try {
    instance.prepare("ALTER TABLE logs ADD COLUMN googlePhoto INTEGER DEFAULT 0").run();
  } catch {}
  return instance;
})();
