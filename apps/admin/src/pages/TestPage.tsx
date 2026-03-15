import { useState } from "react";

type JsonRecord = Record<string, unknown>;

function sampleEvent() {
  const now = new Date().toISOString();
  const random = Math.random().toString(36).slice(2, 10);
  return {
    eventId: `evt_test_${Date.now()}_${random}`,
    eventVersion: "v1",
    idempotencyKey: `idem_test_${Date.now()}_${random}`,
    eventType: "view_card",
    timestamp: now,
    platform: "web",
    context: "/test",
    userId: "test-user",
    sessionId: `test-session-${new Date().toISOString().slice(0, 10)}`,
    itemId: 1,
    metadata: {
      source: "admin_test_page",
      lat: 13.7563,
      lng: 100.5018,
    },
  };
}

export default function TestPage() {
  const [result, setResult] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [section, setSection] = useState<"ingest" | "queue" | "dlq">("ingest");

  async function callApi(path: string, method: "GET" | "POST", body?: unknown) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(path, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      setResult({
        ok: res.ok,
        status: res.status,
        path,
        data: json,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Test Space</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">Feature Sandbox</h2>
        <div className="mt-5 space-y-2">
          <button
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${section === "ingest" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            onClick={() => setSection("ingest")}
          >
            Event Ingest
          </button>
          <button
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${section === "queue" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            onClick={() => setSection("queue")}
          >
            Queue Status
          </button>
          <button
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${section === "dlq" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            onClick={() => setSection("dlq")}
          >
            DLQ Replay
          </button>
        </div>
      </aside>

      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Temporary Test Route</h1>
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Dev/Staging only: this test page must not be exposed in production.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            ???????? Redis event ingest ??????????? <code>/test</code> ??????????????????????????
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => callApi("/api/events/batch", "POST", { events: [sampleEvent()] })}
              disabled={loading}
            >
              Send Test Event
            </button>
            <button
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => callApi("/api/admin/events/queue-status", "GET")}
              disabled={loading}
            >
              Check Queue Status
            </button>
            <button
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => callApi("/api/admin/events/replay-dlq", "POST", { limit: 50 })}
              disabled={loading}
            >
              Replay DLQ
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          <div className="mt-6 rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
            <pre className="overflow-auto whitespace-pre-wrap">
              {result ? JSON.stringify(result, null, 2) : "No response yet"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
