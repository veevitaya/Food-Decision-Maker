import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Clock, ChevronRight, Activity, Heart, Flame, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

type UserProfile = {
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  dietaryRestrictions: string[] | null;
  cuisinePreferences: string[] | null;
  defaultBudget: number | null;
  defaultDistance: number | null;
  createdAt: string | null;
};

type AnalyticsEvent = {
  id: number;
  eventType: string;
  userId: string | null;
  restaurantId: number | null;
  timestamp: string;
  metadata?: Record<string, unknown> | string | null;
};

const BUDGET_LABELS: Record<number, string> = { 1: "฿", 2: "฿฿", 3: "฿฿฿", 4: "฿฿฿฿" };

function relativeTime(ts: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function eventDot(type: string) {
  if (type === "swipe_right" || type === "swipe") return "bg-emerald-400";
  if (type === "swipe_left") return "bg-rose-400";
  if (type === "favorite") return "bg-pink-400";
  if (type === "view_detail" || type === "view_card") return "bg-blue-400";
  if (type === "order_click" || type === "booking_click") return "bg-amber-400";
  return "bg-muted-foreground/30";
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    swipe_right: "Liked",
    swipe_left: "Skipped",
    swipe: "Swiped",
    favorite: "Saved",
    view_card: "Viewed card",
    view_detail: "Opened detail",
    order_click: "Clicked order",
    booking_click: "Clicked booking",
    search: "Searched",
    filter: "Filtered",
    session_join: "Joined session",
    session_result_click_map: "Clicked map result",
    dismiss: "Dismissed",
  };
  return labels[type] ?? type;
}

function UserAvatar({ user, size = "md" }: { user: UserProfile; size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
  if (user.pictureUrl) {
    return <img src={user.pictureUrl} alt={user.displayName ?? ""} className={`${dim} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 flex-shrink-0`}>
      {(user.displayName ?? user.lineUserId).charAt(0).toUpperCase()}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-xl px-4 py-3 min-w-[80px]">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

function UserDetail({ user, events, onClose }: { user: UserProfile; events: AnalyticsEvent[]; onClose: () => void }) {
  const userEvents = useMemo(
    () => events.filter((e) => e.userId === user.lineUserId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [events, user.lineUserId]
  );

  const stats = useMemo(() => ({
    total: userEvents.length,
    likes: userEvents.filter((e) => e.eventType === "swipe_right" || e.eventType === "favorite").length,
    swipes: userEvents.filter((e) => e.eventType === "swipe" || e.eventType === "swipe_right" || e.eventType === "swipe_left").length,
    orders: userEvents.filter((e) => e.eventType === "order_click" || e.eventType === "booking_click").length,
  }), [userEvents]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="lg" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">{user.displayName ?? "—"}</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{user.lineUserId}</p>
            {user.createdAt && (
              <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        {/* Stats */}
        <div className="flex gap-3 flex-wrap">
          <StatPill label="Events" value={stats.total} color="text-foreground" />
          <StatPill label="Likes" value={stats.likes} color="text-pink-500" />
          <StatPill label="Swipes" value={stats.swipes} color="text-emerald-500" />
          <StatPill label="Order taps" value={stats.orders} color="text-amber-500" />
        </div>

        {/* Preferences */}
        {((user.cuisinePreferences?.length ?? 0) > 0 || (user.dietaryRestrictions?.length ?? 0) > 0) && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {(user.cuisinePreferences?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cuisine Preferences</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.cuisinePreferences!.map((c) => (
                    <span key={c} className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-foreground">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {(user.dietaryRestrictions?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Dietary</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.dietaryRestrictions!.map((d) => (
                    <span key={d} className="text-xs bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 text-amber-700">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Budget & Distance */}
        {(user.defaultBudget || user.defaultDistance) && (
          <div className="flex gap-3">
            {user.defaultBudget && (
              <div className="flex-1 bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {BUDGET_LABELS[user.defaultBudget] ?? `฿${user.defaultBudget}`}
                </p>
              </div>
            )}
            {user.defaultDistance && (
              <div className="flex-1 bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Distance</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">
                  {String(user.defaultDistance).replace(/\s*km$/i, "")} km
                </p>
              </div>
            )}
          </div>
        )}

        {/* Event Timeline */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Activity</p>
          {userEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No events recorded</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {userEvents.slice(0, 50).map((event) => (
                <div key={event.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${eventDot(event.eventType)}`} />
                  <span className="flex-1 text-foreground">{eventLabel(event.eventType)}</span>
                  {event.restaurantId && (
                    <span className="text-muted-foreground text-xs">#{event.restaurantId}</span>
                  )}
                  <span className="text-muted-foreground text-xs flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminCustomerAnalytics() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserProfile | null>(null);

  const { data: users = [], isLoading: loadingUsers } = useQuery<UserProfile[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: eventsRaw = [], isLoading: loadingEvents } = useQuery<any[]>({
    queryKey: ["/api/analytics/events"],
  });

  // Normalise field names — API returns `createdAt` from event_logs, aliased to `timestamp` in buildAnalyticsEvents
  const events: AnalyticsEvent[] = eventsRaw.map((e) => ({
    id: e.id,
    eventType: e.eventType ?? e.event_type ?? "",
    userId: e.userId ?? e.user_id ?? null,
    restaurantId: e.restaurantId ?? e.item_id ?? e.itemId ?? null,
    timestamp: e.timestamp ?? e.createdAt ?? e.created_at ?? "",
    metadata: e.metadata ?? null,
  }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.displayName ?? "").toLowerCase().includes(q) ||
        u.lineUserId.toLowerCase().includes(q)
    );
  }, [users, search]);

  // Build per-user event count map
  const eventCountByUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) {
      if (e.userId) map[e.userId] = (map[e.userId] ?? 0) + 1;
    }
    return map;
  }, [events]);

  const sortedFiltered = useMemo(
    () => [...filtered].sort((a, b) => (eventCountByUser[b.lineUserId] ?? 0) - (eventCountByUser[a.lineUserId] ?? 0)),
    [filtered, eventCountByUser]
  );

  return (
    <div data-testid="admin-customer-analytics-page" className="h-full flex gap-6">
      {/* Left: user list */}
      <div className="flex flex-col w-80 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-violet-500" />
          <h2 className="text-[15px] font-semibold text-foreground">Customers</h2>
          <span className="ml-auto text-xs text-muted-foreground">{users.length} total</span>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {loadingUsers
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))
            : sortedFiltered.map((user) => {
                const eventCount = eventCountByUser[user.lineUserId] ?? 0;
                const isSelected = selected?.lineUserId === user.lineUserId;
                return (
                  <button
                    key={user.lineUserId}
                    onClick={() => setSelected(isSelected ? null : user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-violet-50 border border-violet-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <UserAvatar user={user} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.displayName ?? <span className="text-muted-foreground italic">No name</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{user.lineUserId}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {eventCount > 0 && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-gray-100 rounded-full px-1.5 py-0.5">
                          {eventCount}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "text-violet-500 rotate-90" : "text-muted-foreground/30"}`} />
                    </div>
                  </button>
                );
              })}
          {!loadingUsers && sortedFiltered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No customers found</p>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {selected ? (
          <UserDetail
            user={selected}
            events={events}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Activity className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Select a customer</p>
              <p className="text-sm text-muted-foreground">Click any customer on the left to see their profile, preferences, and activity timeline.</p>
            </div>
            {!loadingEvents && (
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  {events.filter((e) => e.eventType === "swipe_right").length} likes
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Heart className="w-4 h-4 text-pink-400" />
                  {events.filter((e) => e.eventType === "favorite").length} saves
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
