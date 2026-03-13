import { MapPin, TrendingUp, Users, Clock, AlertCircle, Zap } from "lucide-react";

const DISTRICT_DATA = [
  { name: "Sukhumvit", demand: 92, restaurants: 124, clickouts: 1240, growth: "+18%", status: "strong" as const },
  { name: "Silom / Sathorn", demand: 78, restaurants: 86, clickouts: 890, growth: "+12%", status: "strong" as const },
  { name: "Siam / CentralWorld", demand: 85, restaurants: 64, clickouts: 720, growth: "+8%", status: "growing" as const },
  { name: "Thonglor / Ekkamai", demand: 88, restaurants: 72, clickouts: 680, growth: "+22%", status: "strong" as const },
  { name: "Ari / Phahonyothin", demand: 65, restaurants: 38, clickouts: 410, growth: "+31%", status: "growing" as const },
  { name: "Ratchada", demand: 52, restaurants: 45, clickouts: 280, growth: "+5%", status: "stable" as const },
  { name: "Bangna", demand: 44, restaurants: 22, clickouts: 160, growth: "+42%", status: "underserved" as const },
  { name: "Lat Phrao", demand: 38, restaurants: 18, clickouts: 120, growth: "+28%", status: "underserved" as const },
];

const DAYPART_GEO = [
  { area: "Sukhumvit", breakfast: 12, lunch: 35, dinner: 38, lateNight: 15 },
  { area: "Silom", breakfast: 18, lunch: 42, dinner: 30, lateNight: 10 },
  { area: "Thonglor", breakfast: 8, lunch: 22, dinner: 45, lateNight: 25 },
  { area: "Ari", breakfast: 22, lunch: 38, dinner: 28, lateNight: 12 },
  { area: "Siam", breakfast: 10, lunch: 40, dinner: 35, lateNight: 15 },
];

function intensityColor(value: number) {
  if (value < 30) return "rgba(139, 92, 246, 0.15)";
  if (value < 50) return "rgba(139, 92, 246, 0.30)";
  if (value < 70) return "rgba(139, 92, 246, 0.50)";
  if (value < 85) return "rgba(139, 92, 246, 0.70)";
  return "rgba(139, 92, 246, 0.90)";
}

export default function AdminGeography() {
  return (
    <div className="space-y-8" data-testid="admin-geography-page">
      <div className="flex items-center gap-3">
        <MapPin className="w-5 h-5" style={{ color: "var(--admin-cyan)" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Geography</h2>
          <p className="text-xs text-muted-foreground">Demand heatmaps, district analysis, and coverage gaps</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-district-demand">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-cyan)" }}>
            <h3 className="text-[15px] font-semibold text-gray-800">District Demand Map</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Demand score vs restaurant supply</p>
          </div>
          <div className="space-y-2">
            {DISTRICT_DATA.map(d => (
              <div key={d.name} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0" data-testid={`district-${d.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: intensityColor(d.demand) }}>
                  {d.demand}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{d.name}</span>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-gray-400">{d.restaurants} restaurants</span>
                    <span className="text-[10px] text-gray-400">{d.clickouts.toLocaleString()} clickouts</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">{d.growth}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  d.status === "strong" ? "bg-emerald-50 text-emerald-700" :
                  d.status === "growing" ? "bg-blue-50 text-blue-700" :
                  d.status === "stable" ? "bg-gray-100 text-gray-600" :
                  "bg-amber-50 text-amber-700"
                }`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-underserved">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Underserved Areas</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">High demand, low supply</p>
            </div>
            <div className="space-y-2.5">
              {DISTRICT_DATA.filter(d => d.status === "underserved").map(d => (
                <div key={d.name} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-800">{d.name}</span>
                    <span className="text-xs font-medium text-amber-600">{d.growth} growth</span>
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
                <p className="text-[11px] text-blue-700">These areas show strong demand growth with limited restaurant coverage — prime expansion targets.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-clickout-hotspots">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Clickout Hotspots</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Top 3 conversion areas</p>
            </div>
            <div className="space-y-2.5">
              {DISTRICT_DATA.sort((a, b) => b.clickouts - a.clickouts).slice(0, 3).map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{
                    backgroundColor: i === 0 ? "var(--admin-pink)" : "rgba(244, 63, 94, 0.2)",
                    color: i === 0 ? "white" : "var(--admin-pink)",
                  }}>{i + 1}</span>
                  <span className="flex-1 text-xs font-medium text-gray-800">{d.name}</span>
                  <span className="text-xs font-semibold text-gray-700">{d.clickouts.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-daypart-geo">
        <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
          <h3 className="text-[15px] font-semibold text-gray-800">Area × Daypart Demand</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">When each area is busiest</p>
        </div>
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
              {DAYPART_GEO.map(row => (
                <tr key={row.area} className="border-b border-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{row.area}</td>
                  {[row.breakfast, row.lunch, row.dinner, row.lateNight].map((val, i) => (
                    <td key={i} className="py-2.5 px-3 text-center">
                      <span className="inline-block px-3 py-1 rounded-md text-xs font-medium" style={{
                        backgroundColor: intensityColor(val * 2.2),
                        color: val > 30 ? "white" : "var(--admin-deep-purple)",
                      }}>{val}%</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
