import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, Utensils, MousePointer, Target, Activity, TrendingUp, MapPin, Clock } from "lucide-react";

type DateRange = "7d" | "30d" | "all";

type SummaryData = {
  totalUsers: number;
  totalRestaurants: number;
  totalSwipes: number;
  activeCampaigns: number;
  totalEvents: number;
  eventBreakdown: Record<string, number>;
};

type Segment = {
  id: string;
  name: string;
  description: string;
  estimatedCount: number;
};

type TopRestaurant = {
  restaurantId: number;
  name: string;
  count: number;
};

type AnalyticsEvent = {
  id: number;
  eventType: string;
  userId: string | null;
  restaurantId: number | null;
  timestamp: string;
};

type DashboardDetails = {
  conversionFunnel: Array<{ label: string; value: number; pct: number; color: string }>;
  geoHotspots: Array<{ zone: string; abbr: string; orders: number; growth: string }>;
  trendingCuisines: Array<{ name: string; growth: number; max: number; color: string }>;
  topRestaurants: Array<{ name: string; swipes: number; conversion: number; trend: string }>;
  deliveryAttribution: Array<{ name: string; clicks: number; pct: number; color: string; avgOrder: string }>;
  deliveryClicks: number;
};

type DataQuality = {
  windowDays: number;
  totalEvents: number;
  issues: Record<string, number>;
  issueRatesPct: Record<string, number>;
};

type DerivedAnalytics = {
  windowDays: number;
  totals: { events: number; users: number; items: number };
  funnel: { views: number; swipes: number; favorites: number; orderIntent: number };
  retention: { cohortSize: number; d1RatePct: number; d7RatePct: number };
  dailyEvents: Array<{ day: string; count: number }>;
};

type RecommendationFeatures = {
  totals: { userSnapshots: number; itemSnapshots: number };
  freshnessHours: {
    avgUser: number;
    avgItem: number;
    staleUserOver72h: number;
    staleItemOver72h: number;
  };
  userSamples: Array<{
    userId: string;
    preferredPriceLevel: number | null;
    activeHours: number[];
    topCuisineAffinity: Array<[string, number]>;
    dislikedCount: number;
    updatedAt: string;
  }>;
};

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

function eventDot(type: string) {
  if (type === "swipe_right") return "bg-emerald-400";
  if (type === "swipe_left") return "bg-rose-400";
  if (type === "view_detail") return "bg-blue-400";
  return "bg-muted-foreground/40";
}

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");

  const sinceParam = useMemo(() => {
    if (dateRange === "7d") return new Date(Date.now() - 7 * 86400000).toISOString();
    if (dateRange === "30d") return new Date(Date.now() - 30 * 86400000).toISOString();
    return "";
  }, [dateRange]);

  const eventsUrl = sinceParam
    ? `/api/analytics/events?since=${encodeURIComponent(sinceParam)}`
    : "/api/analytics/events";

  const { data: summary, isLoading: loadingSummary } = useQuery<SummaryData>({ queryKey: ["/api/analytics/summary"] });
  const { data: details, isLoading: loadingDetails } = useQuery<DashboardDetails>({ queryKey: ["/api/admin/dashboard/details"] });
  const { data: segments = [], isLoading: loadingSegments } = useQuery<Segment[]>({ queryKey: ["/api/analytics/user-segments"] });
  const { data: topRestaurants = [], isLoading: loadingTop } = useQuery<TopRestaurant[]>({ queryKey: ["/api/analytics/top-restaurants"] });
  const { data: events = [], isLoading: loadingEvents } = useQuery<AnalyticsEvent[]>({ queryKey: [eventsUrl] });
  const { data: quality, isLoading: loadingQuality } = useQuery<DataQuality>({ queryKey: ["/api/admin/analytics/data-quality?days=7"] });
  const { data: derived, isLoading: loadingDerived } = useQuery<DerivedAnalytics>({ queryKey: ["/api/admin/analytics/derived?days=30"] });
  const { data: recFeatures, isLoading: loadingRecFeatures } = useQuery<RecommendationFeatures>({ queryKey: ["/api/admin/recommendations/features"] });

  const eventBreakdown = summary?.eventBreakdown ?? {};
  const maxEventCount = Math.max(1, ...Object.values(eventBreakdown));
  const maxDailyEvents = Math.max(1, ...(derived?.dailyEvents?.map((d) => d.count) ?? [1]));

  return (
    <div data-testid="admin-analytics-page" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-teal-500" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Data Intelligence</h2>
            <p className="text-xs text-muted-foreground">Real-time analytics from API</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-muted rounded-xl p-1">
          {([ ["7d", "7 days"], ["30d", "30 days"], ["all", "All time"] ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setDateRange(key)} className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all ${dateRange === key ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Users", value: summary?.totalUsers ?? 0, icon: Users },
          { label: "Restaurants", value: summary?.totalRestaurants ?? 0, icon: Utensils },
          { label: "Swipes", value: summary?.totalSwipes ?? 0, icon: MousePointer },
          { label: "Active Campaigns", value: summary?.activeCampaigns ?? 0, icon: Target },
          { label: "Total Events", value: summary?.totalEvents ?? 0, icon: Activity },
          { label: "Delivery Clicks", value: details?.deliveryClicks ?? 0, icon: TrendingUp },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{kpi.label}</span>
            </div>
            {loadingSummary && kpi.label !== "Delivery Clicks" ? (
              <Skeleton className="h-7 w-16" />
            ) : loadingDetails && kpi.label === "Delivery Clicks" ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value.toLocaleString()}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Data Quality (7d)</h3>
          {loadingQuality ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">Total Events</span><span className="font-semibold text-foreground">{quality?.totalEvents?.toLocaleString() ?? 0}</span></div>
              {Object.entries(quality?.issueRatesPct ?? {}).slice(0, 6).map(([name, pct]) => (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Derived Metrics (30d)</h3>
          {loadingDerived ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">Events</span><span className="font-semibold text-foreground">{derived?.totals.events?.toLocaleString() ?? 0}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">Users</span><span className="font-semibold text-foreground">{derived?.totals.users?.toLocaleString() ?? 0}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">D1 Retention</span><span className="font-semibold text-foreground">{derived?.retention.d1RatePct ?? 0}%</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">D7 Retention</span><span className="font-semibold text-foreground">{derived?.retention.d7RatePct ?? 0}%</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Funnel (views/swipes/favs/orders)</span><span className="text-foreground">{`${derived?.funnel.views ?? 0}/${derived?.funnel.swipes ?? 0}/${derived?.funnel.favorites ?? 0}/${derived?.funnel.orderIntent ?? 0}`}</span></div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Daily events trend</p>
                <div className="h-12 flex items-end gap-1">
                  {(derived?.dailyEvents ?? []).slice(-14).map((d) => (
                    <div key={d.day} className="flex-1 bg-gray-100 dark:bg-muted rounded-sm overflow-hidden" title={`${d.day}: ${d.count}`}>
                      <div className="w-full bg-foreground/80 rounded-sm" style={{ height: `${Math.max(8, Math.round((d.count / maxDailyEvents) * 100))}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Recommendation Features</h3>
          {loadingRecFeatures ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">User Snapshots</span><span className="font-semibold text-foreground">{recFeatures?.totals.userSnapshots?.toLocaleString() ?? 0}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">Item Snapshots</span><span className="font-semibold text-foreground">{recFeatures?.totals.itemSnapshots?.toLocaleString() ?? 0}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">Avg User Freshness (h)</span><span className="font-semibold text-foreground">{recFeatures?.freshnessHours.avgUser ?? 0}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-foreground">Avg Item Freshness (h)</span><span className="font-semibold text-foreground">{recFeatures?.freshnessHours.avgItem ?? 0}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Stale User {'>'}72h</span><span className="text-foreground">{recFeatures?.freshnessHours.staleUserOver72h ?? 0}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Stale Item {'>'}72h</span><span className="text-foreground">{recFeatures?.freshnessHours.staleItemOver72h ?? 0}</span></div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Sample user affinity signals</p>
                <div className="space-y-1">
                  {(recFeatures?.userSamples ?? []).slice(0, 3).map((sample) => (
                    <div key={sample.userId} className="text-xs text-muted-foreground truncate">
                      {sample.userId}: {(sample.topCuisineAffinity[0]?.[0] ?? "none")} ({sample.topCuisineAffinity[0]?.[1] ?? 0})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Event Breakdown</h3>
          {loadingSummary ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-3">
              {Object.entries(eventBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{type}</span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${(count / maxEventCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Conversion Funnel</h3>
          {loadingDetails ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              {(details?.conversionFunnel ?? []).map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-muted-foreground">{step.label}</span>
                  <div className="flex-1 h-7 rounded-lg bg-gray-100 dark:bg-muted overflow-hidden relative">
                    <div className="h-full" style={{ width: `${Math.max(step.pct, 8)}%`, backgroundColor: step.color }} />
                  </div>
                  <span className="text-xs font-medium text-foreground w-14 text-right">{step.value}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Geographic Hotspots</h3>
          {loadingDetails ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              {(details?.geoHotspots ?? []).map((spot) => (
                <div key={spot.zone} className="flex items-center justify-between text-sm">
                  <span className="text-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{spot.zone}</span>
                  <span className="text-muted-foreground">{spot.orders.toLocaleString()} ({spot.growth})</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Trending Cuisines</h3>
          {loadingDetails ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              {(details?.trendingCuisines ?? []).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.name}</span>
                  <span className="text-green-600">+{item.growth}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">User Segments</h3>
          {loadingSegments ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              {segments.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.name}</span>
                  <span className="text-muted-foreground">{s.estimatedCount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Top Restaurants</h3>
          {loadingTop ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              {topRestaurants.map((r) => (
                <div key={r.restaurantId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{r.name}</span>
                  <span className="text-muted-foreground">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-2 bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">Recent Events</h3>
          {loadingEvents ? <Skeleton className="h-32 w-full" /> : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {events.slice(0, 50).map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-4 text-sm border-b border-gray-100 dark:border-border py-2">
                  <span className="flex items-center gap-2 min-w-[150px]">
                    <span className={`w-2 h-2 rounded-full ${eventDot(event.eventType)}`} />
                    <span className="text-foreground">{event.eventType}</span>
                  </span>
                  <span className="text-muted-foreground truncate flex-1">{event.userId || "-"}</span>
                  <span className="text-muted-foreground w-20 text-right">{event.restaurantId ?? "-"}</span>
                  <span className="text-muted-foreground w-24 text-right flex items-center justify-end gap-1"><Clock className="w-3.5 h-3.5" />{relativeTime(event.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
