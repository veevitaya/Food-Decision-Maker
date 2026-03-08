import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import toastLogo from "@assets/toast_logo_nobg.png";
import { Lock, User } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/login", { username, password });
      const data = await res.json();
      localStorage.setItem(
        "toast_admin_session",
        JSON.stringify({
          username: data.username,
          role: data.role,
          permissions: data.permissions || [],
          sessionType: "admin",
          loggedIn: true,
        })
      );
      setLocation("/admin/dashboard");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-background"
      data-testid="admin-login-page"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/6 w-72 h-72 rounded-full bg-gray-200 dark:bg-muted blur-[100px] opacity-60" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-gray-200 dark:bg-muted blur-[100px] opacity-50" />
        <div className="absolute top-1/2 right-1/6 w-56 h-56 rounded-full bg-gray-100 dark:bg-muted blur-[100px] opacity-40" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-3xl p-8 shadow-[0_8px_40px_rgba(30,41,59,0.06)]">
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <img
                src={toastLogo}
                alt="Toast Logo"
                className="h-14 w-auto"
                data-testid="img-toast-logo"
              />
              <span
                className="font-extrabold text-[14px] text-foreground uppercase leading-none block text-center"
                style={{ letterSpacing: "1.15em", paddingLeft: "1.15em", width: "fit-content" }}
                data-testid="text-brand-things"
              >
                THINGS
              </span>
            </div>

            <div className="text-center">
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-admin-subtitle"
              >
                Sign in to manage your platform
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLocation("/owner/login")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-owner-login"
            >
              Restaurant owner? Go to owner login
            </button>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="username">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    data-testid="input-username"
                    required
                    className="pl-10 rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20 focus-visible:border-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    data-testid="input-password"
                    required
                    className="pl-10 rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20 focus-visible:border-foreground"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500" data-testid="text-login-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none bg-foreground hover:bg-foreground/90 text-white rounded-xl px-8 py-3 mt-2 shadow-md shadow-foreground/10"
                data-testid="button-login"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">Toastings Admin v1.0</p>
      </div>
    </div>
  );
}
