/**
 * Backfill analytics daily rollups for historical data.
 * Usage: npx tsx apps/api/scripts/backfillAnalytics.ts [--days=90]
 *
 * Safe to re-run: upserts existing rows (idempotent).
 * Skips dates where updatedAt is within the last 2 hours (recently computed).
 */

import { storage } from "../storage";
import { computeDailyRollup } from "../jobs/aggregationJob";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, val] = arg.replace(/^--/, "").split("=");
    return [key, val ?? "true"];
  }),
);

const daysBack = Math.min(Math.max(Number(args.days ?? 90), 1), 365);

async function main() {
  console.log(`Backfilling analytics rollups for last ${daysBack} days...`);
  const now = Date.now();
  const staleThresholdMs = 2 * 60 * 60 * 1000;

  for (let i = 0; i < daysBack; i++) {
    const dateStr = new Date(now - i * 86_400_000).toISOString().slice(0, 10);

    const existing = await storage.listDailyRollups(1);
    const existingRow = existing.find((r) => r.date === dateStr);
    if (existingRow && Date.now() - new Date(existingRow.updatedAt).getTime() < staleThresholdMs) {
      console.log(`  [skip] ${dateStr} — recently updated`);
      continue;
    }

    try {
      await computeDailyRollup(dateStr);
      console.log(`  [ok]   ${dateStr}`);
    } catch (err) {
      console.error(`  [fail] ${dateStr}:`, err);
    }
  }

  console.log("Backfill complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
