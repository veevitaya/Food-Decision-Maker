import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Repeat, TrendingUp, TrendingDown, Clock, Target,
  ExternalLink, MousePointer,
} from "lucide-react";
import { getTintVar } from "./adminUtils";

type DateRange = "7d" | "30d" | "all";

interface SessionKpis {
  total: number;
  completionRate: number;
  avgSwipesToMatch: number;
  avgTimeToMatchSecs: number;
  clickoutAfterMatchRate: number;
  abandonmentRate: number;
  prevTotal: number;
  prevCompletionRate: number;
  prevAvgSwipesToMatch: number;
  prevAvgTimeToMatchSecs: number;
  prevClickoutAfterMatchRate: number;
  prevAbandonmentRate: number;
}

interface FunnelStep {
  label: string;
  value: number;
  pct: number;
}

interface DailyVolume {
  day: string;
  sessions: number;
}

interface EntrySource {
  source: string;
  pct: number;
  color: string;
}

interface SegmentStats {
  pct: number;
  avgSwipes: number;
  matchRate: string;
  avgTime: string;
  clickoutRate: string;
}

interface RecentSession {
  id: string;
  user: string;
  type: string;
  swipes: number;
  matched: boolean;
  duration: string;
  clickout: boolean;
  time: string;
}

interface SwipeSessionsData {
  kpis: SessionKpis;
  funnel: FunnelStep[];
  dailyVolume: DailyVolume[];
  entrySources: EntrySource[];
  segments: { solo: SegmentStats; group: SegmentStats };
  recentSessions: RecentSession[];
}

function fmtSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function trendLabel(current: number, prev: number, suffix = ""): { trend: string; up: boolean } {
  if (prev === 0) return { trend: current > 0 ? `+${current}${suffix}` : `0${suffix}`, up: current >= 0 };
  const diff = current - prev;
  const pct = Math.round((diff / prev) * 100);
  return { trend: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

export default function AdminSwipeSessions() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 365;

  const { data, isLoading } = useQuery<SwipeSessionsData>({
    queryKey: ["/api/admin/analytics/swipe-sessions", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/swipe-sessions?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const kpis = data?.kpis;
  const maxSessions = data ? Math.max(...data.dailyVolume.map(d => d.sessions), 1) : 1;

  const kpiCards = kpis
    ? [
        { label: "Total Sessions", value: kpis.total.toLocaleString(), ...trendLabel(kpis.total, kpis.prevTotal), icon: Repeat, color: "var(--admin-deep-purple)" },
        { label: "Completion Rate", value: `${kpis.completionRate}%`, ...trendLabel(kpis.completionRate, kpis.prevCompletionRate, "%"), icon: Target, color: "var(--admin-cyan)" },
        { label: "Avg Swipes to Match", value: String(kpis.avgSwipesToMatch), ...trendLabel(kpis.avgSwipesToMatch, kpis.prevAvgSwipesToMatch), icon: MousePointer, color: "var(--admin-pink)" },
        { label: "Avg Time to Match", value: fmtSeconds(kpis.avgTimeToMatchSecs), ...trendLabel(kpis.avgTimeToMatchSecs, kpis.prevAvgTimeToMatchSecs, "s"), icon: Clock, color: "var(--admin-blue)" },
        { label: "Clickout After Match", value: `${kpis.clickoutAfterMatchRate}%`, ...trendLabel(kpis.clickoutAfterMatchRate, kpis.prevClickoutAfterMatchRate, "%"), icon: ExternalLink, color: "var(--admin-teal)" },
        { label: "Abandonment Rate", value: `${kpis.abandonmentRate}%`, ...trendLabel(kpis.abandonmentRate, kpis.prevAbandonmentRate, "%"), up: kpis.abandonmentRate <= kpis.prevAbandonmentRate, icon: TrendingDown, color: "var(--admin-pink)" },
      ]
    : null;

  return (
    <div className="space-y-8" data-testid="admin-swipe-sessions-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Repeat className="w-5 h-5" style={{ color: "var(--admin-deep-purple)" }} />
          <div>
            <h2 className="text-xl font-semibold text-gray-800" data-testid="text-sessions-title">Swipe Sessions</h2>
            <p className="text-xs text-muted-foreground">Session volume, completion, and user journey analysis</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["7d", "30d", "all"] as const).map(k => (
            <button key={k} onClick={() => setDateRange(k)} data-testid={`tab-date-${k}`}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${dateRange === k ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {k === "7d" ? "7 days" : k === "30d" ? "30 days" : "All time"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {isLoading || !kpiCards
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
          : kpiCards.map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 overflow-hidden" data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="h-[3px]" style={{ backgroundColor: kpi.color }} />
              <div className="p-4 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: getTintVar(kpi.color) }}>
                    <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpi.up ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                  <span className={`text-[11px] font-medium ${kpi.up ? "text-emerald-600" : "text-red-500"}`}>{kpi.trend}</span>
                  <span className="text-[10px] text-gray-400">vs prev</span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Funnel + Daily Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-session-funnel">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Product Funnel</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">App open → Partner clickout</p>
          </div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({length: 5}).map((_,i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : !data || data.funnel[0].value === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
              <Repeat className="w-7 h-7 opacity-30" />
              <span className="text-sm">No session data yet</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {data.funnel.map((step, idx) => (
                  <div key={step.label} className="flex items-center gap-3" data-testid={`funnel-step-${idx}`}>
                    <div className="w-10 text-right">
                      <span className="text-xs font-medium text-muted-foreground">{step.pct}%</span>
                    </div>
                    <div className="flex-1 h-8 rounded-lg bg-gray-50 overflow-hidden relative">
                      <div className="h-full rounded-lg transition-all" style={{ width: `${Math.max(step.pct, 4)}%`, backgroundColor: `rgba(139, 92, 246, ${0.12 + idx * 0.18})` }} />
                    </div>
                    <span className="w-44 text-xs text-foreground font-medium">{step.label}</span>
                    <span className="w-16 text-right text-xs text-gray-500 font-medium">{step.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                {data.funnel.slice(0, -1).map((step, idx) => {
                  const next = data.funnel[idx + 1];
                  const dropoff = step.value > 0 ? Math.round((1 - next.value / step.value) * 100) : 0;
                  return (
                    <div key={idx} className="flex-1 text-center">
                      <p className="text-[10px] text-gray-400">Drop-off</p>
                      <p className="text-xs font-semibold text-gray-600">{dropoff}%</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Daily Volume */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-daily-volume">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Daily Volume</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Sessions by day of week</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="flex items-end gap-2 h-40">
              {(data?.dailyVolume ?? []).map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-gray-600">{d.sessions.toLocaleString()}</span>
                  <div className="w-full rounded-t-md" style={{
                    height: `${maxSessions > 0 ? (d.sessions / maxSessions) * 100 : 0}%`,
                    minHeight: d.sessions > 0 ? "4px" : "0",
                    backgroundColor: "var(--admin-blue)",
                    opacity: d.sessions === maxSessions ? 1 : 0.4,
                  }} />
                  <span className="text-[10px] text-muted-foreground font-medium">{d.day}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Entry Sources + Segment Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Entry Sources */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-entry-sources">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-cyan)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Entry Sources</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">How users start sessions</p>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : !data || data.entrySources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
              <Target className="w-6 h-6 opacity-30" />
              <span className="text-xs">No source data yet</span>
            </div>
          ) : (
            <div className="space-y-3">
              {data.entrySources.map(s => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-gray-600 font-medium truncate">{s.source}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-gray-700">{s.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Segment Comparison */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-segment-comparison">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Segment Comparison</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Solo vs Group behavior</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {([
                ["Solo Sessions", data?.segments.solo],
                ["Group Sessions", data?.segments.group],
              ] as const).map(([label, seg]) => (
                <div key={label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                    <span className="text-xs text-gray-500">{seg?.pct ?? 0}% of total</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {([
                      ["Avg Swipes", seg ? String(seg.avgSwipes) : "—"],
                      ["Match Rate", seg?.matchRate ?? "—"],
                      ["Avg Time", seg?.avgTime ?? "—"],
                      ["Clickout Rate", seg?.clickoutRate ?? "—"],
                    ] as const).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-semibold text-gray-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-recent-sessions">
        <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
          <h3 className="text-[15px] font-semibold text-gray-800">Recent Sessions</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Latest swipe session drilldown</p>
        </div>
        {isLoading ? (
          <div className="space-y-2">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !data || data.recentSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
            <Repeat className="w-7 h-7 opacity-30" />
            <span className="text-sm">No recent sessions yet</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="table-recent-sessions">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Session ID", "User", "Type", "Swipes", "Matched", "Duration", "Clickout", "Time"].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentSessions.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-700">{s.id}</td>
                    <td className="py-2.5 px-3 text-gray-600">{s.user}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${s.type === "Group" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-600"}`}>{s.type}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-700">{s.swipes}</td>
                    <td className="py-2.5 px-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${s.matched ? "bg-emerald-400" : "bg-gray-300"}`} />
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{s.duration}</td>
                    <td className="py-2.5 px-3">
                      {s.clickout ? <ExternalLink className="w-3.5 h-3.5 text-blue-500" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-gray-400">{s.time}</td>
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
