import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import toastLogo from "@assets/toast_logo_nobg.png";
import { Lock, Mail } from "lucide-react";

export default function OwnerLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/owner-login", { email, password });
      const data = await res.json();
      localStorage.setItem(
        "toast_admin_session",
        JSON.stringify({
          id: data.id,
          email: data.email,
          displayName: data.displayName,
          restaurantId: data.restaurantId,
          restaurantName: data.restaurantName,
          isVerified: data.isVerified,
          subscriptionTier: data.subscriptionTier,
          sessionType: "owner",
          loggedIn: true,
        }),
      );
      setLocation("/admin/my-restaurant");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-background" data-testid="owner-login-page">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-3xl p-8 shadow-[0_8px_40px_rgba(30,41,59,0.06)]">
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <img src={toastLogo} alt="Toast Logo" className="h-14 w-auto" data-testid="img-owner-toast-logo" />
              <span className="font-extrabold text-[14px] text-foreground uppercase leading-none block text-center" style={{ letterSpacing: "1.15em", paddingLeft: "1.15em", width: "fit-content" }}>
                THINGS
              </span>
            </div>

            <p className="text-sm text-muted-foreground">Sign in to manage your restaurant</p>

            <button
              type="button"
              onClick={() => setLocation("/admin/login")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-admin-login"
            >
              Platform admin? Go to admin login
            </button>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="owner-email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    id="owner-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    data-testid="input-owner-email"
                    required
                    className="pl-10 rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20 focus-visible:border-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="owner-password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    id="owner-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    data-testid="input-owner-password"
                    required
                    className="pl-10 rounded-xl border-gray-200 dark:border-border focus-visible:ring-foreground/20 focus-visible:border-foreground"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500" data-testid="text-owner-login-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none bg-foreground hover:bg-foreground/90 text-white rounded-xl px-8 py-3 mt-2 shadow-md shadow-foreground/10"
                data-testid="button-owner-login"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

