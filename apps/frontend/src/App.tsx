import { Switch, Route, useLocation, Redirect } from "wouter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useBranding } from "@/hooks/use-branding";
import { useLineProfile } from "@/hooks/use-line-profile";
import { AnimatePresence, motion } from "framer-motion";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import SoloQuiz from "@/pages/SoloQuiz";
import SoloResults from "@/pages/SoloResults";
import RestaurantList from "@/pages/RestaurantList";
import GroupSetup from "@/pages/GroupSetup";
import WaitingRoom from "@/pages/WaitingRoom";
import GroupSwipe from "@/pages/GroupSwipe";
import GroupResult from "@/pages/GroupResult";
import GroupFinalVote from "@/pages/GroupFinalVote";
import GroupMenuRestaurants from "@/pages/GroupMenuRestaurants";
import SwipePage from "@/pages/SwipePage";
import RestaurantDetail from "@/pages/RestaurantDetail";
import Profile from "@/pages/Profile";
import SavedPage from "@/pages/SavedPage";
import ToastPicks from "@/pages/ToastPicks";
import CampaignDetail from "@/pages/CampaignDetail";

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

function RequireLiffLogin({ children }: { children: React.ReactNode }) {
  const { profile, loading, liffReady, liffAvailable, loggedIn, login } = useLineProfile();

  useEffect(() => {
    if (!liffAvailable) return;
    if (!liffReady || loading) return;
    if (loggedIn && profile?.userId) return;
    login();
  }, [liffAvailable, liffReady, loading, loggedIn, profile?.userId, login]);

  if (!liffAvailable) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-base font-semibold text-foreground">LINE login unavailable</p>
          <p className="text-sm text-muted-foreground mt-1">Set `VITE_LIFF_ID` to enable personalized routes.</p>
        </div>
      </div>
    );
  }

  if (!liffReady || loading || !loggedIn || !profile?.userId) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-base font-semibold text-foreground">Redirecting to LINE login...</p>
          <p className="text-sm text-muted-foreground mt-1">Authentication is required for personalized experience.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  const [location] = useLocation();
  const requiresLiffAuth = !location.startsWith("/admin") && !location.startsWith("/owner");

  return (
    <RequireLiffLoginWrapper enabled={requiresLiffAuth}>
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
          <Route path="/campaign/:id">
            <AnimatedPage><CampaignDetail /></AnimatedPage>
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
          <Route path="/group/result">
            <AnimatedPage><GroupResult /></AnimatedPage>
          </Route>
          <Route path="/group/final-vote">
            <AnimatedPage><GroupFinalVote /></AnimatedPage>
          </Route>
          <Route path="/group/menu-restaurants">
            <AnimatedPage><GroupMenuRestaurants /></AnimatedPage>
          </Route>
          <Route path="/swipe">
            <AnimatedPage><SwipePage /></AnimatedPage>
          </Route>
          <Route path="/saved">
            <AnimatedPage><SavedPage /></AnimatedPage>
          </Route>
          <Route path="/profile">
            <AnimatedPage><Profile /></AnimatedPage>
          </Route>
          <Route path="/toast-picks">
            <AnimatedPage><ToastPicks /></AnimatedPage>
          </Route>
          <Route path="/admin">
            <Redirect to="/" />
          </Route>
          <Route>
            <AnimatedPage><NotFound /></AnimatedPage>
          </Route>
        </Switch>
      </AnimatePresence>
    </RequireLiffLoginWrapper>
  );
}

function RequireLiffLoginWrapper({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return <RequireLiffLogin>{children}</RequireLiffLogin>;
}

function BrandingApplier() {
  const { accentColor } = useBranding();
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", accentColor);
  }, [accentColor]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrandingApplier />
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
