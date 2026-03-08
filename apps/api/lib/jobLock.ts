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

/** Stable integer lock IDs — arbitrary but unique per job. */
const JOB_LOCK_IDS: Record<string, number> = {
  "aggregation-job": 1001,
  "feature-update-job": 1002,
  "data-retention-job": 1003,
  "analytics-quality-job": 1004,
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

  const client = await pool.connect();
  try {
    const result = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [lockId],
    );

    if (!result.rows[0]?.acquired) {
      // Another instance is already running this job — skip
      return;
    }

    await fn();
  } finally {
    // Release the advisory lock before returning the connection to the pool
    await client.query("SELECT pg_advisory_unlock($1)", [lockId]);
    client.release();
  }
}
