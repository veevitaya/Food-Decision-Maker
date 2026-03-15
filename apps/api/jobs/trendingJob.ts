import { db } from "../db";
import { trendingFeedCache } from "@shared/schema";
import { withJobLock } from "../lib/jobLock";
import { buildTrendingFeed } from "../services/trending/trendingService";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function refreshTrendingCache(): Promise<void> {
  const posts = await buildTrendingFeed();
  if (posts.length === 0) {
    console.log("[trendingJob] No posts built — keeping existing cache");
    return;
  }

  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

  // Keep only one row — delete all then insert fresh
  await db.delete(trendingFeedCache);
  await db.insert(trendingFeedCache).values({ posts, expiresAt });
  console.log(`[trendingJob] Cache refreshed with ${posts.length} posts, expires ${expiresAt.toISOString()}`);
}

export function startTrendingJob(): () => void {
  const intervalMs = CACHE_TTL_MS;

  const run = async () => {
    await withJobLock("trending-feed-job", async () => {
      try {
        await refreshTrendingCache();
      } catch (err) {
        console.error("[trendingJob] Failed:", err);
      }
    });
  };

  void run();
  const timer = setInterval(() => { void run(); }, intervalMs);
  return () => clearInterval(timer);
}
