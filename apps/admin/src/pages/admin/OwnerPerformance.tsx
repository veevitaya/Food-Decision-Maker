import { useQuery } from "@tanstack/react-query";
import { getAdminSession } from "./AdminLayout";
import {
  TrendingUp,
  Eye,
  Heart,
  Bookmark,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Users,
  Clock,
  Utensils,
} from "lucide-react";

function getOwnerHeaders() {
  const session = getAdminSession();
  if (!session || session.sessionType !== "owner") return {};
  return { "x-owner-token": btoa(`${session.email}:`) };
}

const DAILY_VIEWS = [42, 38, 55, 61, 48, 72, 65, 58, 80, 74, 90, 85, 95, 88];
const PEAK_HOURS = [
  { hour: "11:00", visitors: 12 },
  { hour: "12:00", visitors: 28 },
  { hour: "13:00", visitors: 35 },
  { hour: "14:00", visitors: 18 },
  { hour: "17:00", visitors: 15 },
  { hour: "18:00", visitors: 32 },
  { hour: "19:00", visitors: 45 },
  { hour: "20:00", visitors: 38 },
  { hour: "21:00", visitors: 22 },
];

const TOP_SOURCES = [
  { source: "Vibe Browse", pct: 35, color: "#FFCC02" },
  { source: "Search", pct: 25, color: "var(--admin-blue)" },
  { source: "Trending Feed", pct: 20, color: "#00B14F" },
  { source: "Recommendations", pct: 12, color: "var(--admin-blue)" },
  { source: "Direct Link", pct: 8, color: "#94A3B8" },
];

export default function OwnerPerformance() {
  const session = getAdminSession();

  const { data: dashData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/owner/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/owner/dashboard", {
        headers: getOwnerHeaders() as Record<string, string>,
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: session?.sessionType === "owner",
  });

  const stats = dashData?.stats || { views: 0, likes: 0, saves: 0, deliveryTaps: 0 };

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  const maxView = Math.max(...DAILY_VIEWS);
  const maxVisitors = Math.max(...PEAK_HOURS.map((h) => h.visitors));

  return (
    <div className="space-y-6" data-testid="owner-performance-page">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-performance-title">Performance</h2>
          <p className="text-xs text-gray-400">How your restaurant is performing on Toast</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Eye, label: "Views", value: stats.views, change: +12, color: "bg-blue-50 text-blue-500" },
          { icon: Heart, label: "Likes", value: stats.likes, change: +8, color: "bg-rose-50 text-rose-500" },
          { icon: Bookmark, label: "Saves", value: stats.saves, change: +15, color: "bg-amber-50 text-amber-500" },
          { icon: ExternalLink, label: "Delivery Taps", value: stats.deliveryTaps, change: -3, color: "bg-[#00B14F]/10 text-[#00B14F]" },
        ].map(({ icon: Icon, label, value, change, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
            <div className={`flex items-center gap-0.5 mt-1 text-xs ${change >= 0 ? "text-[#00B14F]" : "text-red-400"}`}>
              {change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(change)}% vs last week
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-views-chart">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Views (Last 14 Days)</h3>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {DAILY_VIEWS.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md transition-all ${
                  i === DAILY_VIEWS.length - 1 ? "bg-[#FFCC02]" : i === DAILY_VIEWS.indexOf(Math.max(...DAILY_VIEWS)) ? "bg-[#00B14F]" : "bg-[#FFCC02]/40"
                }`}
                style={{ height: `${(v / maxView) * 100}%` }}
              />
              {i % 2 === 0 && (
                <span className="text-[8px] text-gray-300">{i + 1}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-peak-hours">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Peak Hours</h3>
          </div>
          <div className="space-y-2">
            {PEAK_HOURS.map((h) => (
              <div key={h.hour} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-10 shrink-0">{h.hour}</span>
                <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--admin-blue-90)] transition-all"
                    style={{ width: `${(h.visitors / maxVisitors) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-6 text-right">{h.visitors}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-traffic-sources">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Traffic Sources</h3>
          </div>
          <div className="space-y-3">
            {TOP_SOURCES.map((s) => (
              <div key={s.source} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-gray-700 flex-1">{s.source}</span>
                <span className="text-sm font-semibold text-gray-800">{s.pct}%</span>
              </div>
            ))}
          </div>
          <div className="flex h-3 rounded-full overflow-hidden mt-4">
            {TOP_SOURCES.map((s) => (
              <div
                key={s.source}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${s.pct}%`, backgroundColor: s.color }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-engagement">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
          <h3 className="text-[15px] font-semibold text-gray-800">Engagement Summary</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[var(--admin-blue)]" />
              <span className="text-xs font-medium text-gray-500">Conversion Rate</span>
            </div>
            <p className="text-lg font-bold text-gray-800">
              {stats.views > 0 ? ((stats.deliveryTaps / stats.views) * 100).toFixed(1) : "0.0"}%
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Views → Delivery Taps</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#00B14F]" />
              <span className="text-xs font-medium text-gray-500">Avg. View Time</span>
            </div>
            <p className="text-lg font-bold text-gray-800">18s</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Per restaurant view</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4 text-[#FFCC02]" />
              <span className="text-xs font-medium text-gray-500">Save Rate</span>
            </div>
            <p className="text-lg font-bold text-gray-800">
              {stats.views > 0 ? ((stats.saves / stats.views) * 100).toFixed(1) : "0.0"}%
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Views → Saves</p>
          </div>
        </div>
      </div>
    </div>
  );
}
