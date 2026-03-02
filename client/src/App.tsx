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
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminPlaces from "@/pages/admin/AdminPlaces";
import { getLiffIdToken, initLiff, isLiffAvailable, isLoggedIn, login } from "@/lib/liff";

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
        <Route path="/admin">
          <AnimatedPage><AdminDashboard /></AnimatedPage>
        </Route>
        <Route path="/admin/restaurants">
          <AnimatedPage><AdminRestaurants /></AnimatedPage>
        </Route>
        <Route path="/admin/restaurants/:id">
          <AnimatedPage><AdminRestaurantEditor /></AnimatedPage>
        </Route>
        <Route path="/admin/users">
          <AnimatedPage><AdminUsers /></AnimatedPage>
        </Route>
        <Route path="/admin/places">
          <AnimatedPage><AdminPlaces /></AnimatedPage>
        </Route>
        <Route>
          <AnimatedPage><NotFound /></AnimatedPage>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function RequireLiffAuth({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!isLiffAvailable()) {
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

        const verifyRes = await fetch("/api/auth/line/verify", {
          headers: {
            Authorization: `Bearer ${idToken}`,
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <RequireLiffAuth>
          <Router />
        </RequireLiffAuth>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
