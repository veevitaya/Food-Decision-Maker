import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminSession } from "./AdminLayout";
import {
  ExternalLink,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Clock,
  Utensils,
  Users,
  User,
  Info,
  ChevronRight,
  Zap,
  Target,
  Eye,
} from "lucide-react";

const PLATFORM_DATA = [
  { name: "Grab", color: "#00B14F", clicks: 89, ctr: 18.4, change: +12 },
  { name: "LINE MAN", color: "#06C755", clicks: 62, ctr: 14.2, change: +8 },
  { name: "Robinhood", color: "#6C2BD9", clicks: 33, ctr: 8.1, change: -3 },
];

const DISH_CLICKS = [
  { name: "Pad Thai Special", clicks: 48, ctr: 22.1, trend: "up" as const, matchRate: 68 },
  { name: "Green Curry", clicks: 36, ctr: 18.4, trend: "up" as const, matchRate: 55 },
  { name: "Tom Yum Soup", clicks: 28, ctr: 15.2, trend: "down" as const, matchRate: 42 },
  { name: "Mango Sticky Rice", clicks: 22, ctr: 12.8, trend: "up" as const, matchRate: 38 },
  { name: "Fried Rice", clicks: 18, ctr: 10.5, trend: "down" as const, matchRate: 35 },
  { name: "Som Tum", clicks: 15, ctr: 9.8, trend: "up" as const, matchRate: 31 },
];

const TIME_CLICKS = [
  { hour: "11:00", clicks: 8 },
  { hour: "12:00", clicks: 22 },
  { hour: "13:00", clicks: 18 },
  { hour: "14:00", clicks: 6 },
  { hour: "17:00", clicks: 12 },
  { hour: "18:00", clicks: 28 },
  { hour: "19:00", clicks: 35 },
  { hour: "20:00", clicks: 32 },
  { hour: "21:00", clicks: 18 },
  { hour: "22:00", clicks: 5 },
];

const CAMPAIGN_CLICKS = [
  { campaign: "20% Off All Mains", clicks: 42, ctr: 14.6, spend: 2340, roi: 3.2 },
  { campaign: "Free Dessert ฿500+", clicks: 28, ctr: 11.8, spend: 1680, roi: 2.8 },
];

const FUNNEL_DATA = {
  seen: 4820,
  swipedRight: 3278,
  matched: 412,
  clickedDelivery: 184,
};

const SESSION_CLICKS = { solo: 124, group: 60 };

const PLAT_NAMES: Record<string, string> = { grab: "Grab", line_man: "LINE MAN", lineman: "LINE MAN", robinhood: "Robinhood", other: "Other" };
const PLAT_COLORS: Record<string, string> = { grab: "#00B14F", line_man: "#06C755", lineman: "#06C755", robinhood: "#6C2BD9", other: "#94A3B8" };

interface DeliveryData {
  funnel: { seen: number; swipedRight: number; matched: number; clickedDelivery: number };
  byPlatform: Record<string, number>;
  timeClicks: { hour: string; clicks: number }[];
  sessionClicks: { solo: number; group: number };
  totalClicks: number;
  overallCtr: number;
  clicksChangePct: number;
  dishClicks: { name: string; clicks: number; ctr: number; trend: "up" | "down"; matchRate: number }[];
  campaignClicks: { campaign: string; clicks: number; ctr: number; spend: number; roi: number }[];
}

export default function OwnerDeliveryConversions() {
  const session = getAdminSession();

  const { data: deliveryData } = useQuery<DeliveryData>({
    queryKey: ["/api/owner/delivery-conversions"],
    enabled: !!(session && session.sessionType === "owner"),
    staleTime: 5 * 60 * 1000,
  });

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  const liveFunnel = deliveryData?.funnel ?? FUNNEL_DATA;
  const liveTotalClicks = deliveryData?.totalClicks ?? PLATFORM_DATA.reduce((s, p) => s + p.clicks, 0);
  const liveOverallCtr = deliveryData?.overallCtr != null
    ? deliveryData.overallCtr.toFixed(1)
    : ((liveTotalClicks / liveFunnel.seen) * 100).toFixed(1);

  const livePlatformData = useMemo(() => {
    if (!deliveryData?.byPlatform || Object.keys(deliveryData.byPlatform).length === 0) return PLATFORM_DATA;
    return Object.entries(deliveryData.byPlatform)
      .sort((a, b) => b[1] - a[1])
      .map(([key, clicks]) => ({
        name: PLAT_NAMES[key] ?? key,
        color: PLAT_COLORS[key] ?? "#94A3B8",
        clicks,
        ctr: liveFunnel.seen > 0 ? Number(((clicks / liveFunnel.seen) * 100).toFixed(1)) : 0,
        change: 0,
      }));
  }, [deliveryData, liveFunnel.seen]);

  const liveTimeClicks = deliveryData?.timeClicks?.length ? deliveryData.timeClicks : TIME_CLICKS;
  const liveSessionClicks = deliveryData?.sessionClicks ?? SESSION_CLICKS;
  const liveDishClicks = deliveryData?.dishClicks?.length ? deliveryData.dishClicks : DISH_CLICKS;
  const liveCampaignClicks = deliveryData?.campaignClicks ?? CAMPAIGN_CLICKS;
  const clicksChangePct = deliveryData?.clicksChangePct ?? 14;

  const maxTimeClicks = Math.max(...liveTimeClicks.map(t => t.clicks), 1);

  const funnelSteps = [
    { label: "Seen in Feed", value: liveFunnel.seen, color: "#94A3B8" },
    { label: "Swiped Right", value: liveFunnel.swipedRight, color: "#3B82F6" },
    { label: "Matched", value: liveFunnel.matched, color: "#FFCC02" },
    { label: "Clicked Delivery", value: liveFunnel.clickedDelivery, color: "#00B14F" },
  ];

  return (
    <div className="space-y-6" data-testid="owner-delivery-conversions-page">
      <div className="flex items-center gap-3">
        <ExternalLink className="w-5 h-5 text-[#FFCC02]" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800" data-testid="text-page-title">Delivery Conversions</h2>
          <p className="text-xs text-gray-400">Track how Toast drives real orders through delivery partners</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-conversion-kpis">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00B14F]/10 flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-[#00B14F]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Clicks</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{liveTotalClicks}</p>
          <div className={`flex items-center gap-0.5 mt-1 text-xs ${clicksChangePct >= 0 ? "text-[#00B14F]" : "text-red-400"}`}>
            {clicksChangePct >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {clicksChangePct >= 0 ? "+" : ""}{clicksChangePct}% vs last month
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Click Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{liveOverallCtr}%</p>
          <p className="text-[10px] text-gray-400 mt-1">Views → Delivery clicks</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFCC02]/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Best Platform</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{livePlatformData[0]?.name ?? "–"}</p>
          <p className="text-[10px] text-gray-400 mt-1">{livePlatformData[0]?.clicks ?? 0} clicks ({livePlatformData[0]?.ctr ?? 0}% CTR)</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Utensils className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Top Dish</span>
          </div>
          <p className="text-2xl font-bold text-gray-800 text-lg">Pad Thai</p>
          <p className="text-[10px] text-gray-400 mt-1">{DISH_CLICKS[0].clicks} clicks ({DISH_CLICKS[0].ctr}% CTR)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-toast-funnel">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Discovery → Delivery Funnel</h3>
          </div>
          <div className="space-y-3">
            {funnelSteps.map((step, i) => {
              const pct = (step.value / funnelSteps[0].value) * 100;
              const prevPct = i > 0 ? ((step.value / funnelSteps[i - 1].value) * 100).toFixed(0) : null;
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">{step.value.toLocaleString()}</span>
                      {prevPct && <span className="text-[10px] text-gray-400">({prevPct}% from prev)</span>}
                    </div>
                  </div>
                  <div className="h-5 bg-gray-50 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, backgroundColor: step.color + "40" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-[#00B14F]/5 border border-[#00B14F]/10">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-[#00B14F]">{liveFunnel.seen > 0 ? ((liveFunnel.clickedDelivery / liveFunnel.seen) * 100).toFixed(1) : "0.0"}%</span> of users who see your restaurant end up clicking to order. This proves Toast drives real business value.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-platform-breakdown">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Clicks by Platform</h3>
          </div>
          <div className="space-y-4">
            {livePlatformData.map(p => (
              <div key={p.name} data-testid={`platform-${p.name.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-medium text-gray-700">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">{p.clicks} clicks</span>
                    <span className="text-[10px] text-gray-400">{p.ctr}% CTR</span>
                    <div className={`flex items-center gap-0.5 text-[10px] ${p.change >= 0 ? "text-[#00B14F]" : "text-red-400"}`}>
                      {p.change >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                      {Math.abs(p.change)}%
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${liveTotalClicks > 0 ? (p.clicks / liveTotalClicks) * 100 : 0}%`, backgroundColor: p.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
              <User className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Solo</p>
              <p className="text-lg font-bold text-gray-800">{liveSessionClicks.solo}</p>
              <p className="text-[10px] text-gray-400">clicks</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-center">
              <Users className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Group</p>
              <p className="text-lg font-bold text-gray-800">{liveSessionClicks.group}</p>
              <p className="text-[10px] text-gray-400">clicks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-clicks-by-dish">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[var(--admin-blue)] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Clicks by Dish</h3>
          </div>
          <div className="space-y-2.5">
            {liveDishClicks.map((d, i) => (
              <div key={d.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`dish-click-${i}`}>
                <span className="text-xs font-medium text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">{d.ctr}% CTR</span>
                    <span className="text-[10px] text-gray-400">Match: {d.matchRate}%</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-800">{d.clicks}</span>
                {d.trend === "up" ? (
                  <ArrowUp className="w-3.5 h-3.5 text-[#00B14F]" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 text-red-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-clicks-by-time">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#00B14F] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Clicks by Time of Day</h3>
          </div>
          <div className="space-y-2">
            {liveTimeClicks.map(t => (
              <div key={t.hour} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-10 shrink-0 font-medium">{t.hour}</span>
                <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#00B14F]/30 transition-all" style={{ width: `${(t.clicks / maxTimeClicks) * 100}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-600 w-6 text-right">{t.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {liveCampaignClicks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" data-testid="section-campaign-clicks">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-[3px] h-4 bg-[#FFCC02] rounded-full" />
            <h3 className="text-[15px] font-semibold text-gray-800">Clicks by Campaign</h3>
          </div>
          <div className="space-y-3">
            {liveCampaignClicks.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors" data-testid={`campaign-click-${i}`}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.campaign}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Spent ฿{c.spend.toLocaleString()} · {c.ctr}% CTR</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-800">{c.clicks}</p>
                    <p className="text-[10px] text-gray-400">clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#00B14F]">{c.roi}x</p>
                    <p className="text-[10px] text-gray-400">ROI</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
