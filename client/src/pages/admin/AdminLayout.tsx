import { Link, useLocation } from "wouter";
import { useLineProfile } from "@/hooks/use-line-profile";
import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

type AdminLayoutProps = {
  title: string;
  children: React.ReactNode;
};

export default function AdminLayout({ title, children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const { profile, loading } = useLineProfile();
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      if (!profile?.userId) {
        setChecking(false);
        return;
      }
      const res = await fetch("/api/admin/overview", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        toast({
          title: "Admin access required",
          description: "Your account does not have admin permission.",
          variant: "destructive",
        });
        navigate("/profile");
        return;
      }
      setChecking(false);
    }
    void checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [navigate, profile?.userId, toast]);

  if (loading || checking) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking admin access...</p>
      </div>
    );
  }

  const navItems = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/restaurants", label: "Restaurants" },
    { path: "/admin/users", label: "Users" },
    { path: "/admin/places", label: "Places Ops" },
  ];

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin</p>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <button
          className="text-sm px-3 py-2 rounded-lg border"
          onClick={() => navigate("/")}
        >
          Exit
        </button>
      </header>
      <div className="px-4 py-4">
        <nav className="flex flex-wrap gap-2 mb-4">
          {navItems.map((item) => {
            const active = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <span
                  className={`inline-flex px-3 py-2 rounded-lg text-sm cursor-pointer ${
                    active ? "bg-foreground text-white" : "bg-white border"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
