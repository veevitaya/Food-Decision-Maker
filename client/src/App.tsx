import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import SoloQuiz from "@/pages/SoloQuiz";
import SoloResults from "@/pages/SoloResults";
import RestaurantList from "@/pages/RestaurantList";
import GroupSetup from "@/pages/GroupSetup";
import WaitingRoom from "@/pages/WaitingRoom";
import GroupSwipe from "@/pages/GroupSwipe";
import SwipePage from "@/pages/SwipePage";
import RestaurantDetail from "@/pages/RestaurantDetail";
import Profile from "@/pages/Profile";
import ToastPicks from "@/pages/ToastPicks";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminRestaurants from "@/pages/admin/AdminRestaurants";
import AdminRestaurantEditor from "@/pages/admin/AdminRestaurantEditor";
import AdminRestaurantImport from "@/pages/admin/AdminRestaurantImport";
import AdminMapCheck from "@/pages/admin/AdminMapCheck";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminPlaces from "@/pages/admin/AdminPlaces";
import AdminSessions from "@/pages/admin/AdminSessions";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminCampaigns from "@/pages/admin/AdminCampaigns";
import AdminBanners from "@/pages/admin/AdminBanners";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminConfig from "@/pages/admin/AdminConfig";
import AdminLayout from "@/pages/admin/AdminLayout";
import { getLiffIdToken, getLiffNonce, initLiff, isLiffAvailable, isLoggedIn, login } from "@/lib/liff";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition = {
  type: "spring" as const,
  damping: 26,
  stiffness: 260,
  mass: 0.8,
};

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="w-full h-full gpu-accelerated"
    >
      {children}
    </motion.div>
  );
}

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        <Route path="/">
          <AnimatedPage><Home /></AnimatedPage>
        </Route>
        <Route path="/solo/quiz">
          <AnimatedPage><SoloQuiz /></AnimatedPage>
        </Route>
        <Route path="/solo/results">
          <AnimatedPage><SoloResults /></AnimatedPage>
        </Route>
        <Route path="/restaurants">
          <AnimatedPage><RestaurantList /></AnimatedPage>
        </Route>
        <Route path="/restaurant/:id">
          <AnimatedPage><RestaurantDetail /></AnimatedPage>
        </Route>
        <Route path="/group/setup">
          <AnimatedPage><GroupSetup /></AnimatedPage>
        </Route>
        <Route path="/group/waiting">
          <AnimatedPage><WaitingRoom /></AnimatedPage>
        </Route>
        <Route path="/group/swipe">
          <AnimatedPage><GroupSwipe /></AnimatedPage>
        </Route>
        <Route path="/swipe">
          <AnimatedPage><SwipePage /></AnimatedPage>
        </Route>
        <Route path="/profile">
          <AnimatedPage><Profile /></AnimatedPage>
        </Route>
        <Route path="/toast-picks">
          <AnimatedPage><ToastPicks /></AnimatedPage>
        </Route>
        <Route>
          <AnimatedPage><NotFound /></AnimatedPage>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function AdminRouter() {
  const [location] = useLocation();
  return (
    <Switch location={location}>
      <Route path="/admin/login">
        <AdminLogin />
      </Route>
      <Route path="/admin/dashboard">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      <Route path="/admin/campaigns">
        <AdminLayout>
          <AdminCampaigns />
        </AdminLayout>
      </Route>
      <Route path="/admin/banners">
        <AdminLayout>
          <AdminBanners />
        </AdminLayout>
      </Route>
      <Route path="/admin/analytics">
        <AdminLayout>
          <AdminAnalytics />
        </AdminLayout>
      </Route>
      <Route path="/admin/config">
        <AdminLayout>
          <AdminConfig />
        </AdminLayout>
      </Route>
      <Route path="/admin/restaurants/import/google">
        <AdminRestaurantImport />
      </Route>
      <Route path="/admin/map-check">
        <AdminMapCheck />
      </Route>
      <Route path="/admin/restaurants/:id">
        <AdminRestaurantEditor />
      </Route>
      <Route path="/admin/restaurants">
        <AdminLayout>
          <AdminRestaurants />
        </AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout>
          <AdminUsers />
        </AdminLayout>
      </Route>
      <Route path="/admin/sessions">
        <AdminSessions />
      </Route>
      <Route path="/admin/places">
        <AdminPlaces />
      </Route>
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
    </Switch>
  );
}

function RequireLiffAuth({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!isLiffAvailable()) {
        const viteKeys = Object.keys(import.meta.env).filter((key) => key.startsWith("VITE_"));
        console.log("[Auth startup debug] LIFF unavailable at startup.", {
          mode: import.meta.env.MODE,
          VITE_LIFF_ID: import.meta.env.VITE_LIFF_ID ?? null,
          availableViteKeys: viteKeys,
          hint: "Set VITE_LIFF_ID in .env and restart the dev/build process.",
        });
        if (!mounted) return;
        setErrorMessage("LIFF is not configured. Set VITE_LIFF_ID before running the app.");
        setState("error");
        return;
      }

      try {
        const ready = await initLiff({ autoLogin: true });
        if (!mounted) return;

        if (!ready) {
          setErrorMessage("Failed to initialize LINE login.");
          setState("error");
          return;
        }

        if (!isLoggedIn()) {
          login();
          return;
        }

        const idToken = getLiffIdToken();
        if (!idToken) {
          setErrorMessage("Missing LIFF ID token.");
          setState("error");
          return;
        }

        const nonce = getLiffNonce();
        const verifyRes = await fetch("/api/auth/line/verify", {
          headers: {
            Authorization: `Bearer ${idToken}`,
            ...(nonce ? { "X-Liff-Nonce": nonce } : {}),
          },
          credentials: "include",
        });

        if (!verifyRes.ok) {
          setErrorMessage("LINE token verification failed.");
          setState("error");
          return;
        }

        setState("ready");
      } catch {
        if (!mounted) return;
        setErrorMessage("Failed to initialize LINE login.");
        setState("error");
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-white text-sm text-muted-foreground">
        Checking LINE login...
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="text-base font-semibold text-foreground">Unable to start app</p>
          <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  const [location, navigate] = useLocation();
  const isAdminPath = location.startsWith("/admin");

  useEffect(() => {
    if (isAdminPath) return;
    const params = new URLSearchParams(window.location.search);
    const room = (params.get("room") || "").trim().toUpperCase();
    if (!room) return;
    if (location === "/group/waiting") return;
    navigate(`/group/waiting?session=${encodeURIComponent(room)}`);
  }, [isAdminPath, location, navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isAdminPath ? (
          <AdminRouter />
        ) : (
          <RequireLiffAuth>
            <Router />
          </RequireLiffAuth>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
