import { useQuery } from "@tanstack/react-query";
import { MapPin, TrendingUp, TrendingDown, AlertCircle, Zap, Activity } from "lucide-react";

interface District {
  name: string;
  demand: number;
  restaurants: number;
  clickouts: number;
  growth: number;
  status: "strong" | "growing" | "underserved" | "stable";
}

interface DaypartGeoRow {
  area: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  lateNight: number;
}

interface GeographyData {
  districts: District[];
  daypartGeo: DaypartGeoRow[];
}

function intensityColor(value: number) {
  if (value < 20) return "rgba(139, 92, 246, 0.10)";
  if (value < 40) return "rgba(139, 92, 246, 0.25)";
  if (value < 60) return "rgba(139, 92, 246, 0.45)";
  if (value < 80) return "rgba(139, 92, 246, 0.65)";
  return "rgba(139, 92, 246, 0.88)";
}

export default function AdminGeography() {
  const { data, isLoading } = useQuery<GeographyData>({
    queryKey: ["/api/admin/geography"],
    queryFn: async () => {
      const res = await fetch("/api/admin/geography?days=30", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load geography data");
      return res.json();
    },
  });

  const districts = data?.districts ?? [];
  const daypartGeo = (data?.daypartGeo ?? []) as DaypartGeoRow[];
  const underserved = districts.filter(d => d.status === "underserved");
  const topClickouts = [...districts].sort((a, b) => b.clickouts - a.clickouts).slice(0, 3);

  return (
    <div className="space-y-8" data-testid="admin-geography-page">
      <div className="flex items-center gap-3">
        <MapPin className="w-5 h-5" style={{ color: "var(--admin-cyan)" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Geography</h2>
          <p className="text-xs text-muted-foreground">Demand heatmaps, district analysis, and coverage gaps — last 30 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* District Demand Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-district-demand">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-cyan)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">District Demand Map</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Demand score vs restaurant supply</p>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}</div>
          ) : districts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <Activity className="w-6 h-6 opacity-30" />
              <p className="text-xs">No location data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {districts.map(d => (
                <div key={d.name} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0" data-testid={`district-${d.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: intensityColor(d.demand), color: d.demand >= 60 ? "white" : "var(--admin-deep-purple)" }}>
                    {d.demand}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">{d.name}</span>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-400">{d.restaurants} restaurants</span>
                      <span className="text-[10px] text-gray-400">{d.clickouts.toLocaleString()} clickouts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {d.growth >= 0
                      ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                      : <TrendingDown className="w-3 h-3 text-red-400" />}
                    <span className={`text-xs font-medium ${d.growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {d.growth > 0 ? "+" : ""}{d.growth}%
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                    d.status === "strong" ? "bg-emerald-50 text-emerald-700" :
                    d.status === "growing" ? "bg-blue-50 text-blue-700" :
                    d.status === "underserved" ? "bg-amber-50 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Underserved Areas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-underserved">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Underserved Areas</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">High demand, low supply</p>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}</div>
            ) : underserved.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 gap-2 text-gray-400">
                <AlertCircle className="w-5 h-5 opacity-30" />
                <p className="text-xs">No underserved areas detected</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {underserved.map(d => (
                  <div key={d.name} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-800">{d.name}</span>
                      <span className="text-xs font-medium text-amber-600">{d.growth > 0 ? "+" : ""}{d.growth}% growth</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span>Demand: {d.demand}/100</span>
                      <span>•</span>
                      <span>Only {d.restaurants} restaurants</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50/50 mt-3">
                  <Zap className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-blue-700">These areas show strong demand with limited coverage — prime expansion targets.</p>
                </div>
              </div>
            )}
          </div>

          {/* Clickout Hotspots */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-clickout-hotspots">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Clickout Hotspots</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Top 3 conversion areas</p>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-7 rounded bg-gray-100 animate-pulse" />)}</div>
            ) : topClickouts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No clickout data yet</p>
            ) : (
              <div className="space-y-2.5">
                {topClickouts.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{
                      backgroundColor: i === 0 ? "var(--admin-pink)" : "rgba(244,63,94,0.2)",
                      color: i === 0 ? "white" : "var(--admin-pink)",
                    }}>{i + 1}</span>
                    <span className="flex-1 text-xs font-medium text-gray-800">{d.name}</span>
                    <span className="text-xs font-semibold text-gray-700">{d.clickouts.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area × Daypart Heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-daypart-geo">
        <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
          <h3 className="text-[15px] font-semibold text-gray-800">Area × Daypart Demand</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">When each area is busiest</p>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}</div>
        ) : daypartGeo.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 gap-2 text-gray-400">
            <Activity className="w-6 h-6 opacity-30" />
            <p className="text-xs">No daypart data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Area</th>
                  {["Breakfast", "Lunch", "Dinner", "Late Night"].map(h => (
                    <th key={h} className="text-center py-2.5 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daypartGeo.map(row => (
                  <tr key={row.area} className="border-b border-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-800">{row.area}</td>
                    {([row.breakfast, row.lunch, row.dinner, row.lateNight] as number[]).map((val, i) => (
                      <td key={i} className="py-2.5 px-3 text-center">
                        <span className="inline-block px-3 py-1 rounded-md text-xs font-medium" style={{
                          backgroundColor: intensityColor(val),
                          color: val >= 60 ? "white" : "var(--admin-deep-purple)",
                        }}>{val}%</span>
                      </td>
                    ))}
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
