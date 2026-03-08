import { Switch, Route, useLocation, Redirect } from "wouter";
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
import CampaignDetail from "@/pages/CampaignDetail";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminRestaurants from "@/pages/admin/AdminRestaurants";
import AdminCampaigns from "@/pages/admin/AdminCampaigns";
import AdminBanners from "@/pages/admin/AdminBanners";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminConfig from "@/pages/admin/AdminConfig";
import AdminOwnerDashboard from "@/pages/admin/AdminOwnerDashboard";

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
        <Route path="/swipe">
          <AnimatedPage><SwipePage /></AnimatedPage>
        </Route>
        <Route path="/profile">
          <AnimatedPage><Profile /></AnimatedPage>
        </Route>
        <Route path="/toast-picks">
          <AnimatedPage><ToastPicks /></AnimatedPage>
        </Route>
        <Route path="/admin/login">
          <AdminLogin />
        </Route>
        <Route path="/admin/dashboard">
          <AdminLayout><AdminDashboard /></AdminLayout>
        </Route>
        <Route path="/admin/users">
          <AdminLayout><AdminUsers /></AdminLayout>
        </Route>
        <Route path="/admin/restaurants">
          <AdminLayout><AdminRestaurants /></AdminLayout>
        </Route>
        <Route path="/admin/campaigns">
          <AdminLayout><AdminCampaigns /></AdminLayout>
        </Route>
        <Route path="/admin/banners">
          <AdminLayout><AdminBanners /></AdminLayout>
        </Route>
        <Route path="/admin/analytics">
          <AdminLayout><AdminAnalytics /></AdminLayout>
        </Route>
        <Route path="/admin/config">
          <AdminLayout><AdminConfig /></AdminLayout>
        </Route>
        <Route path="/admin/my-restaurant">
          <AdminLayout><AdminOwnerDashboard /></AdminLayout>
        </Route>
        <Route path="/admin">
          <Redirect to="/admin/dashboard" />
        </Route>
        <Route>
          <AnimatedPage><NotFound /></AnimatedPage>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
