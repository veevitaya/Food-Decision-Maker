import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  UserCircle,
  Calendar,
  Clock,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Star,
  ShieldCheck,
  ShieldOff,
  Utensils,
  Hash,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  profile: {
    id: number;
    lineUserId: string;
    displayName: string;
    pictureUrl?: string;
    dietaryRestrictions: string[];
    cuisinePreferences: string[];
    defaultBudget: number;
    gender?: string;
    ageGroup?: string;
    partnerLineUserId?: string;
  };
  consent: {
    granted: boolean;
    version: string;
    grantedAt: string;
  } | null;
  summary: {
    totalEvents: number;
    firstSeen: string | null;
    lastSeen: string | null;
    totalSessions: number;
    avgSessionMinutes: number;
    swipeRight: number;
    swipeLeft: number;
    swipeTotal: number;
    likeRate: number;
    favoriteCategory: string | null;
    eventsByType: Record<string, number>;
    topRestaurants: { id: number; name: string; count: number }[];
    activityLast30Days: { date: string; count: number }[];
  };
  recentEvents: {
    id: number;
    eventType: string;
    itemId: number | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }[];
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  swipe: "bg-blue-50 text-blue-700",
  view_card: "bg-gray-100 text-gray-600",
  favorite: "bg-pink-50 text-pink-700",
  share: "bg-green-50 text-green-700",
  click: "bg-amber-50 text-amber-700",
  session_start: "bg-purple-50 text-purple-700",
};

function ActivityBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-0.5">
      <div className="w-full flex items-end justify-center" style={{ height: 40 }}>
        <div
          className="w-full rounded-sm bg-[var(--admin-blue)] opacity-80 transition-all"
          style={{ height: `${pct}%`, minHeight: value > 0 ? 2 : 0 }}
        />
      </div>
    </div>
  );
}

export default function AdminUserDetail() {
  const params = useParams<{ lineUserId: string }>();
  const [, navigate] = useLocation();
  const lineUserId = params.lineUserId;

  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: [`/api/admin/users/${lineUserId}/analytics`],
    enabled: !!lineUserId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
        <UserCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm">Could not load user analytics.</p>
        <button onClick={() => navigate("/admin/users")} className="text-xs underline">Back to Users</button>
      </div>
    );
  }

  const { profile, consent, summary, recentEvents } = data;
  const maxActivity = Math.max(...summary.activityLast30Days.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate("/admin/users")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="btn-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Users
        </button>
        <div className="flex items-center gap-3 flex-1">
          {profile.pictureUrl ? (
            <img src={profile.pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div>
            <h1 className="text-[15px] font-semibold text-gray-800">{profile.displayName}</h1>
            <p className="text-[10px] font-mono text-gray-400">{profile.lineUserId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {consent?.granted ? (
            <Badge className="bg-emerald-50 text-emerald-700 gap-1.5">
              <ShieldCheck className="w-3 h-3" /> Tracking Consent
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-red-50 text-red-600 gap-1.5">
              <ShieldOff className="w-3 h-3" /> No Consent
            </Badge>
          )}
          {profile.partnerLineUserId && (
            <Badge variant="secondary" className="bg-purple-50 text-purple-700">Paired</Badge>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="section-user-kpis">
        {[
          { label: "Total Events", value: summary.totalEvents, icon: Activity, color: "text-blue-600 bg-blue-50" },
          { label: "Sessions", value: summary.totalSessions, icon: Hash, color: "text-purple-600 bg-purple-50" },
          { label: "Avg Session", value: `${summary.avgSessionMinutes}m`, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { label: "Like Rate", value: `${summary.likeRate}%`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
        ].map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-4" data-testid={`card-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-gray-800">{kpi.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 p-5" data-testid="section-activity-chart">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Activity — Last 30 Days</p>
          <div className="flex items-end gap-0.5 h-10">
            {summary.activityLast30Days.map(d => (
              <ActivityBar key={d.date} value={d.count} max={maxActivity} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-gray-300">{summary.activityLast30Days[0]?.date}</span>
            <span className="text-[10px] text-gray-300">{summary.activityLast30Days[29]?.date}</span>
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-800">{summary.swipeRight}</span>
              <span className="text-xs text-gray-400">likes</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-gray-800">{summary.swipeLeft}</span>
              <span className="text-xs text-gray-400">passes</span>
            </div>
            {summary.favoriteCategory && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-600">{summary.favoriteCategory}</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {summary.firstSeen ? `Since ${new Date(summary.firstSeen).toLocaleDateString()}` : "No data"}
            </div>
          </div>
        </Card>

        {/* Profile Info */}
        <Card className="p-5 space-y-4" data-testid="section-profile">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Profile</p>
          <div className="space-y-3 text-sm">
            {profile.gender && (
              <div className="flex justify-between">
                <span className="text-gray-400">Gender</span>
                <span className="text-gray-700 capitalize">{profile.gender}</span>
              </div>
            )}
            {profile.ageGroup && (
              <div className="flex justify-between">
                <span className="text-gray-400">Age Group</span>
                <span className="text-gray-700">{profile.ageGroup}</span>
              </div>
            )}
            {profile.defaultBudget > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Budget</span>
                <span className="text-gray-700">฿{profile.defaultBudget.toLocaleString()}</span>
              </div>
            )}
            {summary.lastSeen && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Seen</span>
                <span className="text-gray-700">{new Date(summary.lastSeen).toLocaleDateString()}</span>
              </div>
            )}
            {consent && (
              <div className="flex justify-between">
                <span className="text-gray-400">Consent</span>
                <span className="text-gray-500 text-xs">{consent.version}</span>
              </div>
            )}
          </div>
          {(profile.cuisinePreferences || []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Cuisine Preferences</p>
              <div className="flex flex-wrap gap-1">
                {profile.cuisinePreferences.map(p => (
                  <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                ))}
              </div>
            </div>
          )}
          {(profile.dietaryRestrictions || []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Dietary</p>
              <div className="flex flex-wrap gap-1">
                {profile.dietaryRestrictions.map(r => (
                  <Badge key={r} variant="secondary" className="text-[10px] bg-red-50 text-red-600">{r}</Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Type Breakdown */}
        <Card className="p-5" data-testid="section-event-types">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Events by Type</p>
          <div className="space-y-2">
            {Object.entries(summary.eventsByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const pct = summary.totalEvents > 0 ? Math.round((count / summary.totalEvents) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <Badge variant="secondary" className={`text-[10px] w-28 justify-center flex-shrink-0 ${EVENT_TYPE_COLORS[type] ?? "bg-gray-100 text-gray-500"}`}>
                      {type}
                    </Badge>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--admin-blue)] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            {Object.keys(summary.eventsByType).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No events recorded</p>
            )}
          </div>
        </Card>

        {/* Top Restaurants */}
        <Card className="p-5" data-testid="section-top-restaurants">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Top Restaurants</p>
          <div className="space-y-2">
            {summary.topRestaurants.slice(0, 8).map((r, i) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-gray-300 w-4 flex-shrink-0">{i + 1}</span>
                <Utensils className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">{r.name}</span>
                <Badge variant="outline" className="text-[10px]">{r.count}×</Badge>
              </div>
            ))}
            {summary.topRestaurants.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No restaurant interactions</p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Events */}
      <Card className="p-0 overflow-hidden" data-testid="section-recent-events">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Recent Events</p>
          <span className="text-[10px] text-gray-300">Last {recentEvents.length} events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Item</th>
                <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Metadata</th>
                <th className="text-right py-2.5 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No events recorded</td>
                </tr>
              ) : (
                recentEvents.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <Badge variant="secondary" className={`text-[10px] ${EVENT_TYPE_COLORS[e.eventType] ?? "bg-gray-100 text-gray-500"}`}>
                        {e.eventType}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500">{e.itemId ?? "—"}</td>
                    <td className="py-2.5 px-4 text-gray-400 max-w-[280px] truncate font-mono">
                      {e.metadata ? JSON.stringify(e.metadata).slice(0, 80) : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-400">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
