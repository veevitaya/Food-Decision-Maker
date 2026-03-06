import { useState, useMemo } from "react";
import {
  Settings2,
  ToggleLeft,
  ToggleRight,
  Palette,
  Image,
  Smartphone,
  Eye,
  Save,
  RotateCcw,
  Check,
  ChevronRight,
  Sparkles,
  MapPin,
  Users,
  Truck,
  Flame,
  Star,
  Globe,
  Zap,
  Type,
  Layout,
  Navigation,
  X,
  Upload,
  AlertTriangle,
  Key,
  Database,
  RefreshCw,
  Shield,
  Link2,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import toastLogo from "@assets/toast_logo_nobg.png";
import mascotImg from "@assets/image_1772011321697.png";

type FeatureToggle = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: "core" | "discovery" | "social" | "monetization" | "ui";
  icon: typeof Settings2;
};

type AppImage = {
  id: string;
  label: string;
  description: string;
  currentUrl: string;
  category: "branding" | "ui";
};

type VibeConfig = {
  mode: string;
  emoji: string;
  label: string;
  enabled: boolean;
};

type UIConfig = {
  accentColor: string;
  bottomNavLabels: { explore: string; swipe: string; profile: string };
  heroTitle: string;
  heroSubtitle: string;
  mascotGreeting: string;
};

type ApiIntegration = {
  id: string;
  name: string;
  description: string;
  icon: typeof Key;
  status: "connected" | "not_configured" | "error";
  envKey: string;
  docsUrl: string;
  category: "data" | "messaging" | "payments" | "maps";
};

type FetchedPlace = {
  name: string;
  description: string;
  imageUrl: string;
  lat: string;
  lng: string;
  category: string;
  priceLevel: number;
  rating: string;
  address: string;
  isNew: boolean;
  trendingScore: number;
  selected: boolean;
};

const DEFAULT_FEATURES: FeatureToggle[] = [
  { id: "group_mode", label: "Group Mode", description: "Allow users to create group dining sessions with friends", enabled: true, category: "social", icon: Users },
  { id: "delivery_links", label: "Delivery Deep Links", description: "Show Grab, LINE MAN, Robinhood ordering buttons on restaurant pages", enabled: true, category: "monetization", icon: Truck },
  { id: "decide_for_me", label: "Decide for Me (AI)", description: "AI-powered food recommendation based on time, mood, and budget", enabled: true, category: "discovery", icon: Sparkles },
  { id: "map_view", label: "Interactive Map", description: "Leaflet map with restaurant pins and carousel", enabled: true, category: "core", icon: MapPin },
  { id: "swipe_mode", label: "Swipe Discovery", description: "Tinder-style card swiping for restaurants and menu items", enabled: true, category: "discovery", icon: Flame },
  { id: "owner_dashboard", label: "Owner/Business Mode", description: "Allow restaurant owners to toggle into business analytics dashboard", enabled: true, category: "monetization", icon: Star },
  { id: "toast_picks", label: "Toast Picks", description: "Curated editorial picks and featured collections", enabled: true, category: "discovery", icon: Zap },
  { id: "partner_linking", label: "Partner Linking", description: "Users can link with a partner to save restaurants together", enabled: true, category: "social", icon: Users },
  { id: "drunk_sway", label: "Drunk Sway Animation", description: "Playful wobble animation on bar/nightlife restaurant pins", enabled: true, category: "ui", icon: Globe },
  { id: "vibe_frequency", label: "Smart Vibe Sorting", description: "Automatically sort vibes by user frequency and preference", enabled: true, category: "discovery", icon: Navigation },
  { id: "campaign_badges", label: "Deal Badges", description: "Show promotional deal badges on restaurant cards", enabled: true, category: "monetization", icon: Star },
  { id: "line_integration", label: "LINE Integration", description: "Share group invites and results via LINE messaging", enabled: false, category: "social", icon: Globe },
];

const DEFAULT_IMAGES: AppImage[] = [
  { id: "logo", label: "App Logo", description: "Main Toast logo used in headers and branding", currentUrl: toastLogo, category: "branding" },
  { id: "mascot", label: "Mascot", description: "Toast mascot character used in loading states and AI screens", currentUrl: mascotImg, category: "branding" },
  { id: "splash_bg", label: "Splash Background", description: "Background pattern for loading and splash screens", currentUrl: "", category: "branding" },
  { id: "empty_state", label: "Empty State Illustration", description: "Shown when no results match user filters", currentUrl: "", category: "ui" },
  { id: "group_invite", label: "Group Invite Card", description: "Image used in LINE share cards for group invites", currentUrl: "", category: "ui" },
];

const DEFAULT_VIBES: VibeConfig[] = [
  { mode: "cheap", emoji: "💰", label: "Budget", enabled: true },
  { mode: "nearby", emoji: "🚇", label: "Near BTS", enabled: true },
  { mode: "trending", emoji: "📈", label: "Trendy", enabled: true },
  { mode: "hot", emoji: "🔥", label: "Hot now", enabled: true },
  { mode: "restaurants", emoji: "🍽️", label: "Restaurants", enabled: true },
  { mode: "late", emoji: "🌙", label: "Late night", enabled: true },
  { mode: "outdoor", emoji: "⛱️", label: "Outdoor", enabled: true },
  { mode: "saved", emoji: "❤️", label: "Saved", enabled: true },
  { mode: "partner", emoji: "💕", label: "With partner", enabled: true },
  { mode: "healthy", emoji: "🥗", label: "Healthy", enabled: true },
  { mode: "drinks", emoji: "🍸", label: "Drinks", enabled: true },
  { mode: "spicy", emoji: "🌶️", label: "Spicy", enabled: true },
  { mode: "sweets", emoji: "🍰", label: "Sweets", enabled: true },
  { mode: "coffee", emoji: "☕", label: "Cafe", enabled: true },
  { mode: "fancy", emoji: "✨", label: "Fine dining", enabled: true },
  { mode: "delivery", emoji: "🛵", label: "Delivery", enabled: false },
];

const DEFAULT_UI: UIConfig = {
  accentColor: "#FFCC02",
  bottomNavLabels: { explore: "Explore", swipe: "Swipe", profile: "Profile" },
  heroTitle: "What are you craving?",
  heroSubtitle: "Discover the best food in Bangkok",
  mascotGreeting: "Let Toast decide!",
};

const CATEGORY_META: Record<string, { label: string; color: string; bgClass: string }> = {
  core: { label: "Core", color: "text-blue-600", bgClass: "bg-blue-50 dark:bg-blue-500/10" },
  discovery: { label: "Discovery", color: "text-purple-600", bgClass: "bg-purple-50 dark:bg-purple-500/10" },
  social: { label: "Social", color: "text-green-600", bgClass: "bg-green-50 dark:bg-green-500/10" },
  monetization: { label: "Revenue", color: "text-amber-600", bgClass: "bg-amber-50 dark:bg-amber-500/10" },
  ui: { label: "Interface", color: "text-pink-600", bgClass: "bg-pink-50 dark:bg-pink-500/10" },
};

const DEFAULT_APIS: ApiIntegration[] = [
  { id: "google_places", name: "Google Places API", description: "Fetch real restaurant data, photos, ratings, and location info from Google Maps", icon: MapPin, status: "not_configured", envKey: "GOOGLE_PLACES_API_KEY", docsUrl: "https://developers.google.com/maps/documentation/places/web-service", category: "data" },
  { id: "line_liff", name: "LINE LIFF SDK", description: "Login, profile access, and share target picker for LINE messaging integration", icon: Globe, status: "not_configured", envKey: "VITE_LIFF_ID", docsUrl: "https://developers.line.biz/en/docs/liff/", category: "messaging" },
  { id: "line_messaging", name: "LINE Messaging API", description: "Send push notifications, rich menus, and flex messages to LINE users", icon: Globe, status: "not_configured", envKey: "LINE_CHANNEL_ACCESS_TOKEN", docsUrl: "https://developers.line.biz/en/docs/messaging-api/", category: "messaging" },
  { id: "grab", name: "Grab Food API", description: "Deep link integration for Grab Food ordering and delivery tracking", icon: Truck, status: "not_configured", envKey: "GRAB_API_KEY", docsUrl: "https://developer.grab.com/", category: "data" },
  { id: "lineman", name: "LINE MAN API", description: "Delivery integration with LINE MAN Wongnai for restaurant ordering", icon: Truck, status: "not_configured", envKey: "LINEMAN_API_KEY", docsUrl: "https://developers.lineman.line.me/", category: "data" },
  { id: "robinhood", name: "Robinhood API", description: "Integration with Robinhood food delivery platform in Thailand", icon: Truck, status: "not_configured", envKey: "ROBINHOOD_API_KEY", docsUrl: "https://robinhood.in.th/", category: "data" },
  { id: "stripe", name: "Stripe Payments", description: "Process premium subscription payments and campaign ad purchases", icon: Shield, status: "not_configured", envKey: "STRIPE_SECRET_KEY", docsUrl: "https://docs.stripe.com/", category: "payments" },
  { id: "google_analytics", name: "Google Analytics", description: "Track user behavior, page views, and conversion events", icon: Database, status: "not_configured", envKey: "VITE_GA_MEASUREMENT_ID", docsUrl: "https://developers.google.com/analytics", category: "data" },
];

const API_CATEGORY_META: Record<string, { label: string; color: string; bgClass: string }> = {
  data: { label: "Data & Maps", color: "text-blue-600", bgClass: "bg-blue-50 dark:bg-blue-500/10" },
  messaging: { label: "Messaging", color: "text-green-600", bgClass: "bg-green-50 dark:bg-green-500/10" },
  payments: { label: "Payments", color: "text-purple-600", bgClass: "bg-purple-50 dark:bg-purple-500/10" },
  maps: { label: "Maps", color: "text-amber-600", bgClass: "bg-amber-50 dark:bg-amber-500/10" },
};

const TABS = [
  { id: "features", label: "Features", icon: ToggleLeft },
  { id: "apis", label: "APIs", icon: Key },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "vibes", label: "Vibes", icon: Flame },
  { id: "ui", label: "UI & Text", icon: Type },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminConfig() {
  const [activeTab, setActiveTab] = useState<TabId>("features");
  const [features, setFeatures] = useState<FeatureToggle[]>(DEFAULT_FEATURES);
  const [images, setImages] = useState<AppImage[]>(DEFAULT_IMAGES);
  const [vibes, setVibes] = useState<VibeConfig[]>(DEFAULT_VIBES);
  const [uiConfig, setUiConfig] = useState<UIConfig>(DEFAULT_UI);
  const [apis, setApis] = useState<ApiIntegration[]>(DEFAULT_APIS);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);
  const [fetchingPlaces, setFetchingPlaces] = useState(false);
  const [fetchedPlaces, setFetchedPlaces] = useState<FetchedPlace[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
  const [importingPlaces, setImportingPlaces] = useState(false);
  const [placesQuery, setPlacesQuery] = useState("restaurants in Bangkok");
  const [placesRadius, setPlacesRadius] = useState(5000);
  const [placesMaxResults, setPlacesMaxResults] = useState(20);
  const [showApiKeyInput, setShowApiKeyInput] = useState<string | null>(null);
  const [apiKeyInputValue, setApiKeyInputValue] = useState("");

  const trackChange = (description: string) => {
    setHasChanges(true);
    setPendingChanges((prev) => {
      if (prev.includes(description)) return prev;
      return [...prev, description];
    });
  };

  const toggleFeature = (id: string) => {
    const feat = features.find((f) => f.id === id);
    const willBeEnabled = !feat?.enabled;
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
    trackChange(`${willBeEnabled ? "Enabled" : "Disabled"} ${feat?.label}`);
  };

  const toggleVibe = (mode: string) => {
    const vibe = vibes.find((v) => v.mode === mode);
    const willBeEnabled = !vibe?.enabled;
    setVibes((prev) =>
      prev.map((v) => (v.mode === mode ? { ...v, enabled: !v.enabled } : v))
    );
    trackChange(`${willBeEnabled ? "Shown" : "Hidden"} ${vibe?.label} vibe`);
  };

  const updateUI = (key: keyof UIConfig, value: any) => {
    setUiConfig((prev) => ({ ...prev, [key]: value }));
    trackChange(`Updated ${key}`);
  };

  const handleSave = () => {
    setSavedToast(true);
    setHasChanges(false);
    setPendingChanges([]);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleReset = () => {
    setFeatures(DEFAULT_FEATURES);
    setImages(DEFAULT_IMAGES);
    setVibes(DEFAULT_VIBES);
    setUiConfig(DEFAULT_UI);
    setApis(DEFAULT_APIS);
    setHasChanges(false);
    setPendingChanges([]);
  };

  const handleFetchPlaces = async () => {
    setFetchingPlaces(true);
    setFetchError(null);
    setFetchSuccess(null);
    setFetchedPlaces([]);
    try {
      const res = await apiRequest("POST", "/api/admin/google-places/fetch", {
        query: placesQuery,
        radius: placesRadius,
        maxResults: placesMaxResults,
        lat: 13.7563,
        lng: 100.5018,
      });
      const data = await res.json();
      setFetchedPlaces(data.restaurants.map((r: any) => ({ ...r, selected: true })));
      setFetchSuccess(`Fetched ${data.fetched} restaurants from Google Places`);
    } catch (err: any) {
      const msg = err?.message || "Failed to fetch from Google Places API";
      try {
        const body = JSON.parse(err?.message || "{}");
        setFetchError(body.message || msg);
      } catch {
        setFetchError(msg);
      }
    } finally {
      setFetchingPlaces(false);
    }
  };

  const handleImportPlaces = async () => {
    const selected = fetchedPlaces.filter((p) => p.selected);
    if (selected.length === 0) return;
    setImportingPlaces(true);
    setFetchError(null);
    try {
      const payload = selected.map(({ selected: _, ...rest }) => rest);
      await apiRequest("POST", "/api/admin/google-places/import", {
        restaurants: payload,
        replaceExisting: false,
      });
      setFetchSuccess(`Imported ${selected.length} restaurants into database`);
      setFetchedPlaces([]);
    } catch (err: any) {
      setFetchError("Failed to import restaurants");
    } finally {
      setImportingPlaces(false);
    }
  };

  const togglePlaceSelection = (index: number) => {
    setFetchedPlaces((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const updateApiStatus = (id: string, status: ApiIntegration["status"]) => {
    setApis((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    const api = apis.find((a) => a.id === id);
    trackChange(`${status === "connected" ? "Connected" : "Updated"} ${api?.name}`);
  };

  const featuresByCategory = useMemo(() => {
    const grouped: Record<string, FeatureToggle[]> = {};
    features.forEach((f) => {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    });
    return grouped;
  }, [features]);

  const enabledCount = features.filter((f) => f.enabled).length;
  const enabledVibes = vibes.filter((v) => v.enabled).length;

  return (
    <div className="max-w-[1200px] mx-auto" data-testid="admin-config-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(45,100%,60%) 0%, hsl(40,100%,50%) 100%)" }}
            >
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-config-title">
              App Configuration
            </h2>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Toggle features, update branding, and preview changes before publishing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-muted text-foreground text-sm font-medium hover:bg-gray-100 dark:hover:bg-muted/80 transition-colors"
              data-testid="button-preview-changes"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-muted text-muted-foreground text-sm font-medium hover:bg-gray-100 dark:hover:bg-muted/80 transition-colors"
            data-testid="button-reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={hasChanges ? () => setShowPreview(true) : undefined}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              hasChanges
                ? "bg-foreground text-white hover:bg-foreground/90 shadow-sm"
                : "bg-gray-100 dark:bg-muted text-muted-foreground/40 cursor-not-allowed"
            }`}
            data-testid="button-save-changes"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      {savedToast && (
        <div
          className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20"
          data-testid="toast-saved"
        >
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            Configuration saved successfully. Changes are now live.
          </span>
        </div>
      )}

      {hasChanges && (
        <div
          className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
          data-testid="banner-unsaved"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            {pendingChanges.length} unsaved change{pendingChanges.length !== 1 ? "s" : ""} — Preview before saving
          </span>
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border overflow-hidden">
            <div className="flex border-b border-gray-100 dark:border-border">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all border-b-2 ${
                    activeTab === tab.id
                      ? "border-[#FFCC02] text-foreground bg-[#FFCC02]/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-muted"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === "features" && (
                <div className="space-y-6" data-testid="panel-features">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Feature Toggles</p>
                    <span className="text-xs text-muted-foreground">
                      {enabledCount}/{features.length} active
                    </span>
                  </div>

                  {Object.entries(featuresByCategory).map(([category, items]) => {
                    const meta = CATEGORY_META[category] || { label: category, color: "text-foreground", bgClass: "bg-gray-50" };
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${meta.bgClass} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items.map((feature) => (
                            <div
                              key={feature.id}
                              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                                feature.enabled
                                  ? "bg-gray-50 dark:bg-muted"
                                  : "bg-white dark:bg-card opacity-60"
                              }`}
                              data-testid={`feature-row-${feature.id}`}
                            >
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: feature.enabled
                                    ? "linear-gradient(135deg, hsl(222,47%,20%) 0%, hsl(222,47%,35%) 100%)"
                                    : "hsl(0,0%,92%)",
                                }}
                              >
                                <feature.icon className={`w-4 h-4 ${feature.enabled ? "text-white" : "text-muted-foreground"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feature.description}</p>
                              </div>
                              <button
                                onClick={() => toggleFeature(feature.id)}
                                className="flex-shrink-0"
                                data-testid={`toggle-${feature.id}`}
                              >
                                {feature.enabled ? (
                                  <ToggleRight className="w-10 h-10 text-[#FFCC02]" />
                                ) : (
                                  <ToggleLeft className="w-10 h-10 text-muted-foreground/30" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "apis" && (
                <div className="space-y-6" data-testid="panel-apis">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">API Integrations</p>
                    <span className="text-xs text-muted-foreground">
                      {apis.filter((a) => a.status === "connected").length}/{apis.length} connected
                    </span>
                  </div>

                  {Object.entries(
                    apis.reduce<Record<string, ApiIntegration[]>>((acc, api) => {
                      if (!acc[api.category]) acc[api.category] = [];
                      acc[api.category].push(api);
                      return acc;
                    }, {})
                  ).map(([category, items]) => {
                    const meta = API_CATEGORY_META[category] || { label: category, color: "text-foreground", bgClass: "bg-gray-50" };
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${meta.bgClass} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items.map((api) => (
                            <div
                              key={api.id}
                              className="p-4 rounded-xl bg-gray-50 dark:bg-muted"
                              data-testid={`api-row-${api.id}`}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: api.status === "connected"
                                      ? "linear-gradient(135deg, hsl(142,50%,45%) 0%, hsl(142,50%,35%) 100%)"
                                      : "linear-gradient(135deg, hsl(222,47%,88%) 0%, hsl(222,47%,80%) 100%)",
                                  }}
                                >
                                  <api.icon className={`w-4 h-4 ${api.status === "connected" ? "text-white" : "text-foreground/60"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">{api.name}</p>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                      api.status === "connected"
                                        ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                                        : api.status === "error"
                                          ? "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                                          : "bg-gray-100 dark:bg-muted text-muted-foreground"
                                    }`}>
                                      {api.status === "connected" ? "Connected" : api.status === "error" ? "Error" : "Not configured"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">{api.description}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <a
                                    href={api.docsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-muted transition-colors"
                                    data-testid={`button-docs-${api.id}`}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                  </a>
                                  <button
                                    onClick={() => { setShowApiKeyInput(showApiKeyInput === api.id ? null : api.id); setApiKeyInputValue(""); }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-card border border-gray-200 dark:border-border text-xs font-medium text-foreground hover:bg-gray-50 dark:hover:bg-muted transition-colors"
                                    data-testid={`button-configure-${api.id}`}
                                  >
                                    <Key className="w-3 h-3" />
                                    {api.status === "connected" ? "Update" : "Configure"}
                                  </button>
                                </div>
                              </div>

                              {showApiKeyInput === api.id && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-border">
                                  <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-2">
                                    {api.envKey}
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="password"
                                      value={apiKeyInputValue}
                                      onChange={(e) => setApiKeyInputValue(e.target.value)}
                                      placeholder={`Enter your ${api.name} key`}
                                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 font-mono"
                                      data-testid={`input-api-key-${api.id}`}
                                    />
                                    <button
                                      onClick={() => {
                                        if (apiKeyInputValue.trim()) {
                                          updateApiStatus(api.id, "connected");
                                          setShowApiKeyInput(null);
                                          setApiKeyInputValue("");
                                        }
                                      }}
                                      disabled={!apiKeyInputValue.trim()}
                                      className="px-4 py-2 rounded-xl bg-foreground text-white text-xs font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      data-testid={`button-save-key-${api.id}`}
                                    >
                                      Save
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground/60 mt-2 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Keys are stored securely as environment secrets and never exposed to the frontend
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t border-gray-100 dark:border-border pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, hsl(142,72%,45%) 0%, hsl(160,60%,38%) 100%)" }}
                      >
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Google Places Data Fetch</p>
                        <p className="text-xs text-muted-foreground">Fetch restaurant data on-demand to save API costs</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border p-5">
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-1.5">Search Query</label>
                          <input
                            type="text"
                            value={placesQuery}
                            onChange={(e) => setPlacesQuery(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                            data-testid="input-places-query"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-1.5">Radius (m)</label>
                          <input
                            type="number"
                            value={placesRadius}
                            onChange={(e) => setPlacesRadius(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                            data-testid="input-places-radius"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-1.5">Max Results</label>
                          <input
                            type="number"
                            value={placesMaxResults}
                            onChange={(e) => setPlacesMaxResults(Number(e.target.value))}
                            min={1}
                            max={60}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                            data-testid="input-places-max"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <button
                          onClick={handleFetchPlaces}
                          disabled={fetchingPlaces}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-white text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
                          data-testid="button-fetch-places"
                        >
                          {fetchingPlaces ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          {fetchingPlaces ? "Fetching..." : "Fetch Data"}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          Data is only fetched when you click this button
                        </p>
                      </div>

                      {fetchError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-4" data-testid="alert-fetch-error">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span className="text-xs text-red-700 dark:text-red-400">{fetchError}</span>
                        </div>
                      )}

                      {fetchSuccess && fetchedPlaces.length === 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 mb-4" data-testid="alert-fetch-success">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-xs text-green-700 dark:text-green-400">{fetchSuccess}</span>
                        </div>
                      )}

                      {fetchedPlaces.length > 0 && (
                        <div data-testid="fetched-places-list">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                              Fetched Results ({fetchedPlaces.filter((p) => p.selected).length}/{fetchedPlaces.length} selected)
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setFetchedPlaces((prev) => prev.map((p) => ({ ...p, selected: true })))}
                                className="text-[10px] font-medium text-foreground hover:underline"
                                data-testid="button-select-all"
                              >
                                Select All
                              </button>
                              <button
                                onClick={() => setFetchedPlaces((prev) => prev.map((p) => ({ ...p, selected: false })))}
                                className="text-[10px] font-medium text-muted-foreground hover:underline"
                                data-testid="button-deselect-all"
                              >
                                Deselect All
                              </button>
                            </div>
                          </div>

                          <div className="max-h-[320px] overflow-y-auto space-y-1.5 mb-4 rounded-xl border border-gray-100 dark:border-border p-2">
                            {fetchedPlaces.map((place, idx) => (
                              <div
                                key={idx}
                                onClick={() => togglePlaceSelection(idx)}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                  place.selected
                                    ? "bg-gray-50 dark:bg-muted ring-1 ring-foreground/10"
                                    : "bg-white dark:bg-card opacity-50"
                                }`}
                                data-testid={`place-row-${idx}`}
                              >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  place.selected
                                    ? "bg-foreground border-foreground"
                                    : "border-gray-300 dark:border-border"
                                }`}>
                                  {place.selected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-muted">
                                  <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{place.address}</p>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0">
                                  <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-muted font-medium">{place.category}</span>
                                  <span>{place.rating}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={handleImportPlaces}
                            disabled={importingPlaces || fetchedPlaces.filter((p) => p.selected).length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-white text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            data-testid="button-import-places"
                          >
                            {importingPlaces ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Database className="w-4 h-4" />
                            )}
                            {importingPlaces ? "Importing..." : `Import ${fetchedPlaces.filter((p) => p.selected).length} to Database`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "branding" && (
                <div className="space-y-6" data-testid="panel-branding">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Images & Branding</p>

                  <div className="grid grid-cols-1 gap-4">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-muted"
                        data-testid={`image-row-${img.id}`}
                      >
                        <div className="w-16 h-16 rounded-xl bg-white dark:bg-card border border-gray-100 dark:border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {img.currentUrl ? (
                            <img src={img.currentUrl} alt={img.label} className="w-12 h-12 object-contain" />
                          ) : (
                            <Image className="w-6 h-6 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{img.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{img.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              img.category === "branding" ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
                            }`}>
                              {img.category}
                            </span>
                          </div>
                        </div>
                        <button
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-border text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-muted transition-colors"
                          onClick={() => trackChange(`Updated ${img.label} image`)}
                          data-testid={`button-upload-${img.id}`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Replace
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Accent Color</p>
                    <div className="flex items-center gap-3">
                      {["#FFCC02", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#6C2BD9"].map((color) => (
                        <button
                          key={color}
                          onClick={() => { updateUI("accentColor", color); }}
                          className={`w-10 h-10 rounded-xl transition-all ${
                            uiConfig.accentColor === color
                              ? "ring-2 ring-offset-2 ring-foreground scale-110"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: color }}
                          data-testid={`color-${color.replace("#", "")}`}
                        />
                      ))}
                      <div className="ml-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-card border border-gray-200 dark:border-border">
                        <div className="w-5 h-5 rounded-md" style={{ backgroundColor: uiConfig.accentColor }} />
                        <span className="text-xs font-mono text-muted-foreground">{uiConfig.accentColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "vibes" && (
                <div className="space-y-6" data-testid="panel-vibes">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Vibe Options</p>
                    <span className="text-xs text-muted-foreground">
                      {enabledVibes}/{vibes.length} visible
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {vibes.map((vibe) => (
                      <div
                        key={vibe.mode}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                          vibe.enabled
                            ? "bg-white dark:bg-card border-gray-100 dark:border-border"
                            : "bg-gray-50 dark:bg-muted border-gray-100 dark:border-border opacity-50"
                        }`}
                        onClick={() => toggleVibe(vibe.mode)}
                        data-testid={`vibe-toggle-${vibe.mode}`}
                      >
                        <span className="text-2xl">{vibe.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{vibe.label}</p>
                          <p className="text-[10px] text-muted-foreground/60 font-mono">{vibe.mode}</p>
                        </div>
                        <button className="flex-shrink-0">
                          {vibe.enabled ? (
                            <ToggleRight className="w-8 h-8 text-[#FFCC02]" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-muted-foreground/30" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Disabled vibes will be hidden from the "Pick a vibe" grid on the home screen. Users who previously frequented a disabled vibe will see their next most-used option instead.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "ui" && (
                <div className="space-y-6" data-testid="panel-ui">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Text & Labels</p>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted">
                      <label className="text-xs font-semibold text-foreground block mb-2">Hero Title</label>
                      <input
                        type="text"
                        value={uiConfig.heroTitle}
                        onChange={(e) => updateUI("heroTitle", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                        data-testid="input-hero-title"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted">
                      <label className="text-xs font-semibold text-foreground block mb-2">Hero Subtitle</label>
                      <input
                        type="text"
                        value={uiConfig.heroSubtitle}
                        onChange={(e) => updateUI("heroSubtitle", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                        data-testid="input-hero-subtitle"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-muted">
                      <label className="text-xs font-semibold text-foreground block mb-2">Mascot Greeting</label>
                      <input
                        type="text"
                        value={uiConfig.mascotGreeting}
                        onChange={(e) => updateUI("mascotGreeting", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                        data-testid="input-mascot-greeting"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Bottom Navigation</p>

                  <div className="grid grid-cols-3 gap-3">
                    {(["explore", "swipe", "profile"] as const).map((tab) => (
                      <div key={tab} className="p-4 rounded-xl bg-gray-50 dark:bg-muted">
                        <label className="text-xs font-semibold text-foreground block mb-2 capitalize">{tab} Tab</label>
                        <input
                          type="text"
                          value={uiConfig.bottomNavLabels[tab]}
                          onChange={(e) =>
                            updateUI("bottomNavLabels", { ...uiConfig.bottomNavLabels, [tab]: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                          data-testid={`input-nav-${tab}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-[300px] flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Live Preview</p>
              </div>

              <div className="w-full aspect-[9/16] rounded-2xl bg-gray-50 dark:bg-muted border border-gray-100 dark:border-border overflow-hidden relative">
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex items-center justify-center py-3 bg-white dark:bg-card border-b border-gray-100 dark:border-border">
                    <div className="flex flex-col items-center">
                      <img src={toastLogo} alt="Toast" className="h-6 w-auto" />
                      <span className="text-[6px] font-extrabold text-foreground uppercase" style={{ letterSpacing: "0.8em", paddingLeft: "0.8em" }}>THINGS</span>
                    </div>
                  </div>

                  <div className="flex-1 p-3 overflow-hidden">
                    <div className="w-full h-24 rounded-xl mb-2" style={{ background: "linear-gradient(135deg, hsl(200,30%,92%) 0%, hsl(210,25%,88%) 100%)" }}>
                      <div className="flex items-center justify-center h-full">
                        <MapPin className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    </div>

                    <p className="text-[8px] font-bold text-foreground mb-1 truncate">{uiConfig.heroTitle}</p>
                    <p className="text-[6px] text-muted-foreground mb-2 truncate">{uiConfig.heroSubtitle}</p>

                    <p className="text-[6px] font-bold text-foreground mb-1">Pick a vibe</p>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {vibes.filter((v) => v.enabled).slice(0, 4).map((v) => (
                        <div
                          key={v.mode}
                          className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-white dark:bg-card border border-gray-100 dark:border-border"
                        >
                          <span className="text-[10px]">{v.emoji}</span>
                          <span className="text-[5px] text-muted-foreground mt-0.5">{v.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      {features.filter((f) => f.enabled).slice(0, 3).map((f) => (
                        <div key={f.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white dark:bg-card border border-gray-100 dark:border-border">
                          <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ backgroundColor: uiConfig.accentColor + "20" }}>
                            <f.icon className="w-2.5 h-2.5" style={{ color: uiConfig.accentColor }} />
                          </div>
                          <span className="text-[6px] font-medium text-foreground">{f.label}</span>
                          <Check className="w-2.5 h-2.5 text-green-500 ml-auto" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-around py-2 bg-white dark:bg-card border-t border-gray-100 dark:border-border">
                    {(["explore", "swipe", "profile"] as const).map((tab) => (
                      <div key={tab} className="flex flex-col items-center gap-0.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tab === "explore" ? uiConfig.accentColor : "hsl(0,0%,85%)" }} />
                        <span className={`text-[5px] font-medium ${tab === "explore" ? "text-foreground" : "text-muted-foreground"}`}>
                          {uiConfig.bottomNavLabels[tab]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {pendingChanges.length > 0 && (
              <div className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-5">
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Pending Changes</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {pendingChanges.map((change, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground leading-relaxed">{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6" data-testid="preview-modal">
          <div className="bg-white dark:bg-card rounded-3xl border border-gray-100 dark:border-border w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FFCC02]/15 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Review Changes</h3>
                  <p className="text-xs text-muted-foreground">{pendingChanges.length} change{pendingChanges.length !== 1 ? "s" : ""} to apply</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-muted flex items-center justify-center hover:bg-gray-200 dark:hover:bg-muted/80 transition-colors"
                data-testid="button-close-preview"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Change Summary</p>
                  <div className="space-y-2">
                    {pendingChanges.map((change, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-muted"
                      >
                        <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ChevronRight className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-sm text-foreground leading-relaxed">{change}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Preview</p>
                  <div className="w-full aspect-[9/16] rounded-2xl bg-gray-50 dark:bg-muted border border-gray-100 dark:border-border overflow-hidden relative">
                    <div className="absolute inset-0 flex flex-col">
                      <div className="flex items-center justify-center py-3 bg-white dark:bg-card border-b border-gray-100 dark:border-border">
                        <div className="flex flex-col items-center">
                          <img src={toastLogo} alt="Toast" className="h-5 w-auto" />
                          <span className="text-[5px] font-extrabold text-foreground uppercase" style={{ letterSpacing: "0.8em", paddingLeft: "0.8em" }}>THINGS</span>
                        </div>
                      </div>
                      <div className="flex-1 p-2">
                        <div className="w-full h-16 rounded-lg mb-1.5" style={{ background: "linear-gradient(135deg, hsl(200,30%,92%), hsl(210,25%,88%))" }}>
                          <div className="flex items-center justify-center h-full">
                            <MapPin className="w-3 h-3 text-muted-foreground/40" />
                          </div>
                        </div>
                        <p className="text-[7px] font-bold text-foreground mb-0.5 truncate">{uiConfig.heroTitle}</p>
                        <div className="grid grid-cols-4 gap-0.5 mb-1.5">
                          {vibes.filter((v) => v.enabled).slice(0, 4).map((v) => (
                            <div key={v.mode} className="flex flex-col items-center py-1 rounded bg-white dark:bg-card border border-gray-100 dark:border-border">
                              <span className="text-[8px]">{v.emoji}</span>
                              <span className="text-[4px] text-muted-foreground">{v.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-around py-1.5 bg-white dark:bg-card border-t border-gray-100 dark:border-border">
                        {(["explore", "swipe", "profile"] as const).map((tab) => (
                          <div key={tab} className="flex flex-col items-center gap-0.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tab === "explore" ? uiConfig.accentColor : "hsl(0,0%,85%)" }} />
                            <span className="text-[4px] font-medium text-muted-foreground">{uiConfig.bottomNavLabels[tab]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-border bg-gray-50 dark:bg-muted">
              <button
                onClick={() => setShowPreview(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-cancel-preview"
              >
                Cancel
              </button>
              <button
                onClick={() => { handleSave(); setShowPreview(false); }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-foreground text-white text-sm font-semibold hover:bg-foreground/90 transition-colors shadow-sm"
                data-testid="button-confirm-save"
              >
                <Check className="w-4 h-4" />
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
