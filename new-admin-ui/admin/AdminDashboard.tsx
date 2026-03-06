import { useQuery } from "@tanstack/react-query";
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
  metadata: string | null;
  timestamp: string;
}

interface UserSegment {
  id: string;
  name: string;
  description: string;
  estimatedCount: number;
}

function getEventDotColor(eventType: string) {
  switch (eventType) {
    case "swipe_right":
      return "bg-emerald-400";
    case "swipe_left":
      return "bg-rose-400";
    case "view_detail":
      return "bg-blue-400";
    case "quiz_start":
      return "bg-[#FFCC02]";
    default:
      return "bg-muted-foreground/40";
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
  switch (event.eventType) {
    case "swipe_right":
      return `${user} liked restaurant #${event.restaurantId}`;
    case "swipe_left":
      return `${user} passed on restaurant #${event.restaurantId}`;
    case "view_detail":
      return `${user} viewed restaurant #${event.restaurantId}`;
    case "quiz_start":
      return `${user} started a taste quiz`;
    default:
      return `${user} triggered ${event.eventType}`;
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

const fallbackSegments: UserSegment[] = [
  { id: "power", name: "Power Users", description: "Highly active users", estimatedCount: 45 },
  { id: "new", name: "New Users", description: "Joined recently", estimatedCount: 120 },
  { id: "thai", name: "Thai Food Lovers", description: "Prefer Thai cuisine", estimatedCount: 89 },
  { id: "budget", name: "Budget Diners", description: "Price-conscious", estimatedCount: 67 },
];

const CONVERSION_FUNNEL = [
  { label: "Impressions", value: 12400, pct: 100, color: "hsl(222, 47%, 85%)" },
  { label: "Swipe Views", value: 8200, pct: 66, color: "hsl(222, 47%, 65%)" },
  { label: "Right Swipes", value: 3100, pct: 25, color: "hsl(45, 100%, 50%)" },
  { label: "Detail Views", value: 1800, pct: 15, color: "hsl(142, 71%, 45%)" },
  { label: "Orders", value: 420, pct: 3.4, color: "hsl(222, 47%, 27%)" },
];

const GEO_HOTSPOTS = [
  { zone: "Sukhumvit", abbr: "SKV", orders: 1240, growth: "+18%" },
  { zone: "Silom", abbr: "SLM", orders: 890, growth: "+12%" },
  { zone: "Siam", abbr: "SIM", orders: 720, growth: "+8%" },
  { zone: "Thonglor", abbr: "TLR", orders: 680, growth: "+22%" },
  { zone: "Ari", abbr: "ARI", orders: 410, growth: "+31%" },
];

const TRENDING_CUISINES = [
  { name: "Thai Street", growth: 42, max: 50, color: "hsl(222, 47%, 30%)" },
  { name: "Korean BBQ", growth: 35, max: 50, color: "hsl(195, 80%, 45%)" },
  { name: "Japanese", growth: 28, max: 50, color: "hsl(45, 100%, 50%)" },
  { name: "Italian", growth: 18, max: 50, color: "hsl(142, 71%, 45%)" },
  { name: "Vietnamese", growth: 15, max: 50, color: "hsl(222, 47%, 70%)" },
];

const DELIVERY_ATTRIBUTION = [
  { name: "Grab", clicks: 2184, pct: 46, color: "#00B14F", avgOrder: "฿285" },
  { name: "LINE MAN", clicks: 1663, pct: 35, color: "#00C300", avgOrder: "฿310" },
  { name: "Robinhood", clicks: 892, pct: 19, color: "#6C2BD9", avgOrder: "฿265" },
];

const TOP_RESTAURANTS = [
  { name: "Som Tam Nua", swipes: 2410, conversion: 72, trend: "up" as const },
  { name: "Gaggan Anand", swipes: 2170, conversion: 68, trend: "up" as const },
  { name: "Jay Fai", swipes: 1980, conversion: 54, trend: "down" as const },
  { name: "Sorn", swipes: 1560, conversion: 65, trend: "up" as const },
  { name: "Bo.Lan", swipes: 1260, conversion: 61, trend: "up" as const },
];

const SEGMENT_COLORS = ["hsl(222, 47%, 30%)", "hsl(195, 80%, 45%)", "hsl(45, 100%, 50%)", "hsl(142, 71%, 45%)"];

function MiniSparkline({ data, color = "hsl(222, 47%, 35%)" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function DeliveryRing({ data }: { data: typeof DELIVERY_ATTRIBUTION }) {
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
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground text-[14px] font-bold">{total.toLocaleString()}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-[8px]">total clicks</text>
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
        stroke="hsl(220, 14%, 92%)"
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
      <text x={cx} y={cy + 2} textAnchor="middle" className="fill-foreground text-[10px] font-bold">
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
    refetchInterval: 30000,
  });

  const { data: segments } = useQuery<UserSegment[]>({
    queryKey: ["/api/analytics/user-segments"],
  });

  const stats = dashboard || fallbackDashboard;
  const recentEvents = (events || []).slice(0, 20);
  const userSegments = segments || fallbackSegments;
  const totalSegmentUsers = userSegments.reduce((sum, s) => sum + s.estimatedCount, 0);
  const maxRestaurantSwipes = Math.max(...TOP_RESTAURANTS.map((r) => r.swipes));
  const maxGeoOrders = Math.max(...GEO_HOTSPOTS.map((s) => s.orders));

  const kpis = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      delta: "+12%",
      deltaUp: true,
      sparkline: [18, 24, 32, 28, 35, 42, 48],
      iconGradient: "linear-gradient(135deg, hsl(220,50%,93%) 0%, hsl(230,45%,87%) 100%)",
    },
    {
      label: "Restaurants",
      value: stats.totalRestaurants,
      icon: Utensils,
      delta: "+5",
      deltaUp: true,
      sparkline: [12, 14, 15, 16, 18, 19, 22],
      iconGradient: "linear-gradient(135deg, hsl(185,50%,92%) 0%, hsl(195,45%,85%) 100%)",
    },
    {
      label: "Total Swipes",
      value: stats.totalSwipes,
      icon: MousePointerClick,
      delta: "+340",
      deltaUp: true,
      sparkline: [120, 180, 210, 190, 260, 310, 340],
      iconGradient: "linear-gradient(135deg, hsl(260,50%,93%) 0%, hsl(270,45%,87%) 100%)",
    },
    {
      label: "Delivery Clicks",
      value: 4739,
      icon: Truck,
      delta: "+18%",
      deltaUp: true,
      sparkline: [320, 380, 410, 390, 450, 480, 520],
      iconGradient: "linear-gradient(135deg, hsl(155,50%,92%) 0%, hsl(165,45%,85%) 100%)",
    },
    {
      label: "Campaigns",
      value: stats.activeCampaigns,
      icon: Megaphone,
      delta: "active",
      deltaUp: true,
      sparkline: [3, 4, 4, 5, 6, 5, 6],
      iconGradient: "linear-gradient(135deg, hsl(35,80%,92%) 0%, hsl(40,70%,85%) 100%)",
    },
  ];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("en", { weekday: "short" });
    const count = recentEvents.filter((e) => e.timestamp?.startsWith(dateStr)).length;
    return { dateStr, dayLabel, count };
  });
  const maxBarCount = Math.max(...last7Days.map((d) => d.count), 1);

  return (
    <div className="space-y-6" data-testid="admin-dashboard-page">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" data-testid="kpi-grid">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-border bg-white dark:bg-card p-5 group hover:shadow-lg transition-shadow duration-300"
            data-testid={`kpi-card-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: "linear-gradient(to right, hsl(222, 47%, 25%), hsl(222, 47%, 45%))" }} />
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: kpi.iconGradient }}>
                <kpi.icon className="w-4 h-4 text-foreground" />
              </div>
              <MiniSparkline data={kpi.sparkline} />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{kpi.label}</p>
            <p
              className="text-2xl font-bold tracking-tight text-foreground mt-0.5"
              data-testid={`kpi-value-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              {dashLoading ? "-" : kpi.value.toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              {kpi.deltaUp ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-400" />
              )}
              <span className={`text-xs font-medium ${kpi.deltaUp ? "text-emerald-600" : "text-red-400"}`}>{kpi.delta}</span>
              <span className="text-[10px] text-muted-foreground/40">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="activity-chart-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(200,50%,92%) 0%, hsl(210,45%,85%) 100%)" }}>
                <BarChart3 className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Activity Overview</h2>
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">Last 7 days</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(222, 47%, 25%)" }} />Events</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FFCC02]" />Peak</span>
            </div>
          </div>
          <div className="flex items-end gap-3 h-36" data-testid="activity-chart">
            {last7Days.map((day, idx) => {
              const isToday = idx === last7Days.length - 1;
              const isPeak = day.count === maxBarCount && day.count > 0;
              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">{day.count}</span>
                  <div className="w-full relative">
                    <div
                      className="w-full rounded-lg transition-all duration-500"
                      style={{
                        height: `${Math.max((day.count / maxBarCount) * 100, 6)}px`,
                        background: isPeak
                          ? "linear-gradient(to top, hsl(45, 100%, 45%), hsl(45, 100%, 55%))"
                          : isToday
                            ? "linear-gradient(to top, hsl(222, 47%, 20%), hsl(222, 47%, 35%))"
                            : "linear-gradient(to top, hsl(220, 14%, 82%), hsl(220, 14%, 90%))",
                      }}
                      data-testid={`bar-${day.dateStr}`}
                    />
                  </div>
                  <span className={`text-[10px] ${isToday ? "font-semibold text-foreground" : "text-muted-foreground/60"}`}>{day.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-5" data-testid="platform-health-card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#FFCC02]" />
              <h2 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Platform Health</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Banners</span>
                <span className="bg-gray-100 dark:bg-muted text-foreground text-xs font-semibold rounded-full px-2.5 py-0.5" data-testid="badge-active-banners">{stats.activeBanners}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Draft Campaigns</span>
                <span className="bg-gray-100 dark:bg-muted text-muted-foreground text-xs font-medium rounded-full px-2.5 py-0.5" data-testid="badge-draft-campaigns">{stats.draftCampaigns}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Events Today</span>
                <span className="bg-[#FFCC02] text-foreground text-xs font-semibold rounded-full px-2.5 py-0.5" data-testid="badge-events-today">{stats.eventsToday}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-5" data-testid="quick-actions-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-foreground" />
              <h2 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Quick Actions</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <Link href="/admin/restaurants">
                <button className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-muted text-foreground text-sm font-medium hover:bg-gray-100 dark:hover:bg-muted/80 transition-colors" data-testid="button-add-restaurant">
                  <Plus className="w-3.5 h-3.5" />Add Restaurant<ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              </Link>
              <Link href="/admin/banners">
                <button className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-muted text-foreground text-sm font-medium hover:bg-gray-100 dark:hover:bg-muted/80 transition-colors" data-testid="button-create-banner">
                  <ImageIcon className="w-3.5 h-3.5" />Create Banner<ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              </Link>
              <Link href="/admin/analytics">
                <button className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-muted text-foreground text-sm font-medium hover:bg-gray-100 dark:hover:bg-muted/80 transition-colors" data-testid="button-view-analytics">
                  <BarChart3 className="w-3.5 h-3.5" />View Analytics<ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="card-conversion-funnel">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(185,50%,92%) 0%, hsl(195,45%,85%) 100%)" }}>
              <Target className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Conversion Funnel</h2>
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">Swipe to order</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            {CONVERSION_FUNNEL.map((step, idx) => {
              const widthPct = Math.max(20, step.pct);
              return (
                <div key={step.label} className="w-full flex flex-col items-center" data-testid={`funnel-step-${idx}`}>
                  <div
                    className="relative flex items-center justify-center py-2 transition-all"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: step.color,
                      borderRadius: idx === 0 ? "8px 8px 2px 2px" : idx === CONVERSION_FUNNEL.length - 1 ? "2px 2px 8px 8px" : "2px",
                    }}
                  >
                    <span className={`text-[11px] font-semibold whitespace-nowrap ${idx >= 3 ? "text-white" : "text-foreground"}`}>
                      {step.label} — {step.value.toLocaleString()}
                    </span>
                  </div>
                  {idx < CONVERSION_FUNNEL.length - 1 && (
                    <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-gray-300 dark:border-t-border" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border flex items-center justify-center gap-2">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Overall conversion: <span className="font-semibold text-foreground">3.4%</span></span>
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="card-delivery-attribution">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(155,50%,92%) 0%, hsl(165,45%,85%) 100%)" }}>
              <Truck className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Delivery Attribution</h2>
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">Platform breakdown</p>
            </div>
          </div>
          <div className="flex items-start gap-5">
            <DeliveryRing data={DELIVERY_ATTRIBUTION} />
            <div className="flex-1 grid grid-cols-1 gap-2">
              {DELIVERY_ATTRIBUTION.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-muted px-3 py-2.5"
                  data-testid={`delivery-attr-${platform.name.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: platform.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{platform.name}</p>
                    <p className="text-[10px] text-muted-foreground">Avg {platform.avgOrder}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">{platform.clicks.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{platform.pct}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="card-top-restaurants">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(35,80%,92%) 0%, hsl(40,70%,85%) 100%)" }}>
              <Star className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Top Restaurants</h2>
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">By swipe volume</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {TOP_RESTAURANTS.map((r, idx) => (
              <div key={r.name} data-testid={`top-restaurant-${idx}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${idx === 0 ? "bg-[#FFCC02] text-foreground" : "bg-gray-100 dark:bg-muted text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" /> : <ArrowDownRight className="w-2.5 h-2.5 text-red-400" />}
                    <span className="text-[10px] font-semibold text-foreground">{r.conversion}%</span>
                  </div>
                </div>
                <div className="h-4 rounded-md bg-gray-50 dark:bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md flex items-center justify-end pr-2 transition-all"
                    style={{
                      width: `${(r.swipes / maxRestaurantSwipes) * 100}%`,
                      background: idx === 0
                        ? "linear-gradient(90deg, hsl(45, 100%, 45%), hsl(45, 100%, 55%))"
                        : "linear-gradient(90deg, hsl(222, 47%, 70%), hsl(222, 47%, 50%))",
                    }}
                  >
                    <span className={`text-[9px] font-bold ${idx === 0 ? "text-foreground" : "text-white"}`}>{r.swipes.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/admin/analytics">
            <button className="w-full mt-3 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1.5 transition-colors" data-testid="link-view-all-restaurants">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="card-geo-hotspots">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(260,50%,93%) 0%, hsl(270,45%,87%) 100%)" }}>
              <MapPin className="w-4 h-4" style={{ color: "hsl(222, 47%, 35%)" }} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Geo Hotspots</h2>
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">Bangkok zones</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-36" data-testid="geo-chart">
            {GEO_HOTSPOTS.map((spot, idx) => {
              const heightPct = (spot.orders / maxGeoOrders) * 100;
              return (
                <div key={spot.zone} className="flex-1 flex flex-col items-center gap-1" data-testid={`geo-spot-${idx}`}>
                  <span className="text-[9px] font-semibold text-emerald-500">{spot.growth}</span>
                  <span className="text-[10px] font-bold text-foreground">{spot.orders.toLocaleString()}</span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${heightPct}%`,
                        minHeight: "8px",
                        background: idx === 0
                          ? "linear-gradient(to top, hsl(222, 47%, 20%), hsl(222, 47%, 30%))"
                          : `linear-gradient(to top, hsl(222, 47%, ${55 + idx * 8}%), hsl(222, 47%, ${65 + idx * 8}%))`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">{spot.abbr}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="card-trending-cuisines">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(15,80%,93%) 0%, hsl(20,70%,87%) 100%)" }}>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Trending Cuisines</h2>
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">30-day growth</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-4">
            {TRENDING_CUISINES.slice(0, 3).map((cuisine) => (
              <div key={cuisine.name} className="flex flex-col items-center gap-1" data-testid={`trending-cuisine-${cuisine.name.toLowerCase().replace(/\s/g, "-")}`}>
                <RadialArc value={cuisine.growth} max={cuisine.max} color={cuisine.color} size={52} />
                <span className="text-[10px] font-medium text-foreground text-center leading-tight">{cuisine.name}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-4 pt-3 border-t border-gray-100 dark:border-border">
            {TRENDING_CUISINES.slice(3).map((cuisine) => (
              <div key={cuisine.name} className="flex items-center gap-2" data-testid={`trending-cuisine-${cuisine.name.toLowerCase().replace(/\s/g, "-")}`}>
                <RadialArc value={cuisine.growth} max={cuisine.max} color={cuisine.color} size={36} />
                <div>
                  <p className="text-[10px] font-medium text-foreground">{cuisine.name}</p>
                  <p className="text-[9px] text-emerald-500 font-semibold">+{cuisine.growth}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="segments-card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(200,50%,92%) 0%, hsl(210,45%,85%) 100%)" }}>
              <Users className="w-4 h-4" style={{ color: "hsl(222, 47%, 35%)" }} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">User Segments</h2>
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">Audience breakdown</p>
            </div>
          </div>
          <div className="h-8 rounded-full bg-gray-100 dark:bg-muted overflow-hidden flex" data-testid="segment-stacked-bar">
            {userSegments.map((seg, idx) => {
              const pct = (seg.estimatedCount / totalSegmentUsers) * 100;
              return (
                <div
                  key={seg.id}
                  className="h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
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
                <div key={seg.id} className="flex items-center gap-2.5 rounded-lg bg-gray-50 dark:bg-muted px-3 py-2" data-testid={`segment-${seg.id}`}>
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{seg.name}</p>
                    <p className="text-[10px] text-muted-foreground">{seg.estimatedCount} users</p>
                  </div>
                  <span className="text-sm font-bold text-foreground flex-shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6" data-testid="recent-activity-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(220,50%,93%) 0%, hsl(230,45%,87%) 100%)" }}>
                <Activity className="w-4 h-4" style={{ color: "hsl(222, 47%, 35%)" }} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Live Activity</h2>
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">Real-time events</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-600 font-medium">Live</span>
            </div>
          </div>
          {eventsLoading ? (
            <p className="text-sm text-muted-foreground">Loading events...</p>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-events">No events recorded yet.</p>
          ) : (
            <div className="space-y-0 max-h-64 overflow-y-auto" data-testid="events-list">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-border last:border-b-0"
                  data-testid={`event-row-${event.id}`}
                >
                  <div className="mt-1.5 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${getEventDotColor(event.eventType)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{formatEventDescription(event)}</p>
                    <p className="text-[10px] text-muted-foreground/40">{formatRelativeTime(event.timestamp)}</p>
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
