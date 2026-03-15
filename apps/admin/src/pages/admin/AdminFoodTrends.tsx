import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, ArrowUp, ArrowDown, Clock, Users, Utensils, Activity } from "lucide-react";

interface CuisineTrend {
  name: string;
  volume: number;
  growth: number;
  direction: "up" | "down";
  topArea: string;
}

interface VenueTrend {
  name: string;
  growth: number;
  category: string;
}

interface DaypartTrend {
  daypart: string;
  trending: string;
  count: number;
  growth: number;
}

interface SegmentPref {
  segment: string;
  topCuisine: string;
  avgBudget: string;
  count: number;
}

interface FoodTrendsData {
  cuisineTrends: CuisineTrend[];
  venueTrends: VenueTrend[];
  daypartTrends: DaypartTrend[];
  segmentPreferences: SegmentPref[];
}

export default function AdminFoodTrends() {
  const [tab, setTab] = useState<"cuisines" | "venues">("cuisines");

  const { data, isLoading } = useQuery<FoodTrendsData>({
    queryKey: ["/api/admin/food-trends"],
    queryFn: async () => {
      const res = await fetch("/api/admin/food-trends?days=30", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load food trends");
      return res.json();
    },
  });

  const cuisineTrends = data?.cuisineTrends ?? [];
  const venueTrends = data?.venueTrends ?? [];
  const daypartTrends = data?.daypartTrends ?? [];
  const segmentPreferences = data?.segmentPreferences ?? [];

  const maxVolume = Math.max(...cuisineTrends.map(c => c.volume), 1);

  return (
    <div className="space-y-8" data-testid="admin-food-trends-page">
      <div className="flex items-center gap-3">
        <Flame className="w-5 h-5" style={{ color: "var(--admin-pink)" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Food Trends</h2>
          <p className="text-xs text-muted-foreground">Category, cuisine, and venue trend analysis — last 30 days vs prior period</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cuisine / Venue Trends */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-cuisine-trends">
          <div className="flex items-center justify-between mb-5">
            <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--admin-pink)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Cuisine Trends</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Rising & declining</p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(["cuisines", "venues"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                  {t === "cuisines" ? "Cuisines" : "Top Venues"}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              {[...Array(6)].map((_, i) => <div key={i} className="h-5 rounded bg-gray-100 animate-pulse" />)}
            </div>
          ) : tab === "cuisines" ? (
            cuisineTrends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
                <Activity className="w-6 h-6 opacity-30" />
                <p className="text-xs">No swipe data yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cuisineTrends.map(c => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-gray-700 font-medium truncate" title={c.name}>{c.name}</span>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 bg-gray-50 rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${(c.volume / maxVolume) * 100}%`,
                          backgroundColor: c.direction === "up" ? "var(--admin-cyan)" : "var(--admin-pink)",
                        }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 w-10 text-right">{c.volume}</span>
                    <div className="flex items-center gap-1 w-14 justify-end">
                      {c.direction === "up"
                        ? <ArrowUp className="w-3 h-3 text-emerald-500" />
                        : <ArrowDown className="w-3 h-3 text-red-400" />}
                      <span className={`text-xs font-semibold ${c.direction === "up" ? "text-emerald-600" : "text-red-500"}`}>
                        {c.growth > 0 ? "+" : ""}{c.growth}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            venueTrends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
                <Utensils className="w-6 h-6 opacity-30" />
                <p className="text-xs">No venue data yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {venueTrends.map(v => (
                  <div key={v.name} className="flex items-center gap-3 py-1.5">
                    <span className="w-36 text-xs text-gray-700 font-medium truncate" title={v.name}>{v.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">{v.category}</span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600">+{v.growth}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="space-y-4">
          {/* Daypart Trends */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-daypart-trends">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Daypart Trends</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">What's trending when</p>
            </div>
            {isLoading ? (
              <div className="space-y-2.5">{[...Array(5)].map((_, i) => <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2.5">
                {daypartTrends.map(d => (
                  <div key={d.daypart} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="w-20 text-xs font-medium text-gray-600">{d.daypart}</span>
                    <span className="flex-1 text-xs text-gray-800 font-medium truncate">{d.trending}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {d.growth >= 0
                        ? <ArrowUp className="w-3 h-3 text-emerald-500" />
                        : <ArrowDown className="w-3 h-3 text-red-400" />}
                      <span className={`text-xs font-semibold ${d.growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {d.growth > 0 ? "+" : ""}{d.growth}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Segment Preferences */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-segment-trends">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Segment Preferences</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">User segment × cuisine</p>
            </div>
            {isLoading ? (
              <div className="space-y-2.5">{[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />)}</div>
            ) : segmentPreferences.every(s => s.count === 0) ? (
              <div className="flex flex-col items-center justify-center h-24 gap-2 text-gray-400">
                <Users className="w-6 h-6 opacity-30" />
                <p className="text-xs">No user profile data yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {segmentPreferences.map(s => (
                  <div key={s.segment} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-800">{s.segment}</span>
                      <p className="text-[10px] text-gray-400 truncate">{s.topCuisine}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">{s.avgBudget}</span>
                      {s.count > 0 && <p className="text-[10px] text-gray-400">{s.count} users</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
