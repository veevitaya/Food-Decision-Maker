import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import toastLogo from "@assets/toast_logo_nobg.png";
import { Lock, User, Mail, Store } from "lucide-react";

type LoginMode = "admin" | "owner";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<LoginMode>("admin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "admin") {
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
      } else {
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
          })
        );
        setLocation("/admin/my-restaurant");
      }
    } catch (err: any) {
      setError(mode === "admin" ? "Invalid username or password" : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gray-50"
      data-testid="admin-login-page"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/6 w-72 h-72 rounded-full bg-gray-200 blur-[100px] opacity-60" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-gray-200 blur-[100px] opacity-50" />
        <div className="absolute top-1/2 right-1/6 w-56 h-56 rounded-full bg-gray-100 blur-[100px] opacity-40" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
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

            <div className="w-full flex bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setMode("admin"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "admin"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-admin-login"
              >
                <User className="w-3.5 h-3.5" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => { setMode("owner"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "owner"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-owner-login"
              >
                <Store className="w-3.5 h-3.5" />
                Owner
              </button>
            </div>

            <div className="text-center">
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-admin-subtitle"
              >
                {mode === "admin" ? "Sign in to manage your platform" : "Sign in to manage your restaurant"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              {mode === "admin" ? (
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
                      className="pl-10 rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30 focus-visible:border-[#FFCC02]"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      data-testid="input-email"
                      required
                      className="pl-10 rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30 focus-visible:border-[#FFCC02]"
                    />
                  </div>
                </div>
              )}

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
                    className="pl-10 rounded-xl border-gray-100 focus-visible:ring-[#FFCC02]/30 focus-visible:border-[#FFCC02]"
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
                className="w-full text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none bg-[#FFCC02] hover:bg-[#FFCC02]/90 text-gray-900 rounded-xl px-8 py-3 mt-2 shadow-md shadow-[#FFCC02]/10"
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
