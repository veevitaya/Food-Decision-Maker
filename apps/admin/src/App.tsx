import { Switch, Route, useLocation, Redirect } from "wouter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";

// ── Admin (superadmin / staff) ──────────────────────────────────────────────
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserDetail from "@/pages/admin/AdminUserDetail";
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
import AdminMlStatus from "@/pages/admin/AdminMlStatus";
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
import AdminMapCheck from "@/pages/admin/AdminMapCheck";
import AdminPlaces from "@/pages/admin/AdminPlaces";
import AdminRestaurantEditor from "@/pages/admin/AdminRestaurantEditor";
import AdminRestaurantImport from "@/pages/admin/AdminRestaurantImport";
import AdminSessions from "@/pages/admin/AdminSessions";
// ── Owner (restaurant owners) ────────────────────────────────────────────────
import OwnerLogin from "@/pages/owner/OwnerLogin";
import OwnerDashboard from "@/pages/owner/OwnerDashboard";
import OwnerMenu from "@/pages/owner/OwnerMenu";
import OwnerReviews from "@/pages/owner/OwnerReviews";
import OwnerPromotions from "@/pages/owner/OwnerPromotions";
import OwnerCampaigns from "@/pages/owner/OwnerCampaigns";
import OwnerPerformance from "@/pages/owner/OwnerPerformance";
import OwnerNotifications from "@/pages/owner/OwnerNotifications";
import OwnerSettings from "@/pages/owner/OwnerSettings";
import OwnerBilling from "@/pages/owner/OwnerBilling";
import OwnerInsights from "@/pages/owner/OwnerInsights";
import OwnerCustomerInsights from "@/pages/owner/OwnerCustomerInsights";
import OwnerDecisionIntelligence from "@/pages/owner/OwnerDecisionIntelligence";
import OwnerDeliveryConversions from "@/pages/owner/OwnerDeliveryConversions";
import OwnerSupport from "@/pages/owner/OwnerSupport";
import TierGate, { type OwnerTier } from "@/components/TierGate";
import { getAdminSession } from "@/pages/admin/AdminLayout";
import TestPage from "@/pages/TestPage";

function GatedRoute({ minTier, featureName, children }: { minTier: OwnerTier; featureName: string; children: React.ReactNode }) {
  const session = getAdminSession();
  return (
    <TierGate requiredTier={minTier} currentTier={session?.subscriptionTier} featureName={featureName}>
      {children}
    </TierGate>
  );
}

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
  const testRouteEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_ROUTE === "true";

  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        <Route path="/">
          <Redirect to="/admin" />
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
        <Route path="/admin/users/:lineUserId">
          <AdminLayout><AdminUserDetail /></AdminLayout>
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
        <Route path="/admin/ml-status">
          <AdminLayout><AdminMlStatus /></AdminLayout>
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
          <AdminLayout><OwnerDashboard /></AdminLayout>
        </Route>
        <Route path="/admin/owner/menu">
          <AdminLayout><OwnerMenu /></AdminLayout>
        </Route>
        <Route path="/admin/owner/reviews">
          <AdminLayout><GatedRoute minTier="growth" featureName="Reviews"><OwnerReviews /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/promotions">
          <AdminLayout><GatedRoute minTier="growth" featureName="Promotions"><OwnerPromotions /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/campaigns">
          <AdminLayout><GatedRoute minTier="growth" featureName="Campaigns"><OwnerCampaigns /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/performance">
          <AdminLayout><GatedRoute minTier="growth" featureName="Performance"><OwnerPerformance /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/notifications">
          <AdminLayout><GatedRoute minTier="pro" featureName="Notifications"><OwnerNotifications /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/settings">
          <AdminLayout><OwnerSettings /></AdminLayout>
        </Route>
        <Route path="/admin/owner/billing">
          <AdminLayout><OwnerBilling /></AdminLayout>
        </Route>
        <Route path="/admin/owner/insights">
          <AdminLayout><GatedRoute minTier="pro" featureName="AI Insights"><OwnerInsights /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/customer-insights">
          <AdminLayout><GatedRoute minTier="pro" featureName="Customer Insights"><OwnerCustomerInsights /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/decision-intelligence">
          <AdminLayout><GatedRoute minTier="enterprise" featureName="Decision Intelligence"><OwnerDecisionIntelligence /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/delivery-conversions">
          <AdminLayout><GatedRoute minTier="pro" featureName="Delivery Conversions"><OwnerDeliveryConversions /></GatedRoute></AdminLayout>
        </Route>
        <Route path="/admin/owner/support">
          <AdminLayout><OwnerSupport /></AdminLayout>
        </Route>
        <Route path="/admin">
          <Redirect to="/admin/dashboard" />
        </Route>
        <Route path="/test">
          {testRouteEnabled ? <TestPage /> : <Redirect to="/admin/dashboard" />}
        </Route>
        <Route>
          <AnimatedPage>
            <div className="flex items-center justify-center h-64 text-gray-400">404 — Page not found</div>
          </AnimatedPage>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

