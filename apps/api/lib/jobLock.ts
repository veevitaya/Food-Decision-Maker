/**
 * DB-backed job lock using PostgreSQL advisory locks.
 *
 * pg_try_advisory_lock(bigint) acquires a session-level advisory lock.
 * If another connection already holds the lock, it returns false immediately
 * (no blocking). The lock is automatically released when the connection is
 * returned to the pool.
 *
 * This ensures that, when multiple server instances share the same database,
 * only ONE instance runs any given background job at a time. No Redis needed.
 */
import { pool } from "../db";
import type { PoolClient } from "pg";

/** Stable integer lock IDs — arbitrary but unique per job. */
const JOB_LOCK_IDS: Record<string, number> = {
  "aggregation-job": 1001,
  "feature-update-job": 1002,
  "data-retention-job": 1003,
  "analytics-quality-job": 1004,
  "event-ingest-worker": 1005,
  "queue-monitor-job": 1006,
  "trending-feed-job": 1007,
};

/**
 * Runs `fn` only if this process can acquire the advisory lock for `jobName`.
 * If another server instance holds the lock, the current run is skipped silently.
 */
export async function withJobLock(jobName: string, fn: () => Promise<void>): Promise<void> {
  const lockId = JOB_LOCK_IDS[jobName];
  if (lockId === undefined) {
    throw new Error(`[jobLock] Unknown job name: "${jobName}". Register it in JOB_LOCK_IDS.`);
  }

  let client: PoolClient | undefined;
  let lockAcquired = false;
  try {
    client = await pool.connect();
    const result = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [lockId],
    );

    lockAcquired = !!result.rows[0]?.acquired;
    if (!lockAcquired) {
      // Another instance is already running this job — skip
      return;
    }

    await fn();
  } catch (error) {
    // Background jobs should never bring down the API process.
    console.error(`[jobLock] ${jobName} skipped: ${String(error)}`);
  } finally {
    if (!client) return;

    if (lockAcquired) {
      // Release the advisory lock before returning the connection to the pool.
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [lockId]);
      } catch (unlockError) {
        console.error(`[jobLock] ${jobName} unlock failed: ${String(unlockError)}`);
      }
    }

    client.release();
  }
}
