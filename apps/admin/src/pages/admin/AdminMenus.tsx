import { useState } from "react";
import {
  UtensilsCrossed, TrendingUp, TrendingDown, Eye, Heart,
  ThumbsDown, Image, Tag, AlertTriangle, Star, Search,
  ChevronDown, ExternalLink, Clock
} from "lucide-react";
import { getTintVar } from "./adminUtils";

const MENU_KPIS = [
  { label: "Total Menus", value: "2,847", trend: "+124", up: true, icon: UtensilsCrossed, color: "var(--admin-blue)" },
  { label: "Avg Visibility", value: "73%", trend: "+4.2%", up: true, icon: Eye, color: "var(--admin-cyan)" },
  { label: "Like Rate", value: "62%", trend: "+1.8%", up: true, icon: Heart, color: "var(--admin-pink)" },
  { label: "Quality Score", value: "7.4", trend: "+0.3", up: true, icon: Star, color: "var(--admin-teal)" },
];

const QUALITY_FLAGS = [
  { issue: "Missing Images", count: 342, severity: "high", color: "#F43F5E" },
  { issue: "No Price Listed", count: 189, severity: "high", color: "#F43F5E" },
  { issue: "Missing Tags", count: 267, severity: "medium", color: "#F59E0B" },
  { issue: "No Description", count: 145, severity: "medium", color: "#F59E0B" },
  { issue: "Stale Data (>90d)", count: 78, severity: "low", color: "#8B5CF6" },
];

const TOP_MENUS = [
  { name: "Pad Thai Goong Sod", restaurant: "Som Tam Nua", views: 4820, likes: 3180, matches: 1420, clickouts: 890, daypart: "Lunch" },
  { name: "Massaman Curry", restaurant: "Gaggan Anand", views: 3950, likes: 2860, matches: 1180, clickouts: 720, daypart: "Dinner" },
  { name: "Tom Yum Goong", restaurant: "Jay Fai", views: 5100, likes: 3420, matches: 1560, clickouts: 680, daypart: "Dinner" },
  { name: "Khao Soi Gai", restaurant: "Sorn", views: 2840, likes: 1920, matches: 980, clickouts: 540, daypart: "Lunch" },
  { name: "Green Curry", restaurant: "Bo.Lan", views: 2100, likes: 1580, matches: 720, clickouts: 410, daypart: "Dinner" },
  { name: "Mango Sticky Rice", restaurant: "Paste Bangkok", views: 3200, likes: 2640, matches: 1100, clickouts: 380, daypart: "Late Night" },
];

const DAYPART_PERFORMANCE = [
  { daypart: "Breakfast", pct: 12, topCuisine: "Cafe & Brunch" },
  { daypart: "Brunch", pct: 18, topCuisine: "Western" },
  { daypart: "Lunch", pct: 32, topCuisine: "Thai" },
  { daypart: "Dinner", pct: 28, topCuisine: "Japanese" },
  { daypart: "Late Night", pct: 10, topCuisine: "Street Food" },
];

export default function AdminMenus() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-8" data-testid="admin-menus-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-5 h-5" style={{ color: "var(--admin-blue)" }} />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Menus</h2>
            <p className="text-xs text-muted-foreground">Menu performance, quality checks, and opportunity analysis</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search menus..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            data-testid="input-search-menus"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {MENU_KPIS.map(kpi => (
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
              <div className="flex items-center gap-1 mt-1">
                {kpi.up ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                <span className="text-[11px] font-medium text-emerald-600">{kpi.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-quality-flags">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Quality Flags</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Items needing attention</p>
          </div>
          <div className="space-y-3">
            {QUALITY_FLAGS.map(f => (
              <div key={f.issue} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: f.color }} />
                <span className="flex-1 text-sm text-gray-700">{f.issue}</span>
                <span className="text-sm font-semibold text-gray-800">{f.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">Total flagged: {QUALITY_FLAGS.reduce((s, f) => s + f.count, 0)} items</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-daypart-performance">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Daypart Demand</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">When menus get discovered</p>
          </div>
          <div className="space-y-3">
            {DAYPART_PERFORMANCE.map(d => (
              <div key={d.daypart} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-600 font-medium">{d.daypart}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.pct * 3}%`, backgroundColor: "var(--admin-teal)" }} />
                </div>
                <span className="w-10 text-right text-xs font-semibold text-gray-700">{d.pct}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 justify-center">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-[11px] text-gray-400">Peak: Lunch (12pm–2pm)</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-opportunity-matrix">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-cyan)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">Opportunity Matrix</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">High views, low clickouts</p>
          </div>
          <div className="space-y-2.5">
            {TOP_MENUS.filter(m => m.clickouts / m.views < 0.2).slice(0, 4).map(m => (
              <div key={m.name} className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-800">{m.name}</span>
                  <span className="text-[10px] text-gray-400">{m.restaurant}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span>{m.views.toLocaleString()} views</span>
                  <span>→</span>
                  <span>{m.clickouts} clickouts</span>
                  <span className="font-semibold text-amber-600">{((m.clickouts / m.views) * 100).toFixed(1)}% CTR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-top-menus">
        <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-blue)" }}>
          <h3 className="text-[15px] font-semibold text-gray-800">Top Performing Menus</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Ranked by engagement</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {["Menu Item", "Restaurant", "Views", "Likes", "Matches", "Clickouts", "Peak Daypart"].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_MENUS.map(m => (
                <tr key={m.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{m.name}</td>
                  <td className="py-2.5 px-3 text-gray-500">{m.restaurant}</td>
                  <td className="py-2.5 px-3 text-gray-700">{m.views.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-gray-700">{m.likes.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-gray-700">{m.matches.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-semibold text-gray-800">{m.clickouts}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">{m.daypart}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
