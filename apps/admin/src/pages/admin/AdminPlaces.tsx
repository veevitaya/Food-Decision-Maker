import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AdminLayout from "./AdminLayout";

type PlaceHealth = {
  ok: boolean;
  provider: string;
  timestamp: string;
  stats: {
    totalRequests: number;
    last24hRequests: number;
    cacheHitRatio: number;
    fallbackRatio: number;
    sourceCounts: Record<string, number>;
  };
  alerts: { lowCacheHitRatio: boolean; highFallbackRatio: boolean };
};

type PlaceLog = {
  ts: string;
  source: string;
  cacheHit: boolean;
  fallbackUsed: boolean;
  query: string;
  resultCount: number;
};

const SOURCE_COLORS: Record<string, string> = {
  osm: "bg-green-100 text-green-700",
  google: "bg-blue-100 text-blue-700",
  cache: "bg-amber-100 text-amber-700",
  mixed: "bg-purple-100 text-purple-700",
};

function StatCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`border rounded-xl p-4 ${warn ? "border-red-200 bg-red-50" : "bg-white"}`}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 ${warn ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}

export default function AdminPlaces() {
  const qc = useQueryClient();
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchResult, setPrefetchResult] = useState<string | null>(null);

  const health = useQuery<PlaceHealth>({
    queryKey: ["admin-places-health"],
    queryFn: async () => {
      const res = await fetch("/api/admin/places/health", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const logs = useQuery<{ data: PlaceLog[]; count: number }>({
    queryKey: ["admin-places-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/places/logs?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  async function handlePrefetch() {
    setPrefetching(true);
    setPrefetchResult(null);
    try {
      const res = await fetch("/api/places/prefetch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: [
            { lat: 13.742, lng: 100.54, radius: 3000 },
            { lat: 13.756, lng: 100.502, radius: 3000 },
            { lat: 13.726, lng: 100.524, radius: 3000 },
          ],
        }),
      });
      const json = await res.json();
      setPrefetchResult(`Warmed ${json.prefetched}/${json.total} locations`);
      qc.invalidateQueries({ queryKey: ["admin-places-health"] });
      qc.invalidateQueries({ queryKey: ["admin-places-logs"] });
    } catch {
      setPrefetchResult("Prefetch failed");
    } finally {
      setPrefetching(false);
    }
  }

  const h = health.data;

  return (
    <AdminLayout title="Places Ops">
      <div className="grid gap-5">
        {/* Health Stats */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Provider Health</h2>
            <div className="flex gap-2 items-center">
              {prefetchResult && <span className="text-xs text-muted-foreground">{prefetchResult}</span>}
              <button
                onClick={handlePrefetch}
                disabled={prefetching}
                className="px-3 py-1.5 bg-foreground text-white rounded-lg text-sm disabled:opacity-50"
              >
                {prefetching ? "Warming…" : "Warm Cache (BKK)"}
              </button>
              <button onClick={() => health.refetch()} className="px-2 py-1.5 border rounded-lg text-sm">Refresh</button>
            </div>
          </div>
          {health.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {(h?.alerts.lowCacheHitRatio || h?.alerts.highFallbackRatio) && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {h?.alerts.lowCacheHitRatio && <p>⚠ Low cache hit ratio</p>}
                  {h?.alerts.highFallbackRatio && <p>⚠ High fallback ratio</p>}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <StatCard label="Total Requests" value={String(h?.stats.totalRequests ?? 0)} />
                <StatCard label="Last 24h" value={String(h?.stats.last24hRequests ?? 0)} />
                <StatCard label="Cache Hit %" value={`${h?.stats.cacheHitRatio ?? 0}%`} warn={h?.alerts.lowCacheHitRatio} />
                <StatCard label="Fallback %" value={`${h?.stats.fallbackRatio ?? 0}%`} warn={h?.alerts.highFallbackRatio} />
              </div>
              {h?.stats.sourceCounts && (
                <div className="bg-white border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-2">Source breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(h.stats.sourceCounts).map(([src, count]) => (
                      <span key={src} className={`text-xs px-2 py-1 rounded-full ${SOURCE_COLORS[src] ?? "bg-muted"}`}>
                        {src}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Provider: {h?.provider} · Last updated: {h?.timestamp ? new Date(h.timestamp).toLocaleTimeString() : "—"}
              </p>
            </>
          )}
        </section>

        {/* Logs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Request Logs</h2>
            <button onClick={() => logs.refetch()} className="text-xs text-muted-foreground hover:underline">Refresh</button>
          </div>
          {logs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2">Time</th>
                    <th className="text-left px-3 py-2">Source</th>
                    <th className="text-left px-3 py-2 hidden sm:table-cell">Query</th>
                    <th className="text-left px-3 py-2">Cache</th>
                    <th className="text-left px-3 py-2 hidden sm:table-cell">Fallback</th>
                    <th className="text-right px-3 py-2">Results</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(logs.data?.data ?? []).map((row, idx) => (
                    <tr key={`${row.ts}-${idx}`} className="hover:bg-muted/10">
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {new Date(row.ts).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded-full ${SOURCE_COLORS[row.source] ?? "bg-muted"}`}>
                          {row.source}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 hidden sm:table-cell text-muted-foreground">{row.query}</td>
                      <td className="px-3 py-1.5">{row.cacheHit ? "✓" : "—"}</td>
                      <td className="px-3 py-1.5 hidden sm:table-cell">{row.fallbackUsed ? "✓" : "—"}</td>
                      <td className="px-3 py-1.5 text-right">{row.resultCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground px-3 py-2 border-t">{logs.data?.count ?? 0} entries</p>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
