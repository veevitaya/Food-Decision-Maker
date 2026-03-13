import { useState } from "react";
import { getAdminSession } from "./AdminLayout";
import {
  Bell,
  Star,
  MessageSquare,
  TrendingUp,
  Megaphone,
  ShieldCheck,
  Check,
  CheckCheck,
} from "lucide-react";

interface Notification {
  id: number;
  type: "review" | "campaign" | "milestone" | "verification" | "tip";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: "review",
    title: "New Review",
    message: "Sarah M. left a 4-star review: \"Great food and atmosphere...\"",
    time: "2 hours ago",
    read: false,
  },
  {
    id: 2,
    type: "campaign",
    title: "Campaign Update",
    message: "Your \"20% Off All Mains\" promotion reached 3,000 impressions!",
    time: "5 hours ago",
    read: false,
  },
  {
    id: 3,
    type: "milestone",
    title: "Milestone Reached",
    message: "Your restaurant has been saved by 100 users this month!",
    time: "1 day ago",
    read: false,
  },
  {
    id: 4,
    type: "tip",
    title: "Performance Tip",
    message: "Add more photos to your listing — restaurants with 5+ photos get 40% more views.",
    time: "2 days ago",
    read: true,
  },
  {
    id: 5,
    type: "verification",
    title: "Verification Reminder",
    message: "Complete your business verification to unlock premium features and the Verified badge.",
    time: "3 days ago",
    read: true,
  },
  {
    id: 6,
    type: "review",
    title: "Review Reply Needed",
    message: "You have 2 reviews waiting for your response. Responding builds trust with customers.",
    time: "4 days ago",
    read: true,
  },
  {
    id: 7,
    type: "campaign",
    title: "Campaign Ended",
    message: "Your \"Lunch Set Menu ฿199\" campaign has ended. View the final results in Promotions.",
    time: "1 week ago",
    read: true,
  },
];

const typeConfig: Record<string, { icon: typeof Bell; bgColor: string; iconColor: string }> = {
  review: { icon: MessageSquare, bgColor: "bg-[#FFCC02]/15", iconColor: "text-[#FFCC02]" },
  campaign: { icon: Megaphone, bgColor: "bg-[#6C2BD9]/10", iconColor: "text-[#6C2BD9]" },
  milestone: { icon: TrendingUp, bgColor: "bg-[#00B14F]/10", iconColor: "text-[#00B14F]" },
  verification: { icon: ShieldCheck, bgColor: "bg-blue-50", iconColor: "text-blue-500" },
  tip: { icon: Star, bgColor: "bg-amber-50", iconColor: "text-amber-500" },
};

export default function OwnerNotifications() {
  const session = getAdminSession();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const markRead = (id: number) => {
    setNotifications(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  if (!session || session.sessionType !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400" data-testid="text-access-denied">This page is only accessible to restaurant owners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="owner-notifications-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-[#FFCC02]" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800" data-testid="text-notifications-title">Notifications</h2>
            <p className="text-xs text-gray-400">Stay updated on your restaurant activity</p>
          </div>
          {unreadCount > 0 && (
            <span className="bg-red-400 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-[#FFCC02] font-medium hover:text-[#FFCC02]/80 flex items-center gap-1 transition-colors"
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-4 py-1.5 rounded-md transition-all ${
              filter === f
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
            data-testid={`filter-${f}`}
          >
            {f === "all" ? "All" : "Unread"}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1 bg-red-400 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid="section-notifications-list">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.tip;
              const Icon = config.icon;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 transition-colors cursor-pointer hover:bg-gray-50/50 ${
                    !notif.read ? "bg-[#FFCC02]/[0.03]" : ""
                  }`}
                  onClick={() => markRead(notif.id)}
                  data-testid={`notification-${notif.id}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.bgColor}`}>
                    <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{notif.title}</span>
                      {!notif.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFCC02] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-gray-300 mt-1 block">{notif.time}</span>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                      className="text-gray-300 hover:text-[#00B14F] transition-colors shrink-0 mt-1"
                      data-testid={`button-mark-read-${notif.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
