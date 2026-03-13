import { useState } from "react";
import { Flame, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Clock, MapPin, Users } from "lucide-react";

const CUISINE_TRENDS = [
  { name: "Thai Street Food", growth: 42, direction: "up" as const, volume: 4820, topArea: "Sukhumvit" },
  { name: "Korean BBQ", growth: 35, direction: "up" as const, volume: 3210, topArea: "Thonglor" },
  { name: "Japanese Izakaya", growth: 28, direction: "up" as const, volume: 2890, topArea: "Siam" },
  { name: "Vietnamese Pho", growth: 22, direction: "up" as const, volume: 1540, topArea: "Ari" },
  { name: "Italian", growth: 18, direction: "up" as const, volume: 2100, topArea: "Silom" },
  { name: "Indian Curry", growth: -8, direction: "down" as const, volume: 980, topArea: "Sukhumvit" },
  { name: "Mexican", growth: -12, direction: "down" as const, volume: 620, topArea: "Thonglor" },
  { name: "French Fine Dining", growth: -15, direction: "down" as const, volume: 340, topArea: "Silom" },
];

const MENU_TRENDS = [
  { name: "Pad Kra Pao", growth: 55, category: "Thai" },
  { name: "Mango Sticky Rice", growth: 42, category: "Dessert" },
  { name: "Tom Yum Goong", growth: 38, category: "Thai" },
  { name: "Wagyu Yakiniku", growth: 32, category: "Japanese" },
  { name: "Acai Bowl", growth: 28, category: "Healthy" },
  { name: "Croffle", growth: 24, category: "Cafe" },
];

const DAYPART_TRENDS = [
  { daypart: "Breakfast", trending: "Cafe & Brunch", growth: 28 },
  { daypart: "Brunch", trending: "Western", growth: 18 },
  { daypart: "Lunch", trending: "Thai Street Food", growth: 42 },
  { daypart: "Dinner", trending: "Korean BBQ", growth: 35 },
  { daypart: "Late Night", trending: "Japanese Izakaya", growth: 28 },
];

const SEGMENT_TRENDS = [
  { segment: "Budget Diners", topCuisine: "Thai Street Food", avgBudget: "฿150" },
  { segment: "Foodies", topCuisine: "Japanese Omakase", avgBudget: "฿1,200" },
  { segment: "Health-conscious", topCuisine: "Salad & Poke", avgBudget: "฿350" },
  { segment: "Date Night", topCuisine: "Italian", avgBudget: "฿800" },
  { segment: "Groups", topCuisine: "Korean BBQ", avgBudget: "฿450" },
];

export default function AdminFoodTrends() {
  const [tab, setTab] = useState<"cuisines" | "menus">("cuisines");
  const maxGrowth = Math.max(...CUISINE_TRENDS.map(c => Math.abs(c.growth)));

  return (
    <div className="space-y-8" data-testid="admin-food-trends-page">
      <div className="flex items-center gap-3">
        <Flame className="w-5 h-5" style={{ color: "var(--admin-pink)" }} />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Food Trends</h2>
          <p className="text-xs text-muted-foreground">Category, cuisine, and menu trend analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-cuisine-trends">
          <div className="flex items-center justify-between mb-5">
            <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--admin-pink)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Cuisine Trends</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Rising & declining</p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(["cuisines", "menus"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${tab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
                  {t === "cuisines" ? "Cuisines" : "Menu Items"}
                </button>
              ))}
            </div>
          </div>

          {tab === "cuisines" ? (
            <div className="space-y-2.5">
              {CUISINE_TRENDS.map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-gray-700 font-medium truncate">{c.name}</span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 bg-gray-50 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${(Math.abs(c.growth) / maxGrowth) * 100}%`,
                        backgroundColor: c.direction === "up" ? "var(--admin-cyan)" : "var(--admin-pink)",
                      }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 w-16 justify-end">
                    {c.direction === "up" ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-red-400" />}
                    <span className={`text-xs font-semibold ${c.direction === "up" ? "text-emerald-600" : "text-red-500"}`}>
                      {c.growth > 0 ? "+" : ""}{c.growth}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {MENU_TRENDS.map(m => (
                <div key={m.name} className="flex items-center gap-3 py-1.5">
                  <span className="w-36 text-xs text-gray-700 font-medium">{m.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">{m.category}</span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600">+{m.growth}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-daypart-trends">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Daypart Trends</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">What's trending when</p>
            </div>
            <div className="space-y-2.5">
              {DAYPART_TRENDS.map(d => (
                <div key={d.daypart} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="w-20 text-xs font-medium text-gray-600">{d.daypart}</span>
                  <span className="flex-1 text-xs text-gray-800 font-medium">{d.trending}</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600">+{d.growth}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-segment-trends">
            <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
              <h3 className="text-[15px] font-semibold text-gray-800">Segment Preferences</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">User segment × cuisine</p>
            </div>
            <div className="space-y-2.5">
              {SEGMENT_TRENDS.map(s => (
                <div key={s.segment} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-800">{s.segment}</span>
                    <p className="text-[10px] text-gray-400">{s.topCuisine}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-600">{s.avgBudget}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
