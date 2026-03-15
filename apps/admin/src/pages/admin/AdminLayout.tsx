import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Utensils,
  Megaphone,
  ImageIcon,
  BarChart3,
  LogOut,
  ExternalLink,
  Settings2,
  Store,
  ShieldCheck,
  ChevronRight,
  UtensilsCrossed,
  MessageSquare,
  TrendingUp,
  Bell,
  CreditCard,
  Lightbulb,
  HelpCircle,
  Lock,
} from "lucide-react";
import { tierAtLeast, type OwnerTier } from "@/components/TierGate";
import { useSocketIO } from "@/hooks/useSocketIO";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageProvider";

const toastLogo = "/api/uploads/toast_logo_.png";

interface AdminSession {
  sessionType: "admin" | "owner";
  loggedIn: boolean;
  username?: string;
  role?: string;
  permissions?: string[];
  displayName?: string;
  email?: string;
  restaurantId?: number;
  restaurantName?: string;
  isVerified?: boolean;
  subscriptionTier?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
  minTier?: OwnerTier;
}

const adminNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Owners", icon: ShieldCheck, href: "/admin/owners" },
      { label: "Restaurants", icon: Utensils, href: "/admin/restaurants" },
      { label: "Menus", icon: UtensilsCrossed, href: "/admin/menus" },
      { label: "Campaigns", icon: Megaphone, href: "/admin/campaigns" },
      { label: "Banners", icon: ImageIcon, href: "/admin/banners" },
    ],
  },
  {
    label: "Customers",
    items: [
      { label: "Users", icon: Users, href: "/admin/users" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
      { label: "Food Trends", icon: TrendingUp, href: "/admin/food-trends" },
      { label: "Geography", icon: Users, href: "/admin/geography" },
      { label: "Swipe Sessions", icon: Users, href: "/admin/swipe-sessions" },
      { label: "Predictions", icon: Lightbulb, href: "/admin/predictive-intelligence" },
      { label: "Partner Clickouts", icon: ExternalLink, href: "/admin/partner-clickouts" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Payments", icon: CreditCard, href: "/admin/payments" },
      { label: "Integrations", icon: Settings2, href: "/admin/integrations" },
      { label: "Reports", icon: BarChart3, href: "/admin/reports" },
      { label: "ML Status", icon: BarChart3, href: "/admin/ml-status" },
      { label: "Coming Soon", icon: Lightbulb, href: "/admin/coming-soon" },
      { label: "App Config", icon: Settings2, href: "/admin/config" },
    ],
  },
];

const ownerNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: Store, href: "/admin/my-restaurant" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Menu & Hours", icon: UtensilsCrossed, href: "/admin/owner/menu" },
      { label: "Reviews", icon: MessageSquare, href: "/admin/owner/reviews", minTier: "growth" },
      { label: "Promotions", icon: Megaphone, href: "/admin/owner/promotions", minTier: "growth" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Performance", icon: TrendingUp, href: "/admin/owner/performance", minTier: "growth" },
      { label: "AI Insights", icon: Lightbulb, href: "/admin/owner/insights", minTier: "pro" },
      { label: "Customer Insights", icon: Users, href: "/admin/owner/customer-insights", minTier: "pro" },
      { label: "Delivery Conversions", icon: TrendingUp, href: "/admin/owner/delivery-conversions", minTier: "pro" },
      { label: "Notifications", icon: Bell, href: "/admin/owner/notifications", minTier: "pro" },
      { label: "Decision Intel", icon: Lightbulb, href: "/admin/owner/decision-intelligence", minTier: "enterprise" },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Subscription", icon: CreditCard, href: "/admin/owner/billing" },
    ],
  },
  {
    label: "Help",
    items: [
      { label: "Support", icon: HelpCircle, href: "/admin/owner/support" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", icon: Settings2, href: "/admin/owner/settings" },
    ],
  },
];

function getPageTitle(path: string, groups: NavGroup[]): string {
  for (const group of groups) {
    for (const item of group.items) {
      if (path.startsWith(item.href)) return item.label;
    }
  }
  return "Admin";
}

export default function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [location, setLocation] = useLocation();
  const [session, setSession] = useState<AdminSession | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const raw = localStorage.getItem("toast_admin_session");
    if (!raw) {
      setLocation("/admin/login");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.loggedIn) {
        setLocation("/admin/login");
        return;
      }
      setSession(parsed);
    } catch {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("toast_admin_session");
    setLocation("/admin/login");
  };

  // Fetch unread notification count for owners (API fallback)
  const isOwner = session?.sessionType === "owner";
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/owner/notifications/unread-count"],
    enabled: isOwner && !!session,
    refetchInterval: 30000, // Poll every 30 seconds as fallback
  });
  const [unreadCount, setUnreadCount] = useState(unreadCountData?.count ?? 0);

  // Sync API data with state
  useEffect(() => {
    if (unreadCountData?.count !== undefined) {
      setUnreadCount(unreadCountData.count);
    }
  }, [unreadCountData?.count]);

  // Socket.IO for real-time notifications
  const { connected: socketConnected, markNotificationRead: markReadSocket, markAllNotificationsRead: markAllReadSocket } = useSocketIO({
    session: session ? { loggedIn: session.loggedIn, sessionType: session.sessionType, ownerId: (session as any).ownerId } : null,
    onNotification: (notification) => {
      // Increment unread count when new notification arrives
      setUnreadCount((prev) => prev + 1);
      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      });
    },
    onUnreadCount: (count) => {
      setUnreadCount(count);
    },
  });

  const { t, language, setLanguage } = useLanguage();

  if (!session) return null;

  const navGroups = isOwner ? ownerNavGroups : adminNavGroups;
  const pageTitle = title ?? getPageTitle(location, navGroups);
  const displayName = isOwner ? session.displayName || session.email || "Owner" : session.username || "Admin";
  const roleLabel = isOwner ? (session.isVerified ? "Verified Owner" : "Owner") : (session.role || "admin");

  return (
    <div className="flex h-screen w-full bg-[#F8F8F8]" data-testid="admin-layout">
      <aside
        className="hidden md:flex flex-col bg-white border-r border-gray-100"
        style={{ width: 260 }}
        data-testid="admin-sidebar"
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <div className="flex flex-col items-center" data-testid="text-sidebar-brand">
            <img
              src={toastLogo}
              alt="Toast"
              className="h-10 w-auto"
              data-testid="img-sidebar-logo"
            />
            <span
              className="font-extrabold text-[10px] text-gray-800 uppercase leading-none mt-0.5"
              style={{ letterSpacing: "1.15em", paddingLeft: "1.15em" }}
            >THINGS</span>
          </div>
          <span className={`text-[10px] font-semibold rounded-full px-2.5 py-1 ${
            isOwner
              ? "bg-[#00B14F]/10 text-[#00B14F]"
              : "bg-[#FFCC02]/20 text-gray-800"
          }`}>
            {isOwner ? "Owner" : "Admin"}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-5 overflow-y-auto" data-testid="admin-nav">
          {navGroups.map((group) => {
            const accentColor = isOwner ? "#00B14F" : "#FFCC02";
            return (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-gray-400 px-3 mb-1.5">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = location.startsWith(item.href);
                    const locked = isOwner && item.minTier && !tierAtLeast(session.subscriptionTier, item.minTier);
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all relative ${
                            locked
                              ? "text-gray-300 cursor-default"
                              : active
                                ? "text-gray-900"
                                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                          }`}
                          style={active && !locked ? { backgroundColor: `${accentColor}19` } : undefined}
                          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {active && !locked && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                              style={{ backgroundColor: accentColor }}
                            />
                          )}
                          <item.icon
                            className={`w-[17px] h-[17px] ${locked ? "text-gray-300" : active ? "" : "text-gray-400"}`}
                            style={active && !locked ? { color: accentColor } : undefined}
                            strokeWidth={active && !locked ? 2 : 1.5}
                          />
                          <span className="flex-1">{item.label}</span>
                          {locked
                            ? <Lock className="w-3 h-3 text-gray-300" />
                            : active && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          }
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
              isOwner
                ? "bg-[#00B14F]/10 text-[#00B14F]"
                : "bg-[#FFCC02]/20 text-gray-800"
            }`}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium text-gray-800 truncate" data-testid="text-admin-username">
                {displayName}
              </span>
              <span className="text-[11px] text-gray-400 capitalize flex items-center gap-1">
                {isOwner && session.isVerified && <ShieldCheck className="w-3 h-3 text-[#00B14F]" />}
                {roleLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === "en" ? "th" : "en")}
              className="text-[11px] font-bold text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 rounded-full px-2 py-0.5"
              data-testid="button-lang-toggle"
            >
              {t("layout.language")}
            </button>
            <button
              onClick={handleLogout}
              className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5"
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t("layout.logout")}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="flex items-center justify-between gap-4 px-8 bg-white border-b border-gray-100"
          style={{ minHeight: 60 }}
          data-testid="admin-topbar"
        >
          <div>
            <h1 className="text-[17px] font-semibold text-gray-800" data-testid="text-page-title">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {isOwner && (
              <Link href="/admin/owner/notifications">
                <div className="relative cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors" data-testid="notification-bell">
                  <Bell className="w-4 h-4 text-gray-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-400 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {/* Socket.IO connection indicator */}
                  {socketConnected && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white" title="Real-time notifications active" />
                  )}
                </div>
              </Link>
            )}
            <Link href="/">
              <span className="text-[13px] text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer" data-testid="link-view-app">
                <ExternalLink className="w-3.5 h-3.5" />
                {t("layout.view_app")}
              </span>
            </Link>
            <span className="hidden max-md:inline text-[13px] text-gray-500" data-testid="text-admin-username-mobile">
              {displayName}
            </span>
            <button
              onClick={handleLogout}
              className="hidden max-md:flex text-[13px] text-gray-400 hover:text-gray-700 transition-colors items-center gap-1.5"
              data-testid="button-logout-mobile"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t("layout.logout")}
            </button>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto p-8 bg-[#F8F8F8]"
          data-testid="admin-main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem("toast_admin_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.loggedIn ? parsed : null;
  } catch {
    return null;
  }
}

export function getAdminToken(): string {
  const session = getAdminSession();
  if (!session) return "";
  if (session.sessionType === "admin") {
    return btoa(`${session.username}:`);
  }
  return "";
}
