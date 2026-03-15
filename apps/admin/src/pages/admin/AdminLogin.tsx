import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Lock, User, Mail, ArrowLeft, QrCode, Smartphone } from "lucide-react";

const toastLogo = "/api/uploads/toast_logo_.png";

type LoginMode = "admin" | "owner";
type OwnerLoginMethod = "email" | "line";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<LoginMode>("admin");
  const [ownerMethod, setOwnerMethod] = useState<OwnerLoginMethod>("email");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lineQrLoading, setLineQrLoading] = useState(false);
  const [lineQrUrl, setLineQrUrl] = useState<string | null>(null);
  const [lineLoginStatus, setLineLoginStatus] = useState<"idle" | "waiting" | "success" | "error">("idle");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

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

  const handleLineQrLogin = async () => {
    setLineQrLoading(true);
    setError("");
    setLineLoginStatus("idle");
    try {
      const sessionId = `line_owner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=2009335625&redirect_uri=${encodeURIComponent("https://letstoast.app/api/line/owner-callback")}&state=${sessionId}&scope=profile%20openid%20email&bot_prompt=aggressive`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lineLoginUrl)}&bgcolor=ffffff&color=06C755&format=svg`;
      setLineQrUrl(qrApiUrl);
      setLineLoginStatus("waiting");

      localStorage.setItem("toast_line_owner_session_id", sessionId);

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      let attempts = 0;
      const maxAttempts = 120;
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts >= maxAttempts) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setLineLoginStatus("idle");
          setLineQrUrl(null);
          setError("LINE login timed out. Please try again.");
          return;
        }
        try {
          const res = await apiRequest("POST", "/api/line/owner-poll", { sessionId });
          const data = await res.json();
          if (data.authenticated) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setLineLoginStatus("success");
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
                lineUserId: data.lineUserId,
                lineDisplayName: data.lineDisplayName,
                sessionType: "owner",
                loggedIn: true,
              })
            );
            localStorage.removeItem("toast_line_owner_session_id");
            setTimeout(() => setLocation("/admin/my-restaurant"), 800);
          }
        } catch {
        }
      }, 2000);
    } catch (err: any) {
      setError("Failed to generate LINE QR code");
      setLineLoginStatus("error");
    } finally {
      setLineQrLoading(false);
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

            {mode === "owner" && (
              <button
                type="button"
                onClick={() => { if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; } setMode("admin"); setError(""); setPassword(""); setLineQrUrl(null); setLineLoginStatus("idle"); setOwnerMethod("email"); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-back-to-admin"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Admin Login
              </button>
            )}

            <div className="text-center">
              {mode === "admin" ? (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-admin-subtitle"
                >
                  Sign in to manage your platform
                </p>
              ) : (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFCC02]/15 text-[11px] font-semibold text-gray-800 mb-2">
                    <Smartphone className="w-3 h-3" />
                    Restaurant Owner Portal
                  </div>
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="text-admin-subtitle"
                  >
                    Sign in to manage your restaurant
                  </p>
                </div>
              )}
            </div>

            {mode === "owner" && (
              <div className="w-full flex gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => { setOwnerMethod("email"); setError(""); setLineQrUrl(null); setLineLoginStatus("idle"); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
                    ownerMethod === "email" ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="btn-owner-email-tab"
                >
                  <Mail className="w-3 h-3" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setOwnerMethod("line"); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
                    ownerMethod === "line" ? "bg-white text-gray-800 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="btn-owner-line-tab"
                >
                  <QrCode className="w-3 h-3" />
                  LINE Login
                </button>
              </div>
            )}

            {mode === "owner" && ownerMethod === "line" ? (
              <div className="w-full flex flex-col items-center gap-4">
                {lineLoginStatus === "idle" && !lineQrUrl && (
                  <div className="text-center space-y-4 w-full">
                    <div className="w-16 h-16 rounded-2xl bg-[#06C755]/10 flex items-center justify-center mx-auto">
                      <QrCode className="w-8 h-8 text-[#06C755]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Scan with LINE App</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your LINE account will be matched to your restaurant owner profile automatically
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLineQrLogin}
                      disabled={lineQrLoading}
                      className="w-full text-sm font-semibold transition-all disabled:opacity-50 rounded-xl px-8 py-3 bg-[#06C755] hover:bg-[#06C755]/90 text-white shadow-md shadow-[#06C755]/10"
                      data-testid="btn-generate-line-qr"
                    >
                      {lineQrLoading ? "Generating..." : "Generate QR Code"}
                    </button>
                  </div>
                )}

                {lineQrUrl && lineLoginStatus === "waiting" && (
                  <div className="text-center space-y-3 w-full">
                    <div className="bg-white rounded-2xl border-2 border-[#06C755]/20 p-4 inline-block">
                      <img
                        src={lineQrUrl}
                        alt="LINE Login QR Code"
                        className="w-48 h-48 mx-auto"
                        data-testid="img-line-qr"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#06C755] animate-pulse" />
                      <p className="text-xs text-muted-foreground">Waiting for LINE authentication...</p>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Open LINE app → QR Scanner → Scan this code
                    </p>
                    <button
                      type="button"
                      onClick={() => { if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; } setLineQrUrl(null); setLineLoginStatus("idle"); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="btn-cancel-line-qr"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {lineLoginStatus === "success" && (
                  <div className="text-center space-y-3 w-full">
                    <div className="w-16 h-16 rounded-full bg-[#06C755] flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#06C755]">Authenticated via LINE!</p>
                    <p className="text-xs text-muted-foreground">Redirecting to your dashboard...</p>
                  </div>
                )}
              </div>
            ) : (
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
                  className="w-full text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none rounded-xl px-8 py-3 mt-2 shadow-md bg-[#FFCC02] hover:bg-[#FFCC02]/90 text-gray-900 shadow-[#FFCC02]/10"
                  data-testid="button-login"
                >
                  {loading ? "Signing in..." : mode === "owner" ? "Sign In as Owner" : "Sign In"}
                </button>
              </form>
            )}

            {error && mode === "owner" && ownerMethod === "line" && (
              <p className="text-sm text-red-500" data-testid="text-login-error">
                {error}
              </p>
            )}

            {mode === "admin" && (
              <button
                type="button"
                onClick={() => { setMode("owner"); setError(""); setPassword(""); }}
                className="flex items-center gap-2 text-sm font-medium transition-colors px-4 py-2 rounded-xl bg-[#FFCC02]/10 text-gray-800 hover:bg-[#FFCC02]/20"
                data-testid="link-owner-login"
              >
                <Store className="w-3.5 h-3.5" />
                Restaurant Owner Login
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">Toastings Admin v1.0</p>
      </div>
    </div>
  );
}

function Store({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
