import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink, TrendingUp, MapPin, Phone, MessageCircle,
  Navigation, Calendar, Clock, ArrowRight
} from "lucide-react";
import { getTintVar } from "./adminUtils";

type DateRange = "7d" | "30d" | "all";

const PARTNER_COLORS: Record<string, string> = {
  grab: "#00B14F",
  lineman: "#06C755",
  robinhood: "#6C2BD9",
  unknown: "var(--admin-blue)",
};

const PARTNER_LABELS: Record<string, string> = {
  grab: "Grab",
  lineman: "LINE MAN",
  robinhood: "Robinhood",
  unknown: "Other",
};

const DAYPART_COLORS = ["var(--admin-blue)", "var(--admin-cyan)", "var(--admin-teal)", "var(--admin-pink)", "var(--admin-deep-purple)"];

type ClickoutsData = {
  total: number;
  days: number;
  byPlatform: Record<string, number>;
  topRestaurants: { restaurantId: number; name: string; count: number }[];
  dayparts: { daypart: string; count: number; pct: number }[];
};

export default function AdminPartnerClickouts() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 365;

  const { data, isLoading } = useQuery<ClickoutsData>({
    queryKey: ["/api/admin/analytics/clickouts", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/clickouts?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load clickouts");
      return res.json();
    },
  });

  const total = data?.total ?? 0;
  const platforms = Object.entries(data?.byPlatform ?? {}).sort((a, b) => b[1] - a[1]);

  const kpis = [
    { label: "Total Clickouts", value: total.toLocaleString(), trend: "", up: true, icon: ExternalLink, color: "var(--admin-teal)" },
    { label: "Top Platform", value: platforms[0]?.[0] ? PARTNER_LABELS[platforms[0][0]] ?? platforms[0][0] : "—", trend: "", up: true, icon: TrendingUp, color: "var(--admin-cyan)" },
    { label: "Restaurants", value: String(data?.topRestaurants.length ?? 0), trend: "", up: true, icon: MapPin, color: "var(--admin-blue)" },
    { label: "Tracked Days", value: String(days), trend: "", up: true, icon: Clock, color: "var(--admin-deep-purple)" },
  ];

  return (
    <div className="space-y-8" data-testid="admin-partner-clickouts-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ExternalLink className="w-5 h-5" style={{ color: "var(--admin-teal)" }} />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Partner Clickouts</h2>
            <p className="text-xs text-muted-foreground">Outbound intent actions to delivery partners — live from event_logs</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["7d", "30d", "all"] as const).map(k => (
            <button key={k} onClick={() => setDateRange(k)} className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${dateRange === k ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {k === "7d" ? "7 days" : k === "30d" ? "30 days" : "All time"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="h-[3px]" style={{ backgroundColor: kpi.color }} />
              <div className="p-4 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: getTintVar(kpi.color) }}>
                    <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-partner-breakdown">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Partner Breakdown</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Clickouts by channel</p>
          </div>
          {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}</div> : (
            <div className="space-y-3">
              {platforms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clickout data yet for this period.</p>
              ) : platforms.map(([platform, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const color = PARTNER_COLORS[platform] ?? "var(--admin-blue)";
                const label = PARTNER_LABELS[platform] ?? platform;
                return (
                  <div key={platform} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="w-24 text-xs text-gray-700 font-medium">{label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="w-14 text-right text-xs font-semibold text-gray-700">{count.toLocaleString()}</span>
                    <span className="w-10 text-right text-[10px] text-gray-400">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-gray-100 p-3 rounded-lg bg-amber-50/50 border-amber-100/50">
            <div className="flex items-start gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700">
                <strong>Live data:</strong> Confirmed partner attribution (actual orders completed) will be tracked once delivery partner APIs are integrated.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-daypart-clickouts">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">By Daypart</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">When users tap to delivery</p>
          </div>
          {isLoading ? <div className="h-28 bg-gray-100 rounded animate-pulse" /> : (
            <div className="flex items-end gap-2 h-28">
              {(data?.dayparts ?? []).map((d, i) => (
                <div key={d.daypart} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-gray-600">{d.pct}%</span>
                  <div className="w-full rounded-t-md" style={{ height: `${Math.max(d.pct * 2.5, 4)}%`, backgroundColor: DAYPART_COLORS[i % DAYPART_COLORS.length], opacity: d.pct > 25 ? 1 : 0.45 }} />
                  <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight">{d.daypart}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-top-restaurants-clickouts">
        <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
          <h3 className="text-[15px] font-semibold text-gray-800">Top Restaurants by Clickouts</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Live from event_logs · deeplink_click events</p>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : (data?.topRestaurants ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No clickout data yet. Delivery taps will appear here once users start clicking through.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["#", "Restaurant", "Total Clickouts"].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.topRestaurants ?? []).map((r, idx) => (
                  <tr key={r.restaurantId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-3 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-800">{r.name}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-800">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
