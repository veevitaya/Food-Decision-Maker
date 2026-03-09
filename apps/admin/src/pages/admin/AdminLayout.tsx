import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Utensils,
  Megaphone,
  ImageIcon,
  BarChart3,
  Brain,
  FlaskConical,
  Gauge,
  Shield,
  LogOut,
  Bell,
  ExternalLink,
  Settings2,
  Store,
  ShieldCheck,
  UserSearch,
  MapPin,
  CalendarDays,
} from "lucide-react";
import toastLogo from "@assets/toast_logo_nobg.png";

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

const adminNavItems: { label: string; icon: typeof LayoutDashboard; href: string; activeColor: string }[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", activeColor: "text-blue-600" },
  { label: "Users", icon: Users, href: "/admin/users", activeColor: "text-purple-600" },
  { label: "Restaurants", icon: Utensils, href: "/admin/restaurants", activeColor: "text-orange-600" },
  { label: "Campaigns", icon: Megaphone, href: "/admin/campaigns", activeColor: "text-yellow-600" },
  { label: "Banners", icon: ImageIcon, href: "/admin/banners", activeColor: "text-pink-600" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics", activeColor: "text-teal-600" },
  { label: "Customers", icon: UserSearch, href: "/admin/customers", activeColor: "text-violet-600" },
  { label: "Recommendations", icon: Brain, href: "/admin/recommendations", activeColor: "text-indigo-600" },
  { label: "Experiments", icon: FlaskConical, href: "/admin/experiments", activeColor: "text-fuchsia-600" },
  { label: "Operations", icon: Gauge, href: "/admin/operations", activeColor: "text-cyan-600" },
  { label: "Sessions", icon: CalendarDays, href: "/admin/sessions", activeColor: "text-sky-600" },
  { label: "Places", icon: MapPin, href: "/admin/places", activeColor: "text-lime-600" },
  { label: "Security Audit", icon: Shield, href: "/admin/security-audit", activeColor: "text-rose-600" },
  { label: "App Config", icon: Settings2, href: "/admin/config", activeColor: "text-slate-600" },
];

const ownerNavItems: { label: string; icon: typeof LayoutDashboard; href: string; activeColor: string }[] = [
  { label: "My Restaurant", icon: Store, href: "/admin/my-restaurant", activeColor: "text-emerald-600" },
  { label: "Campaigns", icon: Megaphone, href: "/admin/campaigns", activeColor: "text-yellow-600" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics", activeColor: "text-teal-600" },
];

function getPageTitle(path: string, items: typeof adminNavItems): string {
  const item = items.find((n) => path.startsWith(n.href));
  return item ? item.label : "Admin";
}

export default function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const [location, setLocation] = useLocation();
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    const isOwnerRoute = location.startsWith("/admin/my-restaurant");
    const loginPath = isOwnerRoute ? "/owner/login" : "/admin/login";
    const raw = localStorage.getItem("toast_admin_session");
    if (!raw) {
      setLocation(loginPath);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.loggedIn) {
        setLocation(loginPath);
        return;
      }
      setSession(parsed);
    } catch {
      setLocation(loginPath);
    }
  }, [location, setLocation]);

  const handleLogout = () => {
    const target = session?.sessionType === "owner" ? "/owner/login" : "/admin/login";
    localStorage.removeItem("toast_admin_session");
    setLocation(target);
  };

  if (!session) return null;

  const isOwner = session.sessionType === "owner";
  const navItems = isOwner ? ownerNavItems : adminNavItems;
  const pageTitle = title || getPageTitle(location, navItems);
  const displayName = isOwner ? session.displayName || session.email || "Owner" : session.username || "Admin";
  const roleLabel = isOwner ? (session.isVerified ? "Verified Owner" : "Owner") : (session.role || "admin");

  return (
    <div className="flex h-screen w-full" data-testid="admin-layout">
      <aside
        className="hidden md:flex flex-col bg-white dark:bg-card border-r border-gray-200 dark:border-border"
        style={{ width: 260 }}
        data-testid="admin-sidebar"
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 dark:border-border">
          <div className="flex flex-col items-center" data-testid="text-sidebar-brand">
            <img
              src={toastLogo}
              alt="Toast"
              className="h-10 w-auto"
              data-testid="img-sidebar-logo"
            />
            <span
              className="font-extrabold text-[10px] text-foreground uppercase leading-none mt-0.5"
              style={{ letterSpacing: "1.15em", paddingLeft: "1.15em" }}
            >THINGS</span>
          </div>
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
            isOwner
              ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-[#FFCC02] text-foreground"
          }`}>
            {isOwner ? "Owner" : "Admin"}
          </span>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-0.5" data-testid="admin-nav">
          {navItems.map((item) => {
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                    active
                      ? "bg-gray-50 dark:bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className={`w-[18px] h-[18px] ${active ? item.activeColor : "text-muted-foreground"}`} strokeWidth={active ? 2 : 1.5} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
              isOwner
                ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600"
                : "bg-gray-100 dark:bg-muted text-foreground"
            }`}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate" data-testid="text-admin-username">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground/60 capitalize flex items-center gap-1">
                {isOwner && session.isVerified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            data-testid="button-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="flex items-center justify-between gap-4 px-8 bg-white dark:bg-card border-b border-gray-200 dark:border-border"
          style={{ minHeight: 60 }}
          data-testid="admin-topbar"
        >
          <div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-page-title">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer" data-testid="link-view-app">
                <ExternalLink className="w-3.5 h-3.5" />
                View App
              </span>
            </Link>
            <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-notifications">
              <Bell className="w-4.5 h-4.5" />
            </button>
            <span className="hidden max-md:inline text-sm text-muted-foreground" data-testid="text-admin-username-mobile">
              {displayName}
            </span>
            <button
              onClick={handleLogout}
              className="hidden max-md:flex text-sm text-muted-foreground hover:text-foreground transition-colors items-center gap-1.5"
              data-testid="button-logout-mobile"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-muted"
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
