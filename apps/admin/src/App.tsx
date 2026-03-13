import { Switch, Route, useLocation, Redirect } from "wouter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";
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
import OwnerLogin from "@/pages/admin/OwnerLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminRestaurants from "@/pages/admin/AdminRestaurants";
import AdminCampaigns from "@/pages/admin/AdminCampaigns";
import AdminBanners from "@/pages/admin/AdminBanners";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminConfig from "@/pages/admin/AdminConfig";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminMenus from "@/pages/admin/AdminMenus";
import AdminFoodTrends from "@/pages/admin/AdminFoodTrends";
import AdminGeography from "@/pages/admin/AdminGeography";
import AdminIntegrations from "@/pages/admin/AdminIntegrations";
import AdminDataOps from "@/pages/admin/AdminDataOps";
import AdminReports from "@/pages/admin/AdminReports";
import AdminSwipeSessions from "@/pages/admin/AdminSwipeSessions";
import AdminPredictiveIntelligence from "@/pages/admin/AdminPredictiveIntelligence";
import AdminPartnerClickouts from "@/pages/admin/AdminPartnerClickouts";
import AdminComingSoon from "@/pages/admin/AdminComingSoon";
import AdminRecommendations from "@/pages/admin/AdminRecommendations";
import AdminExperiments from "@/pages/admin/AdminExperiments";
import AdminOperations from "@/pages/admin/AdminOperations";
import AdminSecurityAudit from "@/pages/admin/AdminSecurityAudit";
import AdminOwners from "@/pages/admin/AdminOwners";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import AdminOwnerDashboard from "@/pages/admin/AdminOwnerDashboard";
import OwnerMenu from "@/pages/admin/OwnerMenu";
import OwnerReviews from "@/pages/admin/OwnerReviews";
import OwnerPromotions from "@/pages/admin/OwnerPromotions";
import OwnerPerformance from "@/pages/admin/OwnerPerformance";
import OwnerNotifications from "@/pages/admin/OwnerNotifications";
import OwnerSettings from "@/pages/admin/OwnerSettings";
import OwnerBilling from "@/pages/admin/OwnerBilling";
import OwnerInsights from "@/pages/admin/OwnerInsights";
import OwnerCustomerInsights from "@/pages/admin/OwnerCustomerInsights";
import OwnerDecisionIntelligence from "@/pages/admin/OwnerDecisionIntelligence";
import OwnerDeliveryConversions from "@/pages/admin/OwnerDeliveryConversions";
import OwnerSupport from "@/pages/admin/OwnerSupport";
import AdminMapCheck from "@/pages/admin/AdminMapCheck";
import AdminPlaces from "@/pages/admin/AdminPlaces";
import AdminRestaurantEditor from "@/pages/admin/AdminRestaurantEditor";
import AdminRestaurantImport from "@/pages/admin/AdminRestaurantImport";
import AdminSessions from "@/pages/admin/AdminSessions";
import GroupResult from "@/pages/GroupResult";
import SavedPage from "@/pages/SavedPage";

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
          <Redirect to="/admin" />
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
        <Route path="/saved">
          <AnimatedPage><SavedPage /></AnimatedPage>
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
        <Route path="/owner/login">
          <OwnerLogin />
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
        <Route path="/admin/payments">
          <AdminLayout><AdminPayments /></AdminLayout>
        </Route>
        <Route path="/admin/menus">
          <AdminLayout><AdminMenus /></AdminLayout>
        </Route>
        <Route path="/admin/food-trends">
          <AdminLayout><AdminFoodTrends /></AdminLayout>
        </Route>
        <Route path="/admin/geography">
          <AdminLayout><AdminGeography /></AdminLayout>
        </Route>
        <Route path="/admin/integrations">
          <AdminLayout><AdminIntegrations /></AdminLayout>
        </Route>
        <Route path="/admin/data-ops">
          <AdminLayout><AdminDataOps /></AdminLayout>
        </Route>
        <Route path="/admin/reports">
          <AdminLayout><AdminReports /></AdminLayout>
        </Route>
        <Route path="/admin/swipe-sessions">
          <AdminLayout><AdminSwipeSessions /></AdminLayout>
        </Route>
        <Route path="/admin/predictive-intelligence">
          <AdminLayout><AdminPredictiveIntelligence /></AdminLayout>
        </Route>
        <Route path="/admin/partner-clickouts">
          <AdminLayout><AdminPartnerClickouts /></AdminLayout>
        </Route>
        <Route path="/admin/coming-soon">
          <AdminLayout><AdminComingSoon title="Coming Soon" description="Additional admin tools are in progress." icon={Clock} phase="Phase 2" /></AdminLayout>
        </Route>
        <Route path="/admin/recommendations">
          <AdminLayout><AdminRecommendations /></AdminLayout>
        </Route>
        <Route path="/admin/experiments">
          <AdminLayout><AdminExperiments /></AdminLayout>
        </Route>
        <Route path="/admin/operations">
          <AdminLayout><AdminOperations /></AdminLayout>
        </Route>
        <Route path="/admin/security-audit">
          <AdminLayout><AdminSecurityAudit /></AdminLayout>
        </Route>
        <Route path="/admin/config">
          <AdminLayout><AdminConfig /></AdminLayout>
        </Route>
        <Route path="/admin/owners">
          <AdminLayout><AdminOwners /></AdminLayout>
        </Route>
        <Route path="/admin/audit-logs">
          <AdminLayout><AdminAuditLogs /></AdminLayout>
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
        <Route path="/admin/sessions">
          <AdminSessions />
        </Route>
        <Route path="/admin/places">
          <AdminPlaces />
        </Route>
        <Route path="/admin/my-restaurant">
          <AdminLayout><AdminOwnerDashboard /></AdminLayout>
        </Route>
        <Route path="/admin/owner/menu">
          <AdminLayout><OwnerMenu /></AdminLayout>
        </Route>
        <Route path="/admin/owner/reviews">
          <AdminLayout><OwnerReviews /></AdminLayout>
        </Route>
        <Route path="/admin/owner/promotions">
          <AdminLayout><OwnerPromotions /></AdminLayout>
        </Route>
        <Route path="/admin/owner/performance">
          <AdminLayout><OwnerPerformance /></AdminLayout>
        </Route>
        <Route path="/admin/owner/notifications">
          <AdminLayout><OwnerNotifications /></AdminLayout>
        </Route>
        <Route path="/admin/owner/settings">
          <AdminLayout><OwnerSettings /></AdminLayout>
        </Route>
        <Route path="/admin/owner/billing">
          <AdminLayout><OwnerBilling /></AdminLayout>
        </Route>
        <Route path="/admin/owner/insights">
          <AdminLayout><OwnerInsights /></AdminLayout>
        </Route>
        <Route path="/admin/owner/customer-insights">
          <AdminLayout><OwnerCustomerInsights /></AdminLayout>
        </Route>
        <Route path="/admin/owner/decision-intelligence">
          <AdminLayout><OwnerDecisionIntelligence /></AdminLayout>
        </Route>
        <Route path="/admin/owner/delivery-conversions">
          <AdminLayout><OwnerDeliveryConversions /></AdminLayout>
        </Route>
        <Route path="/admin/owner/support">
          <AdminLayout><OwnerSupport /></AdminLayout>
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
