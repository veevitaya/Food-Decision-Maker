import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsEvent } from "@shared/schema";
import {
  Users,
  TrendingUp,
  MousePointer,
  Heart,
  Eye,
  Activity,
  BarChart3,
  Star,
  Clock,
  ArrowUpRight,
  ShoppingBag,
  MapPin,
  Target,
  Layers,
  Sparkles,
  Timer,
  Download,
  ExternalLink,
  Utensils,
  Sun,
  Moon,
  ChevronDown,
  Zap,
  Brain,
  Calendar,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DateRange = "7d" | "30d" | "all";

function eventDot(type: string) {
  switch (type) {
    case "swipe_right":
      return <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block flex-shrink-0" />;
    case "swipe_left":
      return <span className="w-2 h-2 rounded-full bg-rose-400 inline-block flex-shrink-0" />;
    case "view_detail":
      return <span className="w-2 h-2 rounded-full bg-blue-400 inline-block flex-shrink-0" />;
    default:
      return <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block flex-shrink-0" />;
  }
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface SummaryData {
  totalUsers: number;
  totalRestaurants: number;
  totalSwipes: number;
  activeCampaigns: number;
  totalEvents: number;
  eventBreakdown: Record<string, number>;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  estimatedCount: number;
}

interface TopRestaurant {
  restaurantId: number;
  name: string;
  count: number;
}

const CONVERSION_FUNNEL = [
  { label: "Impressions", value: 12400, pct: 100, color: "hsl(222, 47%, 85%)" },
  { label: "Swipe Views", value: 8200, pct: 66, color: "hsl(222, 47%, 70%)" },
  { label: "Right Swipes", value: 3100, pct: 25, color: "hsl(45, 100%, 50%)" },
  { label: "Detail Views", value: 1800, pct: 15, color: "hsl(142, 71%, 45%)" },
  { label: "Orders / Bookings", value: 420, pct: 3.4, color: "hsl(222, 47%, 27%)" },
];

const GEO_HOTSPOTS = [
  { zone: "Sukhumvit", orders: 1240, growth: "+18%", rank: 1 },
  { zone: "Silom / Sathorn", orders: 890, growth: "+12%", rank: 2 },
  { zone: "Siam / CentralWorld", orders: 720, growth: "+8%", rank: 3 },
  { zone: "Thonglor / Ekkamai", orders: 680, growth: "+22%", rank: 4 },
  { zone: "Ari / Phahonyothin", orders: 410, growth: "+31%", rank: 5 },
];

const TRENDING_CUISINES = [
  { name: "Thai Street Food", growth: 42 },
  { name: "Korean BBQ", growth: 35 },
  { name: "Japanese Izakaya", growth: 28 },
  { name: "Italian", growth: 18 },
  { name: "Vietnamese", growth: 15 },
];

const RESTAURANT_PERFORMANCE = [
  { name: "Som Tam Nua", views: 4820, swipesRight: 2410, grabClicks: 890, lineManClicks: 620, robinhoodClicks: 210, conversion: 72 },
  { name: "Gaggan Anand", views: 3950, swipesRight: 2170, grabClicks: 740, lineManClicks: 510, robinhoodClicks: 180, conversion: 68 },
  { name: "Jay Fai", views: 5100, swipesRight: 1980, grabClicks: 420, lineManClicks: 380, robinhoodClicks: 145, conversion: 54 },
  { name: "Sorn", views: 2840, swipesRight: 1560, grabClicks: 680, lineManClicks: 440, robinhoodClicks: 165, conversion: 65 },
  { name: "Raan Jay Fai", views: 3200, swipesRight: 1440, grabClicks: 520, lineManClicks: 390, robinhoodClicks: 130, conversion: 58 },
  { name: "Bo.Lan", views: 2100, swipesRight: 1260, grabClicks: 410, lineManClicks: 350, robinhoodClicks: 95, conversion: 61 },
  { name: "Namsaah Bottling Trust", views: 1890, swipesRight: 1050, grabClicks: 380, lineManClicks: 290, robinhoodClicks: 85, conversion: 56 },
  { name: "Paste Bangkok", views: 2450, swipesRight: 1340, grabClicks: 490, lineManClicks: 360, robinhoodClicks: 120, conversion: 59 },
];

const HEATMAP_DATA: number[][] = [
  [2, 3, 8, 15, 22, 35, 48, 52, 45, 38, 42, 55, 60, 48, 35, 28, 20, 12],
  [1, 2, 6, 12, 20, 32, 45, 50, 42, 35, 40, 52, 58, 45, 32, 25, 18, 10],
  [3, 4, 9, 18, 25, 38, 52, 58, 50, 42, 48, 62, 68, 55, 40, 32, 22, 14],
  [2, 3, 7, 14, 22, 34, 48, 54, 46, 38, 44, 58, 64, 50, 36, 28, 20, 11],
  [4, 6, 12, 22, 30, 45, 58, 65, 55, 48, 55, 72, 78, 62, 48, 38, 28, 18],
  [5, 8, 15, 28, 35, 50, 62, 70, 60, 52, 58, 75, 82, 68, 52, 42, 32, 22],
  [6, 10, 18, 32, 40, 55, 68, 75, 65, 55, 62, 80, 88, 72, 55, 45, 35, 25],
];
const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEATMAP_HOURS = Array.from({ length: 18 }, (_, i) => `${i + 6}:00`);

const DELIVERY_PLATFORMS = [
  { name: "Grab", totalClicks: 12480, conversionRate: 8.2, avgOrderValue: 285, color: "#00B14F", bgColor: "bg-green-50 dark:bg-muted" },
  { name: "LINE MAN", totalClicks: 9640, conversionRate: 7.1, avgOrderValue: 310, color: "#00C300", bgColor: "bg-emerald-50 dark:bg-muted" },
  { name: "Robinhood", totalClicks: 4380, conversionRate: 5.4, avgOrderValue: 265, color: "#6C2BD9", bgColor: "bg-purple-50 dark:bg-muted" },
];

const DAY_PATTERNS = [
  { day: "Mon", value: 62 },
  { day: "Tue", value: 58 },
  { day: "Wed", value: 71 },
  { day: "Thu", value: 68 },
  { day: "Fri", value: 85 },
  { day: "Sat", value: 92 },
  { day: "Sun", value: 78 },
];

const MEAL_CATEGORIES = [
  { meal: "Lunch", thai: 35, japanese: 20, korean: 15, italian: 10, other: 20 },
  { meal: "Dinner", thai: 25, japanese: 28, korean: 18, italian: 15, other: 14 },
  { meal: "Late Night", thai: 40, japanese: 12, korean: 22, italian: 8, other: 18 },
];

const DATA_PACKAGES = [
  { name: "User Demographics", desc: "Age, gender, location distribution", icon: Users },
  { name: "Behavioral Patterns", desc: "Session frequency, swipe patterns, time-of-day", icon: Activity },
  { name: "Location Heatmaps", desc: "Geographic demand density by zone", icon: MapPin },
  { name: "Menu Trends", desc: "Cuisine popularity, price sensitivity, dietary preferences", icon: Utensils },
  { name: "Time-based Demand", desc: "Hourly/daily/weekly demand forecasting data", icon: Clock },
];

const DATA_INSIGHTS_CATALOG = [
  {
    category: "Menu Performance",
    icon: ShoppingBag,
    headerGradient: "linear-gradient(135deg, hsl(200,50%,92%) 0%, hsl(210,45%,85%) 100%)",
    insights: [
      { name: "Orders & Revenue Trend", desc: "Total orders, revenue per menu, views & matches" },
      { name: "Performance by Time", desc: "Lunch vs dinner vs late-night breakdown" },
      { name: "Promotion Effectiveness", desc: "Promoted menu conversion & sponsored card ROI" },
    ],
  },
  {
    category: "Order & Booking",
    icon: Target,
    headerGradient: "linear-gradient(135deg, hsl(240,40%,92%) 0%, hsl(250,35%,85%) 100%)",
    insights: [
      { name: "Swipe-to-Order Revenue", desc: "Orders generated through swipe, partner breakdown" },
      { name: "Conversion Funnel", desc: "Swipe → Match → Order rate analysis" },
      { name: "Partner Attribution", desc: "Revenue split by Grab, LINE MAN, Robinhood, and direct" },
    ],
  },
  {
    category: "Market Trends",
    icon: TrendingUp,
    headerGradient: "linear-gradient(135deg, hsl(170,40%,90%) 0%, hsl(180,35%,83%) 100%)",
    insights: [
      { name: "Trending Categories", desc: "Cuisine & dish popularity growth curves" },
      { name: "Price Positioning", desc: "Avg price vs nearby competitors" },
      { name: "Competitive Density", desc: "Category saturation & order share analysis" },
      { name: "Demand Patterns", desc: "Weekend/holiday/season shifts by location & age" },
    ],
  },
  {
    category: "User Behavior",
    icon: Eye,
    headerGradient: "linear-gradient(135deg, hsl(240,40%,92%) 0%, hsl(250,35%,85%) 100%)",
    insights: [
      { name: "Menu Discoverability", desc: "Swipe vs search exposure, tag-keyword alignment" },
      { name: "Interest & Engagement", desc: "Attention, Interest, Action KPIs & CTA performance" },
      { name: "Audience Signals", desc: "Behavior segmented by user type, time, demographics" },
    ],
  },
  {
    category: "Geographic Insights",
    icon: MapPin,
    headerGradient: "linear-gradient(135deg, hsl(170,40%,90%) 0%, hsl(180,35%,83%) 100%)",
    insights: [
      { name: "Order Density Heatmap", desc: "Orders by zone, hot zones for targeted campaigns" },
      { name: "High-Value Areas", desc: "Revenue concentration by location" },
      { name: "Distance Impact", desc: "How distance affects match/order success rate" },
      { name: "Expansion Opportunities", desc: "High demand + low competition zones" },
    ],
  },
];

const USER_GENDER_DATA = [
  { label: "Female", pct: 51, color: "hsl(350, 95%, 73%)" },
  { label: "Male", pct: 42, color: "hsl(235, 90%, 75%)" },
  { label: "Other", pct: 7, color: "hsl(260, 90%, 77%)" },
];

const USER_AGE_DATA = [
  { label: "18-24", pct: 18 },
  { label: "25-34", pct: 38 },
  { label: "35-44", pct: 25 },
  { label: "45-54", pct: 12 },
  { label: "55+", pct: 7 },
];

const USER_TYPE_SEGMENTS = [
  { label: "Solo Diners", pct: 35, count: 1_247, topCuisine: "Japanese", avgBudget: "฿฿", peakTime: "12-1pm", color: "hsl(239, 84%, 67%)" },
  { label: "Couples", pct: 22, count: 784, topCuisine: "Italian", avgBudget: "฿฿฿", peakTime: "7-8pm", color: "hsl(189, 95%, 43%)" },
  { label: "Friends Group", pct: 18, count: 641, topCuisine: "Korean BBQ", avgBudget: "฿฿", peakTime: "6-8pm", color: "hsl(258, 90%, 66%)" },
  { label: "Families", pct: 15, count: 534, topCuisine: "Thai", avgBudget: "฿฿฿", peakTime: "11am-1pm", color: "hsl(160, 84%, 39%)" },
  { label: "Coworkers", pct: 10, count: 356, topCuisine: "Buffet", avgBudget: "฿฿", peakTime: "12-1pm", color: "hsl(38, 92%, 50%)" },
];

const USER_BEHAVIORAL_COHORTS = [
  { label: "Power Users", freq: "10+/week", pct: 8, sessions: 14.2, swipes: 48, color: "hsl(239, 84%, 67%)" },
  { label: "Regular", freq: "3-9/week", pct: 32, sessions: 5.4, swipes: 22, color: "hsl(189, 95%, 43%)" },
  { label: "Casual", freq: "1-2/week", pct: 42, sessions: 1.6, swipes: 8, color: "hsl(258, 90%, 66%)" },
  { label: "Dormant", freq: "<1/week", pct: 18, sessions: 0.3, swipes: 2, color: "hsl(215, 16%, 47%)" },
];

const USER_DAY_ACTIVITY = [
  { day: "Mon", pct: 62 },
  { day: "Tue", pct: 55 },
  { day: "Wed", pct: 58 },
  { day: "Thu", pct: 65 },
  { day: "Fri", pct: 88 },
  { day: "Sat", pct: 95 },
  { day: "Sun", pct: 78 },
];

const USER_PEAK_HOURS = [
  { hour: "11am-12pm", pct: 45 },
  { hour: "12-1pm", pct: 82 },
  { hour: "1-2pm", pct: 60 },
  { hour: "5-6pm", pct: 55 },
  { hour: "6-7pm", pct: 78 },
  { hour: "7-8pm", pct: 90 },
  { hour: "8-9pm", pct: 68 },
];

const USER_AI_INSIGHTS = [
  "Couples prefer Japanese restaurants 2.3x more than average",
  "Power users order via Grab 67% of the time",
  "Friday-Saturday dinner sessions are 40% longer than weekday average",
  "Solo diners in the 25-34 age group have the highest retention rate at 82%",
];

function getHeatmapColor(value: number): string {
  const max = 88;
  const intensity = value / max;
  if (intensity < 0.15) return "hsl(222, 47%, 95%)";
  if (intensity < 0.3) return "hsl(222, 47%, 85%)";
  if (intensity < 0.45) return "hsl(222, 47%, 72%)";
  if (intensity < 0.6) return "hsl(222, 47%, 58%)";
  if (intensity < 0.75) return "hsl(222, 47%, 45%)";
  if (intensity < 0.9) return "hsl(222, 47%, 35%)";
  return "hsl(222, 47%, 25%)";
}

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showUserIntel, setShowUserIntel] = useState(true);

  const sinceParam =
    dateRange === "7d"
      ? new Date(Date.now() - 7 * 86400000).toISOString()
      : dateRange === "30d"
        ? new Date(Date.now() - 30 * 86400000).toISOString()
        : "";

  const { data: summary, isLoading: loadingSummary } = useQuery<SummaryData>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: segments = [], isLoading: loadingSegments } = useQuery<Segment[]>({
    queryKey: ["/api/analytics/user-segments"],
  });

  const { data: topRestaurants = [], isLoading: loadingTop } = useQuery<TopRestaurant[]>({
    queryKey: ["/api/analytics/top-restaurants"],
  });

  const eventsUrl = sinceParam
    ? `/api/analytics/events?since=${encodeURIComponent(sinceParam)}`
    : "/api/analytics/events";
  const { data: events = [], isLoading: loadingEvents } = useQuery<AnalyticsEvent[]>({
    queryKey: [eventsUrl],
  });

  const maxSegmentCount = Math.max(...segments.map((s) => s.estimatedCount), 1);
  const eventBreakdown = summary?.eventBreakdown || {};
  const maxEventCount = Math.max(...Object.values(eventBreakdown), 1);

  const summaryKpis = [
    { label: "Total Events", value: summary?.totalEvents || 0, icon: Activity, iconColor: "text-blue-500" },
    { label: "Total Swipes", value: summary?.totalSwipes || 0, icon: MousePointer, iconColor: "text-teal-500" },
    { label: "Active Campaigns", value: summary?.activeCampaigns || 0, icon: Target, iconColor: "text-purple-500" },
    { label: "Restaurants", value: summary?.totalRestaurants || 0, icon: ShoppingBag, iconColor: "text-orange-500" },
    { label: "Delivery Clicks", value: 3847, icon: ExternalLink, iconColor: "text-emerald-500" },
    { label: "Avg Session", value: "4.2min", icon: Timer, iconColor: "text-slate-500" },
  ];

  const maxDayValue = Math.max(...DAY_PATTERNS.map((d) => d.value));

  return (
    <div data-testid="admin-analytics-page" className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-teal-500" />
          <div>
            <h2 className="text-xl font-semibold text-foreground" data-testid="text-analytics-title">
              Data Intelligence
            </h2>
            <p className="text-xs text-muted-foreground">Platform insights & partner analytics</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-muted rounded-xl p-1">
          {([
            ["7d", "7 days"],
            ["30d", "30 days"],
            ["all", "All time"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              data-testid={`tab-date-${key}`}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${
                dateRange === key
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {summaryKpis.map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border p-4" data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground" data-testid={`kpi-value-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}>
              {loadingSummary && typeof kpi.value === "number" && kpi.label !== "Delivery Clicks" && kpi.label !== "Avg Session"
                ? "-"
                : typeof kpi.value === "number"
                  ? kpi.value.toLocaleString()
                  : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* User Intelligence Section */}
      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden" data-testid="section-user-intelligence">
        <button
          onClick={() => setShowUserIntel(!showUserIntel)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-muted transition-colors"
          data-testid="button-toggle-user-intel"
        >
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-purple-500" />
            <div className="text-left">
              <h3 className="text-[15px] font-semibold text-foreground">User Intelligence</h3>
              <p className="text-xs text-muted-foreground/40">Demographics, behavior cohorts, activity patterns</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showUserIntel ? "rotate-180" : ""}`} />
        </button>
        {showUserIntel && (
          <div className="px-6 pb-6 pt-2 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-user-kpis">
              <UserKpiCard icon={<Users className="w-4 h-4 text-indigo-500" />} label="Total Users" value={(summary?.totalUsers || 0).toLocaleString()} gradient="linear-gradient(135deg, hsl(230,50%,92%) 0%, hsl(240,45%,85%) 100%)" />
              <UserKpiCard icon={<Activity className="w-4 h-4 text-cyan-500" />} label="Active This Week" value="68%" sub="2,422 users" gradient="linear-gradient(135deg, hsl(185,50%,92%) 0%, hsl(195,45%,85%) 100%)" />
              <UserKpiCard icon={<BarChart3 className="w-4 h-4 text-violet-500" />} label="Avg Sessions/User" value="3.2" sub="per week" gradient="linear-gradient(135deg, hsl(260,50%,92%) 0%, hsl(270,45%,85%) 100%)" />
              <UserKpiCard icon={<TrendingUp className="w-4 h-4 text-green-500" />} label="Retention Rate" value="74%" sub="+3% vs last month" gradient="linear-gradient(135deg, hsl(145,50%,92%) 0%, hsl(155,45%,85%) 100%)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 dark:border-border p-5" data-testid="section-gender-distribution">
                <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Gender Distribution</h4>
                <div className="space-y-2.5">
                  {USER_GENDER_DATA.map((g) => (
                    <div key={g.label} className="flex items-center gap-3">
                      <span className="w-14 text-xs text-muted-foreground">{g.label}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-muted rounded-full h-5 overflow-hidden">
                        <div className="h-full rounded-full flex items-center pl-2.5 text-[10px] font-medium text-white transition-all" style={{ width: `${g.pct}%`, backgroundColor: g.color }} data-testid={`bar-gender-${g.label.toLowerCase()}`}>
                          {g.pct}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-border p-5" data-testid="section-age-demographics">
                <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Age Demographics</h4>
                <div className="space-y-2.5">
                  {USER_AGE_DATA.map((a) => (
                    <div key={a.label} className="flex items-center gap-3">
                      <span className="w-14 text-xs text-muted-foreground">{a.label}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-muted rounded-full h-5 overflow-hidden">
                        <div className="h-full rounded-full flex items-center pl-2.5 text-[10px] font-medium text-white transition-all" style={{ width: `${a.pct}%`, background: "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))" }} data-testid={`bar-age-${a.label}`}>
                          {a.pct}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-border p-5" data-testid="section-user-type-segments">
              <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">User Type Segments</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {USER_TYPE_SEGMENTS.map((seg) => (
                  <div key={seg.label} className="rounded-lg border border-gray-100 dark:border-border p-3" data-testid={`card-segment-${seg.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs font-medium text-foreground">{seg.label}</span>
                    </div>
                    <div className="text-xl font-bold tracking-tight text-foreground mb-1">{seg.count.toLocaleString()}</div>
                    <div className="w-full bg-gray-100 dark:bg-muted rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${seg.pct}%`, backgroundColor: seg.color }} />
                    </div>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between"><span>Top Cuisine</span><span className="font-medium text-foreground">{seg.topCuisine}</span></div>
                      <div className="flex justify-between"><span>Avg Budget</span><span className="font-medium text-foreground">{seg.avgBudget}</span></div>
                      <div className="flex justify-between"><span>Peak Time</span><span className="font-medium text-foreground">{seg.peakTime}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-border p-5" data-testid="section-behavioral-cohorts">
              <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Behavioral Cohorts</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {USER_BEHAVIORAL_COHORTS.map((c) => (
                  <div key={c.label} className="rounded-lg border border-gray-100 dark:border-border p-3" data-testid={`card-cohort-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-medium text-foreground">{c.label}</span>
                      <span className="text-[10px] font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: c.color + "18", color: c.color }}>{c.freq}</span>
                    </div>
                    <div className="text-xl font-bold tracking-tight text-foreground mb-1">{c.pct}%</div>
                    <div className="w-full bg-gray-100 dark:bg-muted rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.pct * 2}%`, backgroundColor: c.color }} />
                    </div>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex justify-between"><span>Avg Sessions</span><span className="font-medium text-foreground">{c.sessions}/wk</span></div>
                      <div className="flex justify-between"><span>Avg Swipes</span><span className="font-medium text-foreground">{c.swipes}/wk</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 dark:border-border p-5" data-testid="section-user-day-activity">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Day-of-Week Activity</h4>
                </div>
                <div className="flex items-end gap-2 h-28">
                  {USER_DAY_ACTIVITY.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-foreground">{d.pct}%</span>
                      <div className="w-full bg-gray-100 dark:bg-muted rounded-md overflow-hidden" style={{ height: "80px" }}>
                        <div className="w-full rounded-md" style={{ height: `${d.pct}%`, background: "linear-gradient(180deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))", marginTop: `${100 - d.pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-border p-5" data-testid="section-user-peak-hours">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Peak Hours</h4>
                </div>
                <div className="space-y-1.5">
                  {USER_PEAK_HOURS.map((h) => (
                    <div key={h.hour} className="flex items-center gap-2">
                      <span className="w-20 text-[10px] text-muted-foreground">{h.hour}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-muted rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${h.pct}%`, background: "linear-gradient(90deg, hsl(185, 90%, 45%), hsl(185, 80%, 55%))" }} />
                      </div>
                      <span className="w-8 text-right text-[10px] font-medium text-foreground">{h.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-muted dark:to-muted border border-gray-100 dark:border-border p-5" data-testid="section-user-ai-insights">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-3.5 h-3.5 text-[#FFCC02]" />
                <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">AI-Generated Insights</h4>
                <span className="inline-flex items-center text-[10px] font-medium rounded-full px-1.5 py-0.5 bg-[#FFCC02]/15 text-foreground">
                  <Zap className="w-2.5 h-2.5 mr-0.5 text-[#FFCC02]" />Auto
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {USER_AI_INSIGHTS.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-lg p-2.5 bg-white dark:bg-card border border-gray-100 dark:border-border" data-testid={`text-user-ai-insight-${idx}`}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))" }}>
                      <span className="text-white text-[9px] font-bold">{idx + 1}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Restaurant Performance Table */}
      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-restaurant-performance">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(35,80%,92%) 0%, hsl(40,70%,85%) 100%)" }}>
            <Star className="w-4 h-4 text-[#FFCC02]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Restaurant Performance</h3>
            <p className="text-xs text-muted-foreground/40">Top 8 Bangkok restaurants by engagement</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-restaurant-performance">
            <thead>
              <tr className="border-b border-gray-100 dark:border-border">
                <th className="text-left py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Name</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Views</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Swipes Right</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Grab Clicks</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">LINE MAN</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Robinhood</th>
                <th className="text-right py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium pr-2">Conversion %</th>
              </tr>
            </thead>
            <tbody>
              {RESTAURANT_PERFORMANCE.map((r) => (
                <tr key={r.name} className="border-b border-gray-100 dark:border-border" data-testid={`perf-row-${r.name.toLowerCase().replace(/\s/g, "-")}`}>
                  <td className="py-2.5 font-medium text-foreground">{r.name}</td>
                  <td className="text-right text-muted-foreground py-2.5">{r.views.toLocaleString()}</td>
                  <td className="text-right text-muted-foreground py-2.5">{r.swipesRight.toLocaleString()}</td>
                  <td className="text-right text-green-500 font-medium py-2.5">{r.grabClicks.toLocaleString()}</td>
                  <td className="text-right text-cyan-500 font-medium py-2.5">{r.lineManClicks.toLocaleString()}</td>
                  <td className="text-right text-purple-500 font-medium py-2.5">{r.robinhoodClicks.toLocaleString()}</td>
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${r.conversion}%`,
                            background: "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))",
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground w-8 text-right">{r.conversion}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Behavior Heatmap */}
      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-user-heatmap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(270,50%,92%) 0%, hsl(260,45%,85%) 100%)" }}>
            <Layers className="w-4 h-4" style={{ color: "hsl(222, 47%, 35%)" }} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">User Behavior Heatmap</h3>
            <p className="text-xs text-muted-foreground/40">Activity intensity by day and hour</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="flex gap-1 mb-1 pl-10">
              {HEATMAP_HOURS.filter((_, i) => i % 3 === 0).map((h) => (
                <span key={h} className="text-[9px] text-muted-foreground font-medium" style={{ width: `${(3 / 18) * 100}%` }}>
                  {h}
                </span>
              ))}
            </div>
            {HEATMAP_DATA.map((row, dayIdx) => (
              <div key={HEATMAP_DAYS[dayIdx]} className="flex items-center gap-1 mb-0.5" data-testid={`heatmap-row-${HEATMAP_DAYS[dayIdx].toLowerCase()}`}>
                <span className="w-8 text-[10px] text-muted-foreground font-medium text-right flex-shrink-0">{HEATMAP_DAYS[dayIdx]}</span>
                {row.map((val, hourIdx) => (
                  <div
                    key={hourIdx}
                    className="flex-1 h-6 rounded-sm cursor-default"
                    style={{ backgroundColor: getHeatmapColor(val) }}
                    title={`${HEATMAP_DAYS[dayIdx]} ${HEATMAP_HOURS[hourIdx]} — ${val} sessions`}
                    data-testid={`heatmap-cell-${dayIdx}-${hourIdx}`}
                  />
                ))}
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[9px] text-muted-foreground">Low</span>
              <div className="flex gap-0.5">
                {["hsl(222,47%,95%)", "hsl(222,47%,85%)", "hsl(222,47%,72%)", "hsl(222,47%,58%)", "hsl(222,47%,45%)", "hsl(222,47%,35%)", "hsl(222,47%,25%)"].map((c) => (
                  <div key={c} className="w-5 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground">High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Platform Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="section-delivery-platforms">
        {DELIVERY_PLATFORMS.map((platform) => (
          <div key={platform.name} className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid={`card-delivery-${platform.name.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${platform.bgColor}`}>
                <ExternalLink className="w-4 h-4" style={{ color: platform.color }} />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">{platform.name}</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Clicks</span>
                  <span className="text-sm font-semibold text-foreground">{platform.totalClicks.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(platform.totalClicks / 15000) * 100}%`, backgroundColor: platform.color }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Conversion Rate</span>
                  <span className="text-sm font-semibold text-foreground">{platform.conversionRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(platform.conversionRate / 10) * 100}%`, backgroundColor: platform.color }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Avg Order Value</span>
                  <span className="text-sm font-semibold text-foreground">฿{platform.avgOrderValue}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(platform.avgOrderValue / 400) * 100}%`, backgroundColor: platform.color }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Target Customer Behaviors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-day-patterns">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(185,50%,92%) 0%, hsl(195,45%,85%) 100%)" }}>
              <Sun className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Day-of-Week Patterns</h3>
              <p className="text-xs text-muted-foreground/40">Activity distribution across the week</p>
            </div>
          </div>
          <div className="flex items-end gap-2 h-32">
            {DAY_PATTERNS.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" data-testid={`day-bar-${d.day.toLowerCase()}`}>
                <span className="text-[10px] font-semibold text-foreground">{d.value}%</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(d.value / maxDayValue) * 100}%`,
                    background: d.day === "Sat" || d.day === "Fri"
                      ? "linear-gradient(180deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))"
                      : "linear-gradient(180deg, hsl(222, 47%, 70%), hsl(222, 47%, 85%))",
                  }}
                />
                <span className="text-[10px] text-muted-foreground font-medium">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-border">
            <div className="flex items-center gap-1.5">
              <Moon className="w-3 h-3" style={{ color: "hsl(222, 47%, 35%)" }} />
              <span className="text-[10px] text-muted-foreground">Peak hours: 12pm-1pm, 6pm-8pm</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-meal-categories">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(270,50%,92%) 0%, hsl(260,45%,85%) 100%)" }}>
              <Utensils className="w-4 h-4" style={{ color: "hsl(222, 47%, 35%)" }} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Menu Category by Meal Time</h3>
              <p className="text-xs text-muted-foreground/40">Cuisine popularity across meal periods</p>
            </div>
          </div>
          <div className="space-y-3">
            {MEAL_CATEGORIES.map((meal) => (
              <div key={meal.meal} className="space-y-1" data-testid={`meal-bar-${meal.meal.toLowerCase().replace(/\s/g, "-")}`}>
                <span className="text-xs font-medium text-foreground">{meal.meal}</span>
                <div className="flex h-5 rounded-md overflow-hidden">
                  <div className="h-full" style={{ width: `${meal.thai}%`, backgroundColor: "hsl(222, 47%, 30%)" }} title={`Thai ${meal.thai}%`} />
                  <div className="h-full" style={{ width: `${meal.japanese}%`, backgroundColor: "hsl(195, 80%, 45%)" }} title={`Japanese ${meal.japanese}%`} />
                  <div className="h-full" style={{ width: `${meal.korean}%`, backgroundColor: "hsl(45, 100%, 50%)" }} title={`Korean ${meal.korean}%`} />
                  <div className="h-full" style={{ width: `${meal.italian}%`, backgroundColor: "hsl(142, 71%, 45%)" }} title={`Italian ${meal.italian}%`} />
                  <div className="h-full" style={{ width: `${meal.other}%`, backgroundColor: "hsl(222, 47%, 80%)" }} title={`Other ${meal.other}%`} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-border">
            {[
              { label: "Thai", color: "hsl(222, 47%, 30%)" },
              { label: "Japanese", color: "hsl(195, 80%, 45%)" },
              { label: "Korean", color: "hsl(45, 100%, 50%)" },
              { label: "Italian", color: "hsl(142, 71%, 45%)" },
              { label: "Other", color: "hsl(222, 47%, 80%)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partner Data Export */}
      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-partner-export">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(35,80%,92%) 0%, hsl(40,70%,85%) 100%)" }}>
            <Download className="w-4 h-4 text-[#FFCC02]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Partner Data Export</h3>
            <p className="text-xs text-muted-foreground/40">Data packages for Grab, LINE MAN, mall partners</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DATA_PACKAGES.map((pkg) => (
            <div key={pkg.name} className="bg-gray-50 dark:bg-muted border border-gray-100 dark:border-border rounded-xl p-4 flex flex-col gap-3" data-testid={`export-pkg-${pkg.name.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="flex items-center gap-2">
                <pkg.icon className="w-4 h-4 text-[#FFCC02]" />
                <span className="text-sm font-medium text-foreground">{pkg.name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground flex-1">{pkg.desc}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                data-testid={`button-export-${pkg.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                <Download className="w-3 h-3 mr-1.5" />
                Export CSV
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* === Existing Sections Below === */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-event-breakdown">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(200,50%,92%) 0%, hsl(210,45%,85%) 100%)" }}>
              <BarChart3 className="w-4 h-4" style={{ color: "hsl(222, 47%, 35%)" }} />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">Event Breakdown</h3>
          </div>
          {loadingSummary ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : Object.keys(eventBreakdown).length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-events-breakdown">
              No events recorded yet
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(eventBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="space-y-1.5" data-testid={`event-bar-${type}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        {eventDot(type)}
                        {type}
                      </span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(count / maxEventCount) * 100}%`, background: "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))" }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-conversion-funnel">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(185,50%,92%) 0%, hsl(195,45%,85%) 100%)" }}>
              <Target className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Conversion Funnel</h3>
              <p className="text-xs text-muted-foreground/40">Swipe to order journey</p>
            </div>
          </div>
          <div className="space-y-2">
            {CONVERSION_FUNNEL.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-3" data-testid={`funnel-step-${idx}`}>
                <div className="w-16 text-right">
                  <span className="text-xs font-medium text-muted-foreground">{step.pct}%</span>
                </div>
                <div className="flex-1 h-8 rounded-lg bg-gray-50 dark:bg-muted overflow-hidden relative">
                  <div
                    className="h-full rounded-lg flex items-center px-3 transition-all"
                    style={{ width: `${Math.max(step.pct, 8)}%`, backgroundColor: step.color }}
                  >
                    {step.pct > 20 && (
                      <span className={`text-[10px] font-medium whitespace-nowrap ${idx >= 4 ? "text-white" : "text-foreground"}`}>{step.value.toLocaleString()}</span>
                    )}
                  </div>
                  {step.pct <= 20 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">{step.value.toLocaleString()}</span>
                  )}
                </div>
                <span className="w-24 text-xs text-foreground font-medium">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-trending-cuisines">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(270,50%,92%) 0%, hsl(260,45%,85%) 100%)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "hsl(222, 47%, 35%)" }} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Trending Cuisines</h3>
              <p className="text-xs text-muted-foreground/40">Growth in last 30 days</p>
            </div>
          </div>
          <div className="space-y-3">
            {TRENDING_CUISINES.map((cuisine) => (
              <div key={cuisine.name} className="flex items-center gap-3" data-testid={`trending-${cuisine.name.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="w-3 h-3 rounded-full bg-foreground flex-shrink-0" />
                <span className="flex-1 text-sm text-foreground font-medium">{cuisine.name}</span>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  <span className="text-sm font-semibold text-green-500">+{cuisine.growth}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-geo-hotspots">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(35,80%,92%) 0%, hsl(40,70%,85%) 100%)" }}>
              <MapPin className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Geographic Hotspots</h3>
              <p className="text-xs text-muted-foreground/40">Top order zones in Bangkok</p>
            </div>
          </div>
          <div className="space-y-2">
            {GEO_HOTSPOTS.map((spot) => (
              <div key={spot.zone} className="flex items-center gap-3 py-1.5" data-testid={`geo-spot-${spot.rank}`}>
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${spot.rank === 1 ? "bg-[#FFCC02] text-foreground" : "bg-gray-100 dark:bg-muted text-muted-foreground"}`}>
                  {spot.rank}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">{spot.zone}</span>
                <span className="text-xs text-muted-foreground font-medium">{spot.orders.toLocaleString()}</span>
                <span className="text-xs text-green-500 font-semibold">{spot.growth}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-user-segments">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(200,50%,92%) 0%, hsl(210,45%,85%) 100%)" }}>
              <Users className="w-4 h-4" style={{ color: "hsl(222, 47%, 35%)" }} />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">User Segments</h3>
          </div>
          {loadingSegments ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="space-y-2"
                  data-testid={`segment-card-${segment.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{segment.name}</span>
                    <span className="bg-gray-100 dark:bg-muted text-muted-foreground text-xs rounded-full px-3 py-0.5 font-medium">
                      {segment.estimatedCount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{segment.description}</p>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(segment.estimatedCount / maxSegmentCount) * 100}%`,
                        background: "linear-gradient(90deg, hsl(222, 47%, 20%), hsl(222, 47%, 35%))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-top-restaurants">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(35,80%,92%) 0%, hsl(40,70%,85%) 100%)" }}>
              <Star className="w-4 h-4 text-[#FFCC02]" />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">Top Restaurants</h3>
          </div>
          {loadingTop ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : topRestaurants.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-top">
              No data available
            </p>
          ) : (
            <div className="space-y-2">
              {topRestaurants.map((r, idx) => (
                <div
                  key={r.restaurantId}
                  className="flex items-center gap-3 text-sm py-1.5"
                  data-testid={`top-restaurant-${r.restaurantId}`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${idx === 0 ? "bg-[#FFCC02] text-foreground" : "bg-gray-100 dark:bg-muted text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate text-foreground font-medium">{r.name}</span>
                  <span className="bg-gray-100 dark:bg-muted text-foreground text-xs rounded-full px-3 py-0.5 font-medium">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4" data-testid="card-recent-events">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-muted flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(185,50%,92%) 0%, hsl(195,45%,85%) 100%)" }}>
                <Clock className="w-4 h-4 text-cyan-500" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">Recent Events</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500 font-medium">Live</span>
            </div>
          </div>
          {loadingEvents ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-events">
              No events recorded
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-0">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 gap-y-0 text-xs">
                <span className="font-bold text-muted-foreground/60 uppercase tracking-widest text-[10px] pb-2">Type</span>
                <span className="font-bold text-muted-foreground/60 uppercase tracking-widest text-[10px] pb-2">User</span>
                <span className="font-bold text-muted-foreground/60 uppercase tracking-widest text-[10px] pb-2">Restaurant</span>
                <span className="font-bold text-muted-foreground/60 uppercase tracking-widest text-[10px] pb-2">Time</span>
                {events.slice(0, 50).map((event) => (
                  <>
                    <span
                      key={`type-${event.id}`}
                      className="flex items-center gap-1.5 py-2 border-b border-gray-100 dark:border-border text-foreground"
                      data-testid={`event-type-${event.id}`}
                    >
                      {eventDot(event.eventType)}
                      {event.eventType}
                    </span>
                    <span
                      key={`user-${event.id}`}
                      className="truncate text-muted-foreground py-2 border-b border-gray-100 dark:border-border"
                      data-testid={`event-user-${event.id}`}
                    >
                      {event.userId || "-"}
                    </span>
                    <span
                      key={`rest-${event.id}`}
                      className="text-muted-foreground py-2 border-b border-gray-100 dark:border-border"
                      data-testid={`event-restaurant-${event.id}`}
                    >
                      {event.restaurantId ?? "-"}
                    </span>
                    <span
                      key={`time-${event.id}`}
                      className="text-muted-foreground whitespace-nowrap py-2 border-b border-gray-100 dark:border-border"
                      data-testid={`event-time-${event.id}`}
                    >
                      {relativeTime(event.timestamp)}
                    </span>
                  </>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden" data-testid="card-data-catalog">
        <button
          onClick={() => setShowCatalog(!showCatalog)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-muted transition-colors"
          data-testid="button-toggle-catalog"
        >
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-blue-500" />
            <div className="text-left">
              <h3 className="text-[15px] font-semibold text-foreground">Data Insights Catalog</h3>
              <p className="text-xs text-muted-foreground/40">Actionable analytics for partners & restaurant owners</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCatalog ? "rotate-180" : ""}`} />
        </button>
        {showCatalog && (
          <div className="px-6 pb-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="insights-catalog">
              {DATA_INSIGHTS_CATALOG.map((cat) => (
                <div
                  key={cat.category}
                  className="rounded-xl border border-gray-100 dark:border-border overflow-hidden bg-white dark:bg-card"
                  data-testid={`insight-card-${cat.category.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <div className="px-4 py-3 flex items-center gap-2.5" style={{ background: cat.headerGradient }}>
                    <div className="w-7 h-7 rounded-lg bg-white/60 dark:bg-white/20 flex items-center justify-center">
                      <cat.icon className="w-3.5 h-3.5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{cat.category}</h4>
                      <p className="text-[9px] text-muted-foreground/60">{cat.insights.length} insights</p>
                    </div>
                  </div>
                  <div className="p-3 space-y-0">
                    {cat.insights.map((insight, idx) => (
                      <div
                        key={insight.name}
                        className={`flex items-start gap-2.5 py-2.5 ${idx < cat.insights.length - 1 ? "border-b border-gray-100 dark:border-border" : ""}`}
                      >
                        <div className="w-5 h-5 rounded-md bg-gray-100 dark:bg-muted text-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[9px] font-bold">{idx + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{insight.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{insight.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserKpiCard({ icon, label, value, sub, gradient }: { icon: React.ReactNode; label: string; value: string; sub?: string; gradient: string }) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-border p-4" data-testid={`user-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: gradient }}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-xl font-bold tracking-tight text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
