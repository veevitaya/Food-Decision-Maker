import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { getAuthHeaders } from "@/lib/auth";

type PlaceHealth = {
  ok: boolean;
  provider: string;
  timestamp: string;
};

type PlaceLogs = {
  data: Array<{
    ts: string;
    source: string;
    cacheHit: boolean;
    fallbackUsed: boolean;
    query: string;
    resultCount: number;
  }>;
  count: number;
};

export default function AdminPlaces() {
  const health = useQuery<PlaceHealth>({
    queryKey: ["admin-places-health"],
    queryFn: async () => {
      const res = await fetch("/api/admin/places/health", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load places health");
      return res.json();
    },
  });

  const logs = useQuery<PlaceLogs>({
    queryKey: ["admin-places-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/places/logs?limit=50", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load places logs");
      return res.json();
    },
  });

  return (
    <AdminLayout title="Places Ops">
      <div className="grid gap-4">
        <section className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-2">Provider Health</h2>
          {health.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading health...</p>
          ) : (
            <div className="text-sm">
              <p>OK: {String(health.data?.ok ?? false)}</p>
              <p>Provider: {health.data?.provider}</p>
              <p>Timestamp: {health.data?.timestamp}</p>
            </div>
          )}
        </section>
        <section className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-2">Request Logs</h2>
          {logs.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading logs...</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    <th className="py-1 pr-2">Time</th>
                    <th className="py-1 pr-2">Source</th>
                    <th className="py-1 pr-2">Cache</th>
                    <th className="py-1 pr-2">Fallback</th>
                    <th className="py-1 pr-2">Results</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs.data?.data ?? []).map((row, idx) => (
                    <tr key={`${row.ts}-${idx}`} className="border-t">
                      <td className="py-1 pr-2">{row.ts}</td>
                      <td className="py-1 pr-2">{row.source}</td>
                      <td className="py-1 pr-2">{String(row.cacheHit)}</td>
                      <td className="py-1 pr-2">{String(row.fallbackUsed)}</td>
                      <td className="py-1 pr-2">{row.resultCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
