import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "wouter";
import {
  Users,
  Utensils,
  MousePointerClick,
  Megaphone,
  Truck,
  Plus,
  ImageIcon,
  ArrowRight,
  Star,
  Activity,
  Zap,
  TrendingUp,
  BarChart3,
  MapPin,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Flame,
} from "lucide-react";

interface DashboardData {
  totalUsers: number;
  totalRestaurants: number;
  totalSwipes: number;
  activeCampaigns: number;
  totalEvents: number;
  activeBanners: number;
  draftCampaigns: number;
  eventsToday: number;
}

interface AnalyticsEvent {
  id: number;
  eventType: string;
  userId: string | null;
  restaurantId: number | null;
  restaurantName: string | null;
  metadata: string | null;
  timestamp: string;
}

interface UserSegment {
  id: string;
  name: string;
  description: string;
  estimatedCount: number;
}

interface OverviewData {
  funnel: { impressions: number; swipeViews: number; rightSwipes: number; orderIntent: number };
  topRestaurants: { restaurantId: number; name: string; rightSwipes: number; views: number }[];
  cuisineTrend: { cuisine: string; rightSwipes: number; pct: number }[];
  dayPatterns: { day: string; count: number; pct: number }[];
  heatmap: number[][];
  deliveryTotal: number;
  geoHotspots?: { zone: string; abbr: string; count: number; growth: number }[];
}

interface ClickoutsData {
  total: number;
  byPlatform: Record<string, number>;
  topRestaurants: { restaurantId: number; name: string; count: number }[];
}

function getEventDotColor(eventType: string) {
  switch (eventType) {
    case "swipe_right":
      return "bg-[var(--admin-pink)]";
    case "swipe_left":
      return "bg-gray-300";
    case "view_detail":
      return "bg-[var(--admin-blue)]";
    case "quiz_start":
      return "bg-[var(--admin-deep-purple)]";
    case "delivery_click":
      return "bg-[var(--admin-teal)]";
    default:
      return "bg-gray-300";
  }
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatEventDescription(event: AnalyticsEvent): string {
  const user = event.userId || "Anonymous";
  const restaurant = event.restaurantName
    ? event.restaurantName
    : event.restaurantId
      ? `restaurant #${event.restaurantId}`
      : "a restaurant";
  switch (event.eventType) {
    case "swipe_right":
    case "swipe":
      return `${user} liked ${restaurant}`;
    case "swipe_left":
      return `${user} passed on ${restaurant}`;
    case "view_detail":
    case "view_card":
      return `${user} viewed ${restaurant}`;
    case "quiz_start":
      return `${user} started a taste quiz`;
    case "delivery_click":
    case "deeplink_click":
      return `${user} clicked delivery for ${restaurant}`;
    case "order_click":
      return `${user} placed an order at ${restaurant}`;
    default:
      return `${user} triggered ${event.eventType.replace(/_/g, " ")}`;
  }
}

const fallbackDashboard: DashboardData = {
  totalUsers: 0,
  totalRestaurants: 0,
  totalSwipes: 0,
  activeCampaigns: 0,
  totalEvents: 0,
  activeBanners: 0,
  draftCampaigns: 0,
  eventsToday: 0,
};


const SEGMENT_COLORS = ["var(--admin-deep-purple)", "var(--admin-deep-purple)", "var(--admin-deep-purple)", "var(--admin-deep-purple)"];
const SEGMENT_OPACITIES = [1, 0.7, 0.5, 0.3];

function getTintVar(accentColor: string): string {
  if (accentColor === "var(--admin-blue)") return "var(--admin-blue-10)";
  if (accentColor === "var(--admin-pink)") return "var(--admin-pink-10)";
  if (accentColor === "var(--admin-cyan)") return "var(--admin-cyan-10)";
  if (accentColor === "var(--admin-teal)") return "var(--admin-teal-10)";
  if (accentColor === "var(--admin-deep-purple)") return "var(--admin-deep-purple-10)";
  return "rgba(0,0,0,0.05)";
}

function MiniSparkline({ data, color = "var(--admin-deep-purple)" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} opacity="0.5" />
    </svg>
  );
}

function DeliveryRing({ data }: { data: { name: string; clicks: number; pct: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.clicks, 0);
  const r = 44;
  const cx = 55;
  const cy = 55;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="flex-shrink-0">
      {data.map((d) => {
        const segLength = (d.clicks / total) * circumference;
        const dash = `${segLength - 2} ${circumference - segLength + 2}`;
        const currentOffset = offset;
        offset += segLength;
        return (
          <circle
            key={d.name}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="12"
            strokeDasharray={dash}
            strokeDashoffset={-currentOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-800 text-[14px] font-bold">{total.toLocaleString()}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-gray-400 text-[8px]">total clicks</text>
    </svg>
  );
}

function RadialArc({ value, max, color, size = 44 }: { value: number; max: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcPct = value / max;
  const arcLength = circumference * 0.75;
  const filledLength = arcLength * arcPct;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth="4"
        strokeDasharray={`${arcLength} ${circumference - arcLength}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${filledLength} ${circumference - filledLength}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 2} textAnchor="middle" className="fill-gray-800 text-[10px] font-bold">
        {value}%
      </text>
    </svg>
  );
}

export default function AdminDashboard() {
  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ["/api/admin/dashboard"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<AnalyticsEvent[]>({
    queryKey: ["/api/analytics/events"],
  });

  const { data: segments } = useQuery<UserSegment[]>({
    queryKey: ["/api/analytics/user-segments"],
  });

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ["/api/admin/analytics/overview"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/overview?days=30", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: clickoutsData } = useQuery<ClickoutsData>({
    queryKey: ["/api/admin/analytics/clickouts", 30],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/clickouts?days=30", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const stats = dashboard || fallbackDashboard;
  const allEvents = events || [];
  const recentEvents = allEvents.slice(0, 20);
  const userSegments = segments ?? [];
  const totalSegmentUsers = userSegments.reduce((sum, s) => sum + s.estimatedCount, 0) || 1;
  const PLAT_COLORS: Record<string, string> = { grab: "#00B14F", lineman: "#06C755", robinhood: "#6C2BD9" };
  const PLAT_NAMES: Record<string, string> = { grab: "Grab", lineman: "LINE MAN", robinhood: "Robinhood" };

  // Build real daily event counts for sparklines (last 7 days)
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("en", { weekday: "short" });
    const count = allEvents.filter((e) => e.timestamp?.startsWith(dateStr)).length;
    return { dateStr, dayLabel, count };
  }), [allEvents]);

  // Separate sparklines per KPI metric (from real events)
  const sparklines = useMemo(() => {
    const days = last7Days.map(d => d.dateStr);
    const swipeTypes = new Set(["swipe_right", "swipe"]);
    const deliveryTypes = new Set(["delivery_click", "deeplink_click"]);
    return {
      users: days.map(d => new Set(allEvents.filter(e => e.timestamp?.startsWith(d) && e.userId).map(e => e.userId)).size),
      restaurants: days.map(d => new Set(allEvents.filter(e => e.timestamp?.startsWith(d) && e.restaurantId).map(e => e.restaurantId)).size),
      swipes: days.map(d => allEvents.filter(e => e.timestamp?.startsWith(d) && swipeTypes.has(e.eventType)).length),
      delivery: days.map(d => allEvents.filter(e => e.timestamp?.startsWith(d) && deliveryTypes.has(e.eventType)).length),
      activity: last7Days.map(d => d.count),
    };
  }, [allEvents, last7Days]);

  const liveDelivery = useMemo(() => {
    if (!clickoutsData?.byPlatform || Object.keys(clickoutsData.byPlatform).length === 0) return [];
    const total = clickoutsData.total || 1;
    return Object.entries(clickoutsData.byPlatform).sort((a, b) => b[1] - a[1]).map(([key, count]) => ({
      name: PLAT_NAMES[key] ?? key,
      clicks: count,
      pct: Math.round((count / total) * 100),
      color: PLAT_COLORS[key] ?? "var(--admin-blue)",
    }));
  }, [clickoutsData]);

  const liveTopRestaurants = useMemo(() => {
    const data = overview?.topRestaurants ?? [];
    const mapped = data.map(r => ({
      name: r.name,
      swipes: r.rightSwipes,
      conversion: r.views > 0 ? Math.round((r.rightSwipes / r.views) * 100) : 0,
    }));
    const avgConversion = mapped.length > 0
      ? mapped.reduce((sum, r) => sum + r.conversion, 0) / mapped.length
      : 0;
    return mapped.map(r => ({ ...r, trend: r.conversion >= avgConversion ? "up" : "down" as "up" | "down" }));
  }, [overview]);

  const liveCuisines = useMemo(() => {
    const data = overview?.cuisineTrend ?? [];
    return data.map(c => ({ name: c.cuisine, growth: c.pct, max: 100, color: "var(--admin-cyan)" }));
  }, [overview]);

  const liveFunnel = useMemo(() => {
    const f = overview?.funnel;
    if (!f || f.impressions === 0) return [];
    const base = f.impressions || 1;
    return [
      { label: "View Cards", value: f.impressions, pct: 100, bg: "rgba(244,63,94,0.15)", textColor: "text-gray-700" },
      { label: "Swipe Views", value: f.swipeViews, pct: Math.round((f.swipeViews / base) * 100), bg: "rgba(244,63,94,0.30)", textColor: "text-gray-800" },
      { label: "Right Swipes", value: f.rightSwipes, pct: Math.round((f.rightSwipes / base) * 100), bg: "rgba(244,63,94,0.55)", textColor: "text-white" },
      { label: "Order Intent", value: f.orderIntent, pct: Math.max(1, Math.round((f.orderIntent / base) * 100)), bg: "rgba(244,63,94,1)", textColor: "text-white" },
    ];
  }, [overview]);

  const liveGeoHotspots = useMemo(() => {
    const data = overview?.geoHotspots ?? [];
    return data.map(s => ({
      zone: s.zone,
      abbr: s.abbr,
      orders: s.count,
      growth: s.growth >= 0 ? `+${s.growth}%` : `${s.growth}%`,
    }));
  }, [overview]);

  const funnelConversionRate = useMemo(() => {
    const f = overview?.funnel;
    if (!f || f.impressions === 0) return null;
    return ((f.orderIntent / f.impressions) * 100).toFixed(1);
  }, [overview]);

  const maxRestaurantSwipes = Math.max(...liveTopRestaurants.map((r) => r.swipes), 1);
  const maxGeoOrders = Math.max(...liveGeoHotspots.map((s) => s.orders), 1);

  const kpis = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      sparkline: sparklines.users,
      accentColor: "var(--admin-deep-purple)",
    },
    {
      label: "Restaurants",
      value: stats.totalRestaurants,
      icon: Utensils,
      sparkline: sparklines.restaurants,
      accentColor: "var(--admin-blue)",
    },
    {
      label: "Total Swipes",
      value: stats.totalSwipes,
      icon: MousePointerClick,
      sparkline: sparklines.swipes,
      accentColor: "var(--admin-pink)",
    },
    {
      label: "Delivery Clicks",
      value: overview?.deliveryTotal ?? 0,
      icon: Truck,
      sparkline: sparklines.delivery,
      accentColor: "var(--admin-teal)",
    },
    {
      label: "Campaigns",
      value: stats.activeCampaigns,
      icon: Megaphone,
      sparkline: sparklines.activity,
      accentColor: "var(--admin-cyan)",
    },
  ];

  const maxBarCount = Math.max(...last7Days.map((d) => d.count), 1);

  return (
    <div className="space-y-6 bg-[#F8F8F8] min-h-full p-1" data-testid="admin-dashboard-page">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" data-testid="kpi-grid">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow duration-300"
            data-testid={`kpi-card-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <div className="h-[3px] w-full" style={{ background: kpi.accentColor }} />
            <div className="p-5 pt-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: getTintVar(kpi.accentColor) }}>
                  <kpi.icon className="w-5 h-5" style={{ color: kpi.accentColor }} />
                </div>
                <MiniSparkline data={kpi.sparkline} color={kpi.accentColor} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</p>
              <p
                className="text-2xl font-bold tracking-tight text-gray-800 mt-0.5"
                data-testid={`kpi-value-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                {dashLoading ? "-" : kpi.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden" data-testid="activity-chart-card">
          <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-gray-100">
            <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--admin-pink)" }}>
              <h2 className="text-[15px] font-semibold text-gray-800">Activity Overview</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--admin-pink)" }} />Events</span>
            </div>
          </div>
          <div className="p-6 pt-4">
          <div className="flex items-end gap-3 h-36" data-testid="activity-chart">
            {last7Days.map((day, idx) => {
              const isToday = idx === last7Days.length - 1;
              const isPeak = day.count === maxBarCount && day.count > 0;
              const barOpacity = isToday || isPeak ? 1 : 0.35;
              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-gray-500">{day.count}</span>
                  <div className="w-full relative">
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{
                        height: `${Math.max((day.count / maxBarCount) * 100, 6)}px`,
                        backgroundColor: "var(--admin-pink)",
                        opacity: barOpacity,
                      }}
                      data-testid={`bar-${day.dateStr}`}
                    />
                  </div>
                  <span className={`text-[10px] ${isToday ? "font-semibold text-gray-800" : "text-gray-400"}`}>{day.dayLabel}</span>
                </div>
              );
            })}
          </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5" data-testid="platform-health-card">
            <div className="border-l-[3px] pl-3 mb-4" style={{ borderColor: "var(--admin-blue)" }}>
              <h2 className="text-[15px] font-semibold text-gray-800">Platform Health</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Banners</span>
                <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-700" data-testid="badge-active-banners">{stats.activeBanners}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Draft Campaigns</span>
                <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-700" data-testid="badge-draft-campaigns">{stats.draftCampaigns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Events Today</span>
                <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-gray-100 text-gray-700" data-testid="badge-events-today">{stats.eventsToday}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5" data-testid="quick-actions-card">
            <div className="border-l-[3px] pl-3 mb-3" style={{ borderColor: "var(--admin-blue)" }}>
              <h2 className="text-[15px] font-semibold text-gray-800">Quick Actions</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <Link href="/admin/restaurants">
                <button className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-gray-50 text-gray-700 hover:bg-gray-100" data-testid="button-add-restaurant">
                  <Plus className="w-3.5 h-3.5" style={{ color: "var(--admin-blue)" }} />Add Restaurant<ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              </Link>
              <Link href="/admin/banners">
                <button className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-gray-50 text-gray-700 hover:bg-gray-100" data-testid="button-create-banner">
                  <ImageIcon className="w-3.5 h-3.5" style={{ color: "var(--admin-blue)" }} />Create Banner<ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              </Link>
              <Link href="/admin/analytics">
                <button className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-gray-50 text-gray-700 hover:bg-gray-100" data-testid="button-view-analytics">
                  <BarChart3 className="w-3.5 h-3.5" style={{ color: "var(--admin-blue)" }} />View Analytics<ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-conversion-funnel">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-pink)" }}>
            <h2 className="text-[15px] font-semibold text-gray-800">Conversion Funnel</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Swipe to order</p>
          </div>
          {liveFunnel.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <Activity className="w-6 h-6 opacity-30" />
              <p className="text-xs">No activity recorded yet</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-1.5">
                {liveFunnel.map((step, idx) => {
                  const widthPct = Math.max(20, step.pct);
                  return (
                    <div key={step.label} className="w-full flex flex-col items-center" data-testid={`funnel-step-${idx}`}>
                      <div
                        className="relative h-8 transition-all"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: step.bg,
                          borderRadius: idx === 0 ? "8px 8px 2px 2px" : idx === liveFunnel.length - 1 ? "2px 2px 8px 8px" : "2px",
                        }}
                      />
                      <span className="text-[11px] font-semibold text-gray-700 mt-0.5 whitespace-nowrap">
                        {step.label} — {step.value.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
              {funnelConversionRate !== null && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-2">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-[11px] text-gray-500">Overall conversion: <span className="font-semibold text-gray-800">{funnelConversionRate}%</span></span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-delivery-attribution">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-teal)" }}>
            <h2 className="text-[15px] font-semibold text-gray-800">Delivery Attribution</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Platform breakdown</p>
          </div>
          {liveDelivery.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <Truck className="w-6 h-6 opacity-30" />
              <p className="text-xs">No delivery clicks yet</p>
            </div>
          ) : (
            <div className="flex items-start gap-5">
              <DeliveryRing data={liveDelivery} />
              <div className="flex-1 grid grid-cols-1 gap-2">
                {liveDelivery.map((platform) => (
                  <div
                    key={platform.name}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
                    data-testid={`delivery-attr-${platform.name.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: platform.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{platform.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800">{platform.clicks.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">{platform.pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-top-restaurants">
          <div className="border-l-[3px] pl-3 mb-4" style={{ borderColor: "var(--admin-blue)" }}>
            <h2 className="text-[15px] font-semibold text-gray-800">Top Restaurants</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">By swipe volume</p>
          </div>
          {liveTopRestaurants.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-gray-400">
              <Utensils className="w-6 h-6 opacity-30" />
              <p className="text-xs">No swipe data yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {liveTopRestaurants.map((r, idx) => (
                <div key={r.name} data-testid={`top-restaurant-${idx}`}>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${idx === 0 ? "text-white" : "bg-gray-100 text-gray-500"}`} style={idx === 0 ? { backgroundColor: "var(--admin-blue)" } : {}}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-gray-800">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" /> : <ArrowDownRight className="w-2.5 h-2.5 text-red-400" />}
                      <span className="text-[10px] font-semibold text-gray-800">{r.conversion}%</span>
                    </div>
                  </div>
                  <div className="h-4 rounded-md bg-gray-50 overflow-hidden">
                    <div
                      className="h-full rounded-md flex items-center justify-end pr-2 transition-all"
                      style={{
                        width: `${(r.swipes / maxRestaurantSwipes) * 100}%`,
                        backgroundColor: "var(--admin-blue)",
                        opacity: 1 - (idx * 0.15),
                      }}
                    >
                      <span className="text-[9px] font-bold text-white">{r.swipes.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/analytics">
            <button className="w-full mt-3 text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 py-1.5 transition-colors" data-testid="link-view-all-restaurants">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-geo-hotspots">
          <div className="border-l-[3px] pl-3 mb-4" style={{ borderColor: "var(--admin-cyan)" }}>
            <h2 className="text-[15px] font-semibold text-gray-800">Geo Hotspots</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Bangkok zones</p>
          </div>
          {liveGeoHotspots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 gap-2 text-gray-400">
              <MapPin className="w-6 h-6 opacity-30" />
              <p className="text-xs">No location data yet</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36" data-testid="geo-chart">
              {liveGeoHotspots.map((spot, idx) => {
                const heightPct = (spot.orders / maxGeoOrders) * 100;
                return (
                  <div key={spot.zone} className="flex-1 flex flex-col items-center gap-1" data-testid={`geo-spot-${idx}`}>
                    <span className="text-[9px] font-semibold text-emerald-500">{spot.growth}</span>
                    <span className="text-[10px] font-bold text-gray-800">{spot.orders.toLocaleString()}</span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{
                          height: `${heightPct}%`,
                          minHeight: "8px",
                          backgroundColor: "var(--admin-cyan)",
                          opacity: 1 - (idx * 0.15),
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">{spot.abbr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="card-trending-cuisines">
          <div className="border-l-[3px] pl-3 mb-4" style={{ borderColor: "var(--admin-cyan)" }}>
            <h2 className="text-[15px] font-semibold text-gray-800">Trending Cuisines</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">30-day growth</p>
          </div>
          {liveCuisines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-gray-400">
              <Flame className="w-6 h-6 opacity-30" />
              <p className="text-xs">No cuisine data yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-x-2 gap-y-4">
                {liveCuisines.slice(0, 3).map((cuisine) => (
                  <div key={cuisine.name} className="flex flex-col items-center gap-1" data-testid={`trending-cuisine-${cuisine.name.toLowerCase().replace(/\s/g, "-")}`}>
                    <RadialArc value={cuisine.growth} max={cuisine.max} color={cuisine.color} size={52} />
                    <span className="text-[10px] font-medium text-gray-800 text-center leading-tight">{cuisine.name}</span>
                  </div>
                ))}
              </div>
              {liveCuisines.slice(3).length > 0 && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 pt-3 border-t border-gray-100">
                  {liveCuisines.slice(3).map((cuisine) => (
                    <div key={cuisine.name} className="flex items-center gap-2" data-testid={`trending-cuisine-${cuisine.name.toLowerCase().replace(/\s/g, "-")}`}>
                      <RadialArc value={cuisine.growth} max={cuisine.max} color={cuisine.color} size={36} />
                      <div>
                        <p className="text-[10px] font-medium text-gray-800">{cuisine.name}</p>
                        <p className="text-[9px] text-emerald-500 font-semibold">+{cuisine.growth}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="segments-card">
          <div className="border-l-[3px] pl-3 mb-5" style={{ borderColor: "var(--admin-deep-purple)" }}>
            <h2 className="text-[15px] font-semibold text-gray-800">User Segments</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Audience breakdown</p>
          </div>
          {userSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-gray-400">
              <Users className="w-6 h-6 opacity-30" />
              <p className="text-xs">No user data yet</p>
            </div>
          ) : (
            <>
              <div className="h-8 rounded-full bg-gray-100 overflow-hidden flex" data-testid="segment-stacked-bar">
                {userSegments.map((seg, idx) => {
                  const pct = (seg.estimatedCount / totalSegmentUsers) * 100;
                  return (
                    <div
                      key={seg.id}
                      className="h-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
                        opacity: SEGMENT_OPACITIES[idx % SEGMENT_OPACITIES.length],
                      }}
                      title={`${seg.name}: ${seg.estimatedCount} users (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4" data-testid="segments-legend">
                {userSegments.map((seg, idx) => {
                  const pct = Math.round((seg.estimatedCount / totalSegmentUsers) * 100);
                  return (
                    <div key={seg.id} className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2" data-testid={`segment-${seg.id}`}>
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length], opacity: SEGMENT_OPACITIES[idx % SEGMENT_OPACITIES.length] }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{seg.name}</p>
                        <p className="text-[10px] text-gray-500">{seg.estimatedCount} users</p>
                      </div>
                      <span className="text-sm font-bold text-gray-800 flex-shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6" data-testid="recent-activity-card">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div className="border-l-[3px] pl-3" style={{ borderColor: "var(--admin-pink)" }}>
              <h2 className="text-[15px] font-semibold text-gray-800">Live Activity</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Real-time events</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-500 font-medium">Live</span>
            </div>
          </div>
          {eventsLoading ? (
            <p className="text-sm text-gray-500">Loading events...</p>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm text-gray-500" data-testid="text-no-events">No events recorded yet.</p>
          ) : (
            <div className="space-y-0 max-h-64 overflow-y-auto" data-testid="events-list">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-b-0"
                  data-testid={`event-row-${event.id}`}
                >
                  <div className="mt-1.5 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${getEventDotColor(event.eventType)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">{formatEventDescription(event)}</p>
                    <p className="text-[10px] text-gray-400">{formatRelativeTime(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
