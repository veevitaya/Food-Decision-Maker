import pg from "pg";
import { getQueueStatus, shouldUseRedisIngest } from "../../lib/eventQueue";

const { Pool } = pg;

type BatchResponse = {
  accepted: number;
  skipped: number;
  ingestion: "queued" | "persisted";
};

const argv = process.argv.slice(2).filter((token) => token !== "--");

function parseArg(index: number, fallback: number): number {
  const raw = Number(argv[index] ?? fallback);
  return Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : fallback;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiPort = process.env.API_PORT ?? "5002";
  const apiBase = process.env.API_BASE_URL?.trim() || `http://localhost:${apiPort}`;
  const totalEvents = parseArg(0, 300);
  const batchSize = Math.min(parseArg(1, 100), 200);
  const waitSeconds = parseArg(2, 45);
  const runId = `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const itemId = Number(process.env.SMOKE_ITEM_ID ?? 1);

  console.log(`[smoke] apiBase=${apiBase}`);
  console.log(`[smoke] totalEvents=${totalEvents} batchSize=${batchSize} waitSeconds=${waitSeconds}`);
  console.log(`[smoke] runId=${runId}`);

  let acceptedTotal = 0;
  let skippedTotal = 0;

  for (let offset = 0; offset < totalEvents; offset += batchSize) {
    const count = Math.min(batchSize, totalEvents - offset);
    const events = Array.from({ length: count }, (_, index) => {
      const seq = offset + index;
      const id = `${runId}_${seq}`;
      return {
        eventId: `evt_${id}`,
        eventVersion: "v1",
        idempotencyKey: `idem_${id}`,
        eventType: "view_card",
        timestamp: new Date().toISOString(),
        platform: "web",
        context: "/smoke-ingest",
        sessionId: `sess_${runId}`,
        itemId,
        metadata: {
          source: "smoke_script",
          runId,
          seq,
          lat: 13.7563,
          lng: 100.5018,
        },
      };
    });

    const response = await fetch(`${apiBase}/api/events/batch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`[smoke] /api/events/batch failed: ${response.status} ${body}`);
    }
    const body = (await response.json()) as BatchResponse;
    acceptedTotal += body.accepted;
    skippedTotal += body.skipped;
  }

  console.log(`[smoke] ingest submitted: accepted=${acceptedTotal} skipped=${skippedTotal}`);
  if (shouldUseRedisIngest()) {
    try {
      const status = await getQueueStatus();
      console.log(`[smoke] queue after ingest: ${JSON.stringify(status)}`);
    } catch (error) {
      console.log(`[smoke] queue status unavailable: ${String(error)}`);
    }
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const deadline = Date.now() + waitSeconds * 1000;
    let inserted = 0;
    while (Date.now() < deadline) {
      const result = await pool.query<{ c: string }>(
        "SELECT COUNT(*)::text AS c FROM event_logs WHERE idempotency_key LIKE $1",
        [`idem_${runId}_%`],
      );
      inserted = Number(result.rows[0]?.c ?? 0);
      console.log(`[smoke] inserted=${inserted}/${acceptedTotal}`);
      if (inserted >= acceptedTotal) break;
      await sleep(1000);
    }

    const finalResult = await pool.query<{ c: string }>(
      "SELECT COUNT(*)::text AS c FROM event_logs WHERE idempotency_key LIKE $1",
      [`idem_${runId}_%`],
    );
    const finalInserted = Number(finalResult.rows[0]?.c ?? 0);

    const pass = finalInserted >= acceptedTotal;
    console.log(
      `[smoke] done: inserted=${finalInserted}, accepted=${acceptedTotal}, skipped=${skippedTotal}, pass=${pass}`,
    );
    if (!pass) {
      process.exit(2);
    }
    process.exit(0);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
