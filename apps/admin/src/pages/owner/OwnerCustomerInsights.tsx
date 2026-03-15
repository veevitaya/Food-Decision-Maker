import { useQuery } from "@tanstack/react-query";
import { getAdminSession } from "../admin/AdminLayout";
import {
  Users,
  Clock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  User,
  Heart,
  Tag,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface CustomerInsightsData {
  cuisineOverlaps: { cuisine: string; overlap: number; trend: string; rising: boolean }[];
  decisionTimes: { period: string; pct: number; label: string; color: string }[];
  demandSplit: { solo: number; group: number; soloTrend: string; groupTrend: string };
  weekdayWeekend: { day: string; weekday: boolean; demand: number }[];
  localTrends: { trend: string; velocity: string; direction: string; desc: string }[];
  topTags: { tag: string; score: number; engagement: "high" | "medium" | "low" }[];
  behaviorInsights: { title: string; whyItMatters: string; action: string; icon: string }[];
  comparisonBehavior: { behavior: string; pct: number }[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Clock,
  Users,
  User,
  TrendingUp,
  Heart,
};

export default function OwnerCustomerInsights() {
  const session = getAdminSession();

  const { data, isLoading } = useQuery<CustomerInsightsData>({
    queryKey: ["/api/owner/customer-insights"],
    staleTime: 5 * 60 * 1000,
    enabled: !!session && session.sessionType === "owner",
  });

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-400">No customer data available yet. Check back after more activity.</p>
      </div>
    );
  }

  const maxDemand = Math.max(...data.weekdayWeekend.map(d => d.demand), 1);
  const peakDecision = data.decisionTimes.slice().sort((a, b) => b.pct - a.pct)[0];

  return (
    <div className="space-y-6" data-testid="owner-customer-insights-page">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-page-title">Customer Insights</h2>
          <p className="text-xs text-gray-400">Aggregated behavior insights from Toast decision data — privacy-safe</p>
        </div>
      </div>

      {/* Behavior Insight Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data.behaviorInsights.length === 0 ? (
          <div className="lg:col-span-3 text-center py-8 text-sm text-gray-400">No behavior insights yet. More data needed.</div>
        ) : (
          data.behaviorInsights.map((insight, i) => {
            const Icon = ICON_MAP[insight.icon] ?? TrendingUp;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid={`behavior-insight-${i}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#FFCC02]" />
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">{insight.title}</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed mb-3">{insight.whyItMatters}</p>
                <button className="text-[11px] font-medium text-[#00B14F] hover:text-[#00B14F]/80 transition-colors flex items-center gap-1" data-testid={`btn-insight-action-${i}`}>
                  {insight.action} <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cuisine Overlaps */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-cuisine-overlaps">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Cuisine Overlaps</h3>
            <span className="text-[10px] text-gray-400 ml-1">What else your visitors search for</span>
          </div>
          {data.cuisineOverlaps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Not enough profile data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.cuisineOverlaps.map(c => (
                <div key={c.cuisine} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-medium w-32 shrink-0">{c.cuisine}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-[#FFCC02]" style={{ width: `${c.overlap}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{c.overlap}%</span>
                  <span className={`text-[10px] w-8 ${c.rising ? "text-[#00B14F]" : "text-red-400"}`}>{c.trend}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decision Times */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-decision-times">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Decision Times</h3>
            <span className="text-[10px] text-gray-400 ml-1">When users make food decisions</span>
          </div>
          <div className="space-y-3">
            {data.decisionTimes.map(t => (
              <div key={t.period} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-medium w-28 shrink-0">{t.period}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${t.pct}%`, backgroundColor: t.color }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">{t.label}</span>
              </div>
            ))}
          </div>
          {peakDecision && peakDecision.pct > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100">
              <p className="text-[11px] text-gray-600">
                <span className="font-semibold text-rose-600">{peakDecision.period}</span> is your strongest decision window ({peakDecision.pct}%).
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Solo vs Group */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-solo-group-demand">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Solo vs Group Demand</h3>
          </div>
          <div className="flex items-center gap-6 justify-center mb-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-4 border-blue-400 flex items-center justify-center mx-auto mb-2">
                <div>
                  <User className="w-5 h-5 text-blue-500 mx-auto" />
                  <p className="text-lg font-bold text-gray-800">{data.demandSplit.solo}%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium">Solo</p>
              <p className="text-[10px] text-[#00B14F]">{data.demandSplit.soloTrend}</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-4 border-purple-400 flex items-center justify-center mx-auto mb-2">
                <div>
                  <Users className="w-5 h-5 text-purple-500 mx-auto" />
                  <p className="text-lg font-bold text-gray-800">{data.demandSplit.group}%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium">Group</p>
              <p className="text-[10px] text-[#00B14F]">{data.demandSplit.groupTrend}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 text-center">
            {data.demandSplit.group > 30
              ? `Group demand at ${data.demandSplit.group}% — consider shareable menu items`
              : `Mostly solo diners (${data.demandSplit.solo}%) — highlight solo-friendly options`}
          </p>
        </div>

        {/* Weekday vs Weekend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-weekday-weekend">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Weekday vs Weekend</h3>
          </div>
          <div className="flex items-end gap-2 h-32 mb-3">
            {data.weekdayWeekend.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-md transition-all ${d.weekday ? "bg-[var(--admin-blue)]/30" : "bg-[#FFCC02]/50"}`}
                  style={{ height: `${(d.demand / maxDemand) * 100}%` }}
                />
                <span className="text-[10px] text-gray-400 font-medium">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[var(--admin-blue)]/30" /> Weekday</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#FFCC02]/50" /> Weekend</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Local Trends */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-local-trends">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Trend Shifts (vs Last Week)</h3>
          </div>
          {data.localTrends.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Not enough data for week-over-week comparison.</p>
          ) : (
            <div className="space-y-3">
              {data.localTrends.map((t, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors" data-testid={`local-trend-${i}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {t.direction === "up"
                      ? <ArrowUp className="w-3.5 h-3.5 text-[#00B14F]" />
                      : <ArrowDown className="w-3.5 h-3.5 text-red-400" />}
                    <span className="text-sm font-medium text-gray-800">{t.trend}</span>
                    <span className={`text-[10px] font-medium ${t.direction === "up" ? "text-[#00B14F]" : "text-red-400"}`}>{t.velocity}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 ml-5">{t.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Tags */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-top-tags">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Top Performing Tags</h3>
            <span className="text-[10px] text-gray-400 ml-1">Tags users respond to most</span>
          </div>
          {data.topTags.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No tag data available yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topTags.map(t => (
                <div key={t.tag} className="flex items-center gap-3">
                  <Tag className="w-3 h-3 text-gray-300 shrink-0" />
                  <span className="text-xs text-gray-700 font-medium w-28 shrink-0">{t.tag}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-[#00B14F]" style={{ width: `${t.score}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{t.score}</span>
                  <span className={`text-[9px] font-medium rounded-full px-1.5 py-0.5 ${
                    t.engagement === "high" ? "bg-[#00B14F]/10 text-[#00B14F]" :
                    t.engagement === "medium" ? "bg-amber-50 text-amber-600" :
                    "bg-gray-100 text-gray-400"
                  }`}>{t.engagement}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Behavior */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-comparison-behavior">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">How Users Decide</h3>
          <span className="text-[10px] text-gray-400 ml-1">Aggregated comparison behavior patterns</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {data.comparisonBehavior.map((b, i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center" data-testid={`behavior-stat-${i}`}>
              <p className="text-2xl font-bold text-gray-800">{b.pct}%</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-tight">{b.behavior}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
