import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  Utensils,
  Megaphone,
  ImageIcon,
  BarChart3,
  LogOut,
  Bell,
  ExternalLink,
  Settings2,
} from "lucide-react";
import toastLogo from "@assets/toast_logo_nobg.png";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Restaurants", icon: Utensils, href: "/admin/restaurants" },
  { label: "Campaigns", icon: Megaphone, href: "/admin/campaigns" },
  { label: "Banners", icon: ImageIcon, href: "/admin/banners" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { label: "App Config", icon: Settings2, href: "/admin/config" },
];

function getPageTitle(path: string): string {
  const item = navItems.find((n) => path.startsWith(n.href));
  return item ? item.label : "Admin";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [adminUser, setAdminUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("toast_admin_session");
    if (!raw) {
      setLocation("/admin/login");
      return;
    }
    try {
      const session = JSON.parse(raw);
      if (!session.loggedIn) {
        setLocation("/admin/login");
        return;
      }
      setAdminUser({ username: session.username, role: session.role });
    } catch {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("toast_admin_session");
    setLocation("/admin/login");
  };

  if (!adminUser) return null;

  const pageTitle = getPageTitle(location);

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
          <span className="bg-[#FFCC02] text-foreground text-[10px] font-semibold rounded-full px-2 py-0.5">
            Admin
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
                      ? "bg-gray-100 dark:bg-muted text-foreground border-l-[3px] border-[#FFCC02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className={`w-4 h-4 ${active ? "text-[#FFCC02]" : ""}`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-muted text-foreground flex items-center justify-center text-xs font-bold">
              {adminUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate" data-testid="text-admin-username">
                {adminUser.username}
              </span>
              <span className="text-xs text-muted-foreground/60 capitalize">{adminUser.role}</span>
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
              {adminUser.username}
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
