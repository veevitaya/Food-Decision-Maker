import { useState } from "react";
import { getAdminSession } from "./AdminLayout";
import {
  Users,
  Utensils,
  Clock,
  TrendingUp,
  Calendar,
  MapPin,
  Heart,
  ArrowUp,
  ArrowDown,
  User,
  Zap,
  Tag,
  Info,
  ChevronRight,
} from "lucide-react";

const CUISINE_OVERLAPS = [
  { cuisine: "Thai Street Food", overlap: 78, trend: "+5%", rising: true },
  { cuisine: "Japanese Ramen", overlap: 65, trend: "+12%", rising: true },
  { cuisine: "Korean BBQ", overlap: 52, trend: "+8%", rising: true },
  { cuisine: "Burgers", overlap: 48, trend: "-2%", rising: false },
  { cuisine: "Italian Pizza", overlap: 34, trend: "+3%", rising: true },
  { cuisine: "Vietnamese", overlap: 28, trend: "+18%", rising: true },
];

const DECISION_TIMES = [
  { period: "Breakfast (6-10)", pct: 8, label: "8%", color: "#FFCC02" },
  { period: "Lunch (11-14)", pct: 32, label: "32%", color: "#00B14F" },
  { period: "Snack (15-17)", pct: 12, label: "12%", color: "#3B82F6" },
  { period: "Dinner (18-21)", pct: 38, label: "38%", color: "#F43F5E" },
  { period: "Late Night (22+)", pct: 10, label: "10%", color: "#8B5CF6" },
];

const DEMAND_SPLIT = { solo: 62, group: 38, soloTrend: "+3%", groupTrend: "+8%" };

const WEEKDAY_WEEKEND = [
  { day: "Mon", weekday: true, demand: 65 },
  { day: "Tue", weekday: true, demand: 58 },
  { day: "Wed", weekday: true, demand: 72 },
  { day: "Thu", weekday: true, demand: 68 },
  { day: "Fri", weekday: true, demand: 85 },
  { day: "Sat", weekday: false, demand: 95 },
  { day: "Sun", weekday: false, demand: 78 },
];

const LOCAL_TRENDS = [
  { trend: "Spicy dishes gaining traction", velocity: "+22%", direction: "up" as const, desc: "Users in your area are increasingly searching for spicy options this week." },
  { trend: "Ramen demand surging after 8PM", velocity: "+18%", direction: "up" as const, desc: "Late-night ramen searches up significantly in Sukhumvit area." },
  { trend: "Group dining rising on weekends", velocity: "+15%", direction: "up" as const, desc: "Saturday/Sunday group sessions up 15%. Korean BBQ and shared plates dominate." },
  { trend: "Healthy bowl interest declining", velocity: "-8%", direction: "down" as const, desc: "Health-conscious searches slightly down this period, seasonal pattern." },
];

const TOP_TAGS = [
  { tag: "street-food", score: 92, engagement: "high" as const },
  { tag: "spicy", score: 88, engagement: "high" as const },
  { tag: "instagrammable", score: 82, engagement: "high" as const },
  { tag: "date-night", score: 75, engagement: "medium" as const },
  { tag: "late-night", score: 71, engagement: "medium" as const },
  { tag: "family-friendly", score: 64, engagement: "medium" as const },
  { tag: "budget-friendly", score: 58, engagement: "medium" as const },
  { tag: "group-friendly", score: 52, engagement: "low" as const },
];

const BEHAVIOR_INSIGHTS = [
  {
    title: "Users in your area crave ramen most after 8PM",
    whyItMatters: "If you offer noodles or ramen, extending late-night availability could capture this demand.",
    action: "Review hours",
    icon: Clock,
  },
  {
    title: "Your restaurant performs better in solo sessions",
    whyItMatters: "Solo users show 38% win rate vs 24% in groups. Adding shareable options could unlock group revenue.",
    action: "Add group dishes",
    icon: Users,
  },
  {
    title: "Spicy dishes are gaining traction this week",
    whyItMatters: "Spice-related searches up 22%. Highlighting your spicy options could increase visibility by 15%.",
    action: "Tag spicy dishes",
    icon: Zap,
  },
];

const COMPARISON_BEHAVIOR = [
  { behavior: "Compare 3+ restaurants before deciding", pct: 45 },
  { behavior: "Choose within 30 seconds", pct: 28 },
  { behavior: "Return to same restaurant in 7 days", pct: 34 },
  { behavior: "Switch cuisine category mid-session", pct: 22 },
  { behavior: "Use group mode for weekend decisions", pct: 38 },
];

export default function OwnerCustomerInsights() {
  const session = getAdminSession();

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  const maxDemand = Math.max(...WEEKDAY_WEEKEND.map(d => d.demand));

  return (
    <div className="space-y-6" data-testid="owner-customer-insights-page">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-page-title">Customer Insights</h2>
          <p className="text-xs text-gray-400">Aggregated behavior insights from Toast decision data — privacy-safe</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {BEHAVIOR_INSIGHTS.map((insight, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid={`behavior-insight-${i}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
                <insight.icon className="w-4 h-4 text-[#FFCC02]" />
              </div>
            </div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">{insight.title}</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-3">{insight.whyItMatters}</p>
            <button className="text-[11px] font-medium text-[#00B14F] hover:text-[#00B14F]/80 transition-colors flex items-center gap-1" data-testid={`btn-insight-action-${i}`}>
              {insight.action} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-cuisine-overlaps">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Cuisine Overlaps</h3>
            <span className="text-[10px] text-gray-400 ml-1">What else your visitors search for</span>
          </div>
          <div className="space-y-2.5">
            {CUISINE_OVERLAPS.map(c => (
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
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-decision-times">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Decision Times</h3>
            <span className="text-[10px] text-gray-400 ml-1">When users make food decisions</span>
          </div>
          <div className="space-y-3">
            {DECISION_TIMES.map(t => (
              <div key={t.period} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-medium w-28 shrink-0">{t.period}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(t.pct / 38) * 100}%`, backgroundColor: t.color }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">{t.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100">
            <p className="text-[11px] text-gray-600">
              <span className="font-semibold text-rose-600">Dinner (18-21)</span> is your strongest decision window. Consider boosting dinner promotions to capitalize on this.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <p className="text-lg font-bold text-gray-800">{DEMAND_SPLIT.solo}%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium">Solo</p>
              <p className="text-[10px] text-[#00B14F]">{DEMAND_SPLIT.soloTrend}</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-4 border-purple-400 flex items-center justify-center mx-auto mb-2">
                <div>
                  <Users className="w-5 h-5 text-purple-500 mx-auto" />
                  <p className="text-lg font-bold text-gray-800">{DEMAND_SPLIT.group}%</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium">Group</p>
              <p className="text-[10px] text-[#00B14F]">{DEMAND_SPLIT.groupTrend}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 text-center">Group demand growing {DEMAND_SPLIT.groupTrend} — consider adding shareable menu items</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-weekday-weekend">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Weekday vs Weekend</h3>
          </div>
          <div className="flex items-end gap-2 h-32 mb-3">
            {WEEKDAY_WEEKEND.map(d => (
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-local-trends">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Local Trend Shifts</h3>
          </div>
          <div className="space-y-3">
            {LOCAL_TRENDS.map((t, i) => (
              <div key={i} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors" data-testid={`local-trend-${i}`}>
                <div className="flex items-center gap-2 mb-1">
                  {t.direction === "up" ? (
                    <ArrowUp className="w-3.5 h-3.5 text-[#00B14F]" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-gray-800">{t.trend}</span>
                  <span className={`text-[10px] font-medium ${t.direction === "up" ? "text-[#00B14F]" : "text-red-400"}`}>{t.velocity}</span>
                </div>
                <p className="text-[11px] text-gray-500 ml-5">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-top-tags">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Top Performing Tags</h3>
            <span className="text-[10px] text-gray-400 ml-1">Tags users respond to most</span>
          </div>
          <div className="space-y-2">
            {TOP_TAGS.map(t => (
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
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-comparison-behavior">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">How Users Decide</h3>
          <span className="text-[10px] text-gray-400 ml-1">Aggregated comparison behavior patterns</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {COMPARISON_BEHAVIOR.map((b, i) => (
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
