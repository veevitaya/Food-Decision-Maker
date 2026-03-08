import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "./AdminLayout";

type ImportLogLine = {
  ts: string;
  level: "info" | "error";
  message: string;
};

type ImportRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "success" | "error";
  params: {
    lat: number;
    lng: number;
    radius: number;
    keyword: string;
    locationFilter: string;
    maxResults: number;
    includeDetails: boolean;
    smallFetch: boolean;
  };
  summary: {
    fetched: number;
    processed: number;
    saved: number;
    failed: number;
  };
  logs: ImportLogLine[];
};

type ImportLogsResponse = { data: ImportRun[] };
type ImportResponse = { ok: true; run: ImportRun };

const inp = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-foreground bg-white";

export default function AdminRestaurantImport() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [lat, setLat] = useState("13.7563");
  const [lng, setLng] = useState("100.5018");
  const [radius, setRadius] = useState("2000");
  const [keyword, setKeyword] = useState("restaurant");
  const [locationFilter, setLocationFilter] = useState("");
  const [maxResults, setMaxResults] = useState("50");
  const [smallFetch, setSmallFetch] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const logsQuery = useQuery<ImportLogsResponse>({
    queryKey: ["admin-google-import-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/restaurants/import/logs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load import logs");
      return res.json();
    },
    refetchInterval: 4000,
  });

  const latestRun = useMemo(() => logsQuery.data?.data?.[0], [logsQuery.data]);

  const runMutation = useMutation<ImportResponse, Error>({
    mutationFn: async () => {
      setError("");
      const payload = {
        lat: Number(lat),
        lng: Number(lng),
        radius: Number(radius),
        keyword,
        locationFilter,
        maxResults: Number(maxResults),
        smallFetch,
        includeDetails,
      };

      const res = await fetch("/api/admin/restaurants/import/google", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message ?? "Import failed");
      }
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-google-import-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
    },
    onError: (e) => setError(e.message),
  });

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setLocating(false);
      },
      (err) => {
        setError(err.message || "Failed to get current location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  return (
    <AdminLayout title="Google Import">
      <div className="grid gap-5">
        <section className="bg-white border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Import Restaurants from Google Places</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Fills existing fields: Image URL, Address, Phone, Opening Hours, Reviews.
              </p>
            </div>
            <button className="px-3 py-2 border rounded-lg text-sm" onClick={() => navigate("/admin/restaurants")}>Back</button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Latitude</label>
              <input className={inp} value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Longitude</label>
              <input className={inp} value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Radius (meters)</label>
              <input className={inp} value={radius} onChange={(e) => setRadius(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Max Results</label>
              <input className={inp} value={maxResults} onChange={(e) => setMaxResults(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Keyword</label>
              <input className={inp} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="restaurant" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Location Filter (address contains)</label>
              <input
                className={inp}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="e.g. Don Mueang"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={smallFetch} onChange={(e) => setSmallFetch(e.target.checked)} />
              Small fetch test mode (max 5)
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={includeDetails} onChange={(e) => setIncludeDetails(e.target.checked)} />
              Include details (phone, hours, reviews)
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 bg-foreground text-white rounded-lg text-sm disabled:opacity-50"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
            >
              {runMutation.isPending ? "Fetching..." : "Run Google Import"}
            </button>
            <button
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              onClick={useCurrentLocation}
              disabled={locating}
            >
              {locating ? "Locating..." : "Use Current Location"}
            </button>
            <button className="px-3 py-2 border rounded-lg text-sm" onClick={() => logsQuery.refetch()}>Refresh Logs</button>
          </div>
        </section>

        {latestRun && (
          <section className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Latest Run</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  latestRun.status === "success"
                    ? "bg-green-100 text-green-700"
                    : latestRun.status === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {latestRun.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              fetched {latestRun.summary.fetched} · processed {latestRun.summary.processed} · saved {latestRun.summary.saved} · failed {latestRun.summary.failed}
            </p>
            <div className="max-h-72 overflow-auto rounded-lg border bg-muted/10 p-3 space-y-1">
              {latestRun.logs.map((line, idx) => (
                <div key={`${line.ts}-${idx}`} className="text-xs font-mono">
                  <span className="text-muted-foreground">{new Date(line.ts).toLocaleTimeString()} </span>
                  <span className={line.level === "error" ? "text-red-600" : "text-foreground"}>{line.message}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold">Run History</h3>
          </div>
          {logsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground px-4 py-4">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Started</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Params</th>
                  <th className="text-right px-3 py-2">Saved</th>
                  <th className="text-right px-3 py-2">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(logsQuery.data?.data ?? []).map((run) => (
                  <tr key={run.id}>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          run.status === "success"
                            ? "bg-green-100 text-green-700"
                            : run.status === "error"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {run.params.keyword} @ {run.params.radius}m {run.params.locationFilter ? `[${run.params.locationFilter}]` : ""} {run.params.smallFetch ? "(small)" : ""}
                    </td>
                    <td className="px-3 py-2 text-right">{run.summary.saved}</td>
                    <td className="px-3 py-2 text-right">{run.summary.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
