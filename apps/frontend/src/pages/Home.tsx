import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useDrag } from "@use-gesture/react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search, X, MapPin, ArrowRight, ChevronDown,
  Sparkles, SlidersHorizontal, Users, Navigation, Grid3X3,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SessionBar } from "@/components/SessionBar";
import { RestaurantRow } from "@/components/RestaurantRow";
import { InteractiveMap } from "@/components/InteractiveMap";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { useRestaurants, useSuggestions } from "@/hooks/use-restaurants";
import { useVibeFrequency } from "@/hooks/use-vibe-frequency";
import { SaveBucketPicker } from "@/components/SaveBucketPicker";
import { FoodIconFromEmoji } from "@/components/FoodIcon";
import { PublicBannerSlot } from "@/components/PublicBannerSlot";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { useLineProfile } from "@/lib/useLineProfile";
import { useSessions } from "@/lib/sessionStore";
import { trackEvent } from "@/lib/analytics";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useBranding } from "@/hooks/use-branding";
import { useVibesConfig } from "@/hooks/use-vibes-config";
import { usePartnerStatus } from "@/hooks/use-partner-status";
import { initLiff, isLiffAvailable } from "@/lib/liff";
import mascotPath from "@assets/toast_mascot_nobg.png";
import { useLanguage } from "@/i18n/LanguageProvider";

const toastLogoPath = "/api/uploads/toast_logo_.png";

const FILTER_OPTIONS = {
  sortBy: [
    { value: "rating", labelKey: "filter.top_rated" },
    { value: "distance", labelKey: "filter.nearest" },
    { value: "price_low", labelKey: "filter.price_low" },
    { value: "price_high", labelKey: "filter.price_high" },
    { value: "trending", labelKey: "filter.trending" },
  ],
  priceRange: [
    { value: "1", label: "฿" },
    { value: "2", label: "฿฿" },
    { value: "3", label: "฿฿฿" },
    { value: "4", label: "฿฿฿฿" },
  ],
  dietary: [
    { value: "halal", labelKey: "filter.halal" },
    { value: "vegetarian", labelKey: "filter.vegetarian" },
    { value: "vegan", labelKey: "filter.vegan" },
    { value: "gluten_free", labelKey: "filter.gluten_free" },
  ],
  distance: [
    { value: "500", labelKey: "filter.500m" },
    { value: "1000", labelKey: "filter.1km" },
    { value: "3000", labelKey: "filter.3km" },
    { value: "5000", labelKey: "filter.5km" },
  ],
};

const DEFAULT_LAT = 13.7420;
const DEFAULT_LNG = 100.5400;
const HOME_LOCATION_PROMPT_KEY = "home_location_prompted_v1";

const VIBE_TILES_MAIN = [
  { mode: "trending", labelKey: "vibe.trending", emoji: "🔥", bg: "hsl(45, 55%, 94%)" },
  { mode: "hot", labelKey: "vibe.hot", emoji: "🌶️", bg: "hsl(15, 65%, 94%)" },
  { mode: "drinks", labelKey: "vibe.drinks", emoji: "🍸", bg: "hsl(280, 40%, 95%)" },
  { mode: "cheap", labelKey: "vibe.cheap", emoji: "💰", bg: "hsl(160, 40%, 94%)" },
  { mode: "healthy", labelKey: "vibe.healthy", emoji: "🥗", bg: "hsl(130, 35%, 94%)" },
  { mode: "outdoor", labelKey: "vibe.outdoor", emoji: "⛱️", bg: "hsl(200, 40%, 94%)" },
  { mode: "partner", labelKey: "vibe.partner", emoji: "💕", bg: "hsl(345, 50%, 95%)" },
];

const VIBE_TILES_EXTRA = [
  { mode: "delivery", labelKey: "vibe.delivery", emoji: "🛵", bg: "hsl(25, 55%, 94%)" },
  { mode: "late", labelKey: "vibe.late", emoji: "🌙", bg: "hsl(250, 40%, 94%)" },
  { mode: "sweet", labelKey: "vibe.sweet", emoji: "🍰", bg: "hsl(340, 45%, 95%)" },
  { mode: "brunch", labelKey: "vibe.brunch", emoji: "🥞", bg: "hsl(35, 50%, 94%)" },
  { mode: "streetfood", labelKey: "vibe.streetfood", emoji: "🍜", bg: "hsl(20, 55%, 94%)" },
  { mode: "rooftop", labelKey: "vibe.rooftop", emoji: "🏙️", bg: "hsl(210, 40%, 94%)" },
  { mode: "family", labelKey: "vibe.family", emoji: "👨‍👩‍👧", bg: "hsl(150, 35%, 94%)" },
  { mode: "cafe", labelKey: "vibe.cafe", emoji: "☕", bg: "hsl(30, 40%, 94%)" },
];

const BANGKOK_LOCATIONS = [
  { name: "Sukhumvit", lat: 13.7420, lng: 100.5400 },
  { name: "Silom", lat: 13.7285, lng: 100.5310 },
  { name: "Siam", lat: 13.7454, lng: 100.5341 },
  { name: "Thonglor", lat: 13.7320, lng: 100.5783 },
  { name: "Ekkamai", lat: 13.7310, lng: 100.5690 },
  { name: "Ari", lat: 13.7710, lng: 100.5450 },
  { name: "Chinatown", lat: 13.7410, lng: 100.5100 },
  { name: "Old Town", lat: 13.7560, lng: 100.5018 },
  { name: "Sathorn", lat: 13.7220, lng: 100.5290 },
  { name: "Riverside", lat: 13.7230, lng: 100.5130 },
];

interface PersonalizedRec {
  id: number;
  name: string;
  category: string;
  rating: string;
  imageUrl: string;
  address: string;
  priceLevel: number;
  match: number;
}

function hasCoreContactData(restaurant: {
  imageUrl?: string | null;
  rating?: string | null;
  address?: string | null;
  phone?: string | null;
  photos?: string[] | null;
}) {
  const hasImage = Boolean(restaurant.imageUrl?.trim());
  const hasRating = Boolean(restaurant.rating?.trim()) && restaurant.rating !== "N/A";
  const hasAddress = Boolean(restaurant.address?.trim()) && restaurant.address !== "N/A";
  const hasPhone = Boolean(restaurant.phone?.trim());
  const hasPhotos = Array.isArray(restaurant.photos) && restaurant.photos.length > 0;
  return hasImage && hasRating && hasAddress && hasPhone && hasPhotos;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "home.greeting.breakfast";
  if (hour < 14) return "home.greeting.lunch";
  if (hour < 17) return "home.greeting.hungry";
  if (hour < 21) return "home.greeting.dinner";
  return "home.greeting.latenight";
}

function getContextLine(): string {
  const now = new Date();
  const day = now.toLocaleDateString("en", { weekday: "short" });
  const time = now.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} \u00b7 ${time} \u00b7 14 open near you`;
}

export default function Home() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const sessions = useSessions();
  const { isEnabled } = useFeatureFlags();
  const { logoUrl, mascotUrl, heroTitle, heroSubtitle, mascotGreeting, accentColor } = useBranding();
  const { t } = useLanguage();
  const labelOf = (o: { label?: string; labelKey?: string }) =>
    o.labelKey ? t(o.labelKey) : (o.label ?? "");
  const { isVibeEnabled } = useVibesConfig();
  const effectiveLogoUrl = logoUrl || toastLogoPath;
  const effectiveMascotUrl = mascotUrl || mascotPath;
  const visibleMainVibes = VIBE_TILES_MAIN.filter((v) => isVibeEnabled(v.mode));
  const visibleExtraVibes = VIBE_TILES_EXTRA.filter((v) => isVibeEnabled(v.mode));
  const { profile: tasteProfile, getSuggestionTitle, topPreference, getMoodSignal } = useTasteProfile();
  const { recordVibe } = useVibeFrequency();
  const { data: suggestions = [], isLoading: suggestionsLoading } = useSuggestions();
  const [userLocation, setUserLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [locationReady, setLocationReady] = useState(false);
  const [seedingStatus, setSeedingStatus] = useState<"idle" | "seeding" | "ready">("idle");
  const { data: nearbyRestaurants = [], isLoading: nearbyLoading } = useRestaurants("new");
  const allRestaurantsQuery = useRestaurants(undefined, {
    lat: userLocation.lat,
    lng: userLocation.lng,
    radius: 1000,
    localOnly: true,
    limit: 30,
    enabled: seedingStatus === "ready",
  });
  const { data: allRestaurants = [], isLoading: mapLoading, refetch: refetchAllRestaurants } = allRestaurantsQuery;
  const { profile: userProfile } = useLineProfile();
  const resumableGroupSession = useMemo(() => {
    const now = Date.now();
    return sessions.find((session) => session.type === "group" && now - session.startedAt <= 10 * 60 * 1000);
  }, [sessions]);

  const bindDrag = useDrag(
    ({ movement: [, my], velocity: [, vy], last }) => {
      if (!last) return;
      if (my > 60 || vy > 0.5) setDrawerOpen(false);
      else if (my < -60 || vy < -0.5) setDrawerOpen(true);
    },
    { axis: "y", filterTaps: true, pointer: { touch: true } }
  );

  const [personalizedRecs, setPersonalizedRecs] = useState<PersonalizedRec[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);

  useEffect(() => {
    async function fetchPersonalized() {
      const userId = userProfile?.userId;
      if (!userId) {
        setPersonalizedRecs([]);
        setRecsLoading(false);
        return;
      }
      try {
        const now = new Date();
        const params = new URLSearchParams({
          userId,
          lat: String(userLocation.lat),
          lng: String(userLocation.lng),
          hour: String(now.getHours()),
          day: String(now.getDay()),
          limit: "10",
        });
        const res = await fetch(`/api/recommendations/personalized?${params.toString()}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          if (items.length > 0) {
            const mapped: PersonalizedRec[] = items.map((item: any) => ({
              id: Number(item.id),
              name: String(item.name ?? ""),
              category: String(item.category ?? "Restaurant"),
              rating: String(item.rating ?? "4.5"),
              imageUrl: String(item.imageUrl ?? ""),
              address: String(item.address ?? ""),
              priceLevel: Number(item.priceLevel ?? 2),
              match: Math.max(0, Math.min(100, Math.round((Number(item.score) || 0) * 100))),
            }));
            setPersonalizedRecs(mapped);
          } else {
            setPersonalizedRecs([]);
          }
        } else {
          setPersonalizedRecs([]);
        }
      } catch {
        setPersonalizedRecs([]);
      } finally {
        setRecsLoading(false);
      }
    }
    fetchPersonalized();
  }, [userProfile?.userId, userLocation.lat, userLocation.lng]);

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [moreVibesOpen, setMoreVibesOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [currentLocationName, setCurrentLocationName] = useState("Sukhumvit");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeSort, setActiveSort] = useState("trending");
  const [activePrices, setActivePrices] = useState<string[]>([]);
  const [activeDietary, setActiveDietary] = useState<string[]>([]);
  const [activeDistance, setActiveDistance] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const requestCurrentLocation = useCallback((source: "auto" | "picker") => {
    if (!navigator.geolocation) return Promise.resolve<"success" | "denied" | "other_error">("other_error");
    return new Promise<"success" | "denied" | "other_error">((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          trackEvent("filter", { metadata: { name: "location", value: source === "auto" ? "current_location_auto" : "current_location" } });
          setCurrentLocationName("__current__");
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationReady(true);
          setLocationPickerOpen(false);
          resolve("success");
        },
        (err) => {
          if (source === "picker") {
            console.warn("[home-location] geolocation failed", { code: err.code, message: err.message });
          }
          setLocationPickerOpen(false);
          resolve(err.code === 1 ? "denied" : "other_error");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function runAutoLocationPrompt() {
      if (typeof window === "undefined") return;
      if (!navigator.geolocation) return;
      const hasPrompted = window.localStorage.getItem(HOME_LOCATION_PROMPT_KEY);
      if (hasPrompted === "1") return;

      if (isLiffAvailable()) {
        await initLiff();
      }
      if (cancelled) return;

      const result = await requestCurrentLocation("auto");
      if (cancelled) return;
      if (result === "success" || result === "denied") {
        window.localStorage.setItem(HOME_LOCATION_PROMPT_KEY, "1");
      }
    }
    void runAutoLocationPrompt();
    return () => {
      cancelled = true;
    };
  }, [requestCurrentLocation]);

  const activeFilterCount = (activePrices.length > 0 ? 1 : 0) + (activeDietary.length > 0 ? 1 : 0) + (activeDistance ? 1 : 0) + (activeSort !== "trending" ? 1 : 0);
  const togglePrice = (v: string) => setActivePrices(prev => prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]);
  const toggleDietary = (v: string) => setActiveDietary(prev => prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v]);
  const trackFilterChange = useCallback((name: string, value: unknown) => {
    trackEvent("filter", { metadata: { name, value } });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("search") === "1") {
      setSearchOpen(true);
      setTimeout(() => inputRef.current?.focus(), 300);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;
    const timer = setTimeout(() => {
      trackEvent("search", { metadata: { query } });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const EMOJI_MAP: Record<string, string> = { Thai: "🇹🇭", Sushi: "🍣", Burgers: "🍔", Pizza: "🍕", Bars: "🍸", Cafe: "☕", Desserts: "🍰", Chinese: "🥟", Breakfast: "🍳", "Bubble Tea": "🧋", Bakery: "🥐", Coffee: "☕", Korean: "🇰🇷", Japanese: "🇯🇵", Italian: "🍝", Ramen: "🍜", Mexican: "🌮" };
  const getPriceLabel = (level: number) => "฿".repeat(Math.max(1, Math.min(4, level || 1)));

  const restaurantPins = useMemo(() => {
    return allRestaurants
      .filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)))
      .map((r) => ({
        id: r.id,
        name: r.name,
        emoji: EMOJI_MAP[r.category] || "🍽️",
        category: r.category,
        lat: Number(r.lat),
        lng: Number(r.lng),
        rating: String(r.rating ?? "4.5"),
        price: getPriceLabel(r.priceLevel ?? 1),
        imageUrl: r.imageUrl ?? "",
        description: r.description ?? "",
      }));
  }, [allRestaurants]);

  // Seed the area with full Google Places data before fetching restaurants.
  // If DB already has ≥30 complete restaurants nearby, the seed call returns instantly (DB hit).
  // This ensures users never see restaurants with missing photos/rating/hours.
  useEffect(() => {
    if (!locationReady) {
      // No GPS yet — use default location and mark ready after a short grace period
      const timer = setTimeout(() => setSeedingStatus("ready"), 500);
      return () => clearTimeout(timer);
    }
    setSeedingStatus("seeding");
    fetch("/api/places/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: userLocation.lat, lng: userLocation.lng, radius: 1000 }),
      credentials: "include",
    })
      .then(() => setSeedingStatus("ready"))
      .catch(() => setSeedingStatus("ready")); // always unblock UI even on failure
  }, [locationReady, userLocation.lat, userLocation.lng]);

  const missingCoreContactCountTop30 = useMemo(() => {
    return allRestaurants.slice(0, 30).filter((r) => !hasCoreContactData(r)).length;
  }, [allRestaurants]);

  const searchable = useMemo(() => {
    if (allRestaurants.length === 0) return [];
    return allRestaurants.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      rating: String(r.rating ?? "4.5"),
      address: r.address ?? "",
      menus: (r.description ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2),
    }));
  }, [allRestaurants]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    type SearchItem = typeof searchable[0];
    const nameMatches: SearchItem[] = [];
    const categoryMatches: SearchItem[] = [];
    const menuMatches: SearchItem[] = [];
    const seen = new Set<number>();
    for (const r of searchable) { if (r.name.toLowerCase().includes(q)) { nameMatches.push(r); seen.add(r.id); } }
    for (const r of searchable) { if (seen.has(r.id)) continue; if (r.category.toLowerCase().includes(q)) { categoryMatches.push(r); seen.add(r.id); } }
    for (const r of searchable) { if (seen.has(r.id)) continue; if (r.menus.some((m) => m.includes(q))) { menuMatches.push(r); seen.add(r.id); } }
    return [...nameMatches.slice(0, 5), ...categoryMatches.slice(0, 4), ...menuMatches.slice(0, 6)].slice(0, 10);
  }, [searchQuery, searchable]);

  const mapCenter = useMemo<[number, number]>(() => [userLocation.lat, userLocation.lng], [userLocation]);
  const activeLocationMarker = useMemo(() => {
    if (currentLocationName !== "__current__") return null;
    return { lat: userLocation.lat, lng: userLocation.lng };
  }, [currentLocationName, userLocation.lat, userLocation.lng]);
  const mapPins = useMemo(() =>
    restaurantPins.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, category: p.category, price: p.price, lat: p.lat, lng: p.lng })),
  [restaurantPins]);

  const MAP_CATEGORIES = useMemo(() => {
    const cats = Array.from(new Set(restaurantPins.map((p) => p.category)));
    return cats.map((c) => ({ label: c, emoji: EMOJI_MAP[c] || "🍽️" }));
  }, [restaurantPins]);

  const filteredMapCards = useMemo(() => {
    if (!selectedCategory) return restaurantPins.slice(0, 6);
    return restaurantPins.filter((p) => p.category === selectedCategory);
  }, [selectedCategory, restaurantPins]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleVibeClick = useCallback((mode: string) => {
    recordVibe(mode);
    trackEvent("filter", { metadata: { name: "vibe_mode", value: mode } });
    const p = new URLSearchParams();
    switch (mode) {
      case "cheap": p.set("budget", "Cheap"); break;
      case "nearby": p.set("locations", "Near BTS"); break;
      case "trending": p.set("interests", "Popular spots"); p.set("locations", "Trendy spots"); break;
      case "hot": p.set("interests", "Popular spots,Hot & spicy"); break;
      case "late": p.set("locations", "Late night"); break;
      case "outdoor": p.set("interests", "Outdoor dining"); p.set("locations", "Rooftops,By the river"); break;
      case "healthy": p.set("diet", "Vegetarian,Vegan"); p.set("interests", "Healthy"); break;
      case "drinks": p.set("interests", "Drinks"); break;
      case "partner": p.set("interests", "Fine dining,Romantic"); break;
      case "delivery": p.set("interests", "Delivery"); p.set("locations", "Delivery"); break;
      case "sweet": p.set("interests", "Desserts,Sweets"); break;
      case "brunch": p.set("interests", "Brunch,Breakfast"); break;
      case "streetfood": p.set("interests", "Street food"); break;
      case "rooftop": p.set("interests", "Rooftop dining"); p.set("locations", "Rooftops"); break;
      case "family": p.set("interests", "Family friendly"); break;
      case "cafe": p.set("interests", "Coffee,Cafe"); break;
    }
    const qs = p.toString();
    navigate(`/solo/results${qs ? `?${qs}` : ""}`);
  }, [navigate, recordVibe]);

  const topMatch = personalizedRecs[0];

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden" data-testid="home-page">
      <div className="absolute inset-0 z-0">
        {isEnabled("map_view") ? (
          <InteractiveMap
            pins={mapPins}
            center={mapCenter}
            zoom={14}
            selectedPinId={null}
            onPinSelect={(id) => {
              trackEvent("view_detail", { restaurantId: id, metadata: { source: "map_pin" } });
              navigate(`/restaurant/${id}`);
            }}
            filteredCategory={selectedCategory}
            activeLocation={activeLocationMarker}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-amber-50 to-orange-50" />
        )}
      </div>

      <div className="absolute right-4 bottom-40 md:bottom-28 z-[70]">
        <button
          type="button"
          aria-label="Use current location"
          title="Use current location"
          onClick={() => { void requestCurrentLocation("picker"); }}
          className="h-11 w-11 rounded-full border border-gray-200 bg-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          data-testid="button-map-current-location"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" />
          </svg>
        </button>
      </div>

      <div className="absolute top-0 left-0 right-0 z-[60] safe-top" ref={locationRef}>
        <div className="px-4 pt-3 pb-2">
          <div
            className="w-full flex items-center gap-2.5 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 border border-gray-200/60"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <button
              onClick={() => {
                trackEvent("search", { metadata: { source: "home_search_open" } });
                setSearchOpen(true);
                setTimeout(() => inputRef.current?.focus(), 150);
              }}
              className="flex items-center gap-2.5 flex-1 min-w-0"
              data-testid="button-open-search"
            >
              <Search className="w-4.5 h-4.5 text-muted-foreground/50 flex-shrink-0" />
              <span className="text-sm text-muted-foreground text-left truncate">{heroTitle}</span>
            </button>
            <button
              onClick={() => { setLocationPickerOpen(prev => !prev); setShowFilters(false); }}
              className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-full bg-gray-50 border border-gray-100"
              data-testid="button-map-location"
            >
              <MapPin className="w-3 h-3" style={{ color: accentColor }} />
              <span className="text-[11px] font-medium text-foreground max-w-[70px] truncate">{currentLocationName === "__current__" ? t("home.current_location") : currentLocationName}</span>
              <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition-transform ${locationPickerOpen ? "rotate-180" : ""}`} />
            </button>
            <div ref={filterRef} className="relative flex-shrink-0">
              <button
                onClick={() => {
                  const next = !showFilters;
                  trackEvent("filter", { metadata: { action: "toggle_map_filters", open: next } });
                  setShowFilters(next);
                  setLocationPickerOpen(false);
                }}
                className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center relative active:scale-95 transition-transform"
                data-testid="button-filter-map"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/60" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground rounded-full text-[9px] text-white flex items-center justify-center font-bold">{activeFilterCount}</span>
                )}
              </button>
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
                    className="absolute top-11 right-0 w-[260px] bg-white rounded-2xl overflow-hidden border border-gray-100 z-[100]"
                    style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
                    data-testid="map-filter-dropdown"
                  >
                    <div className="p-4 space-y-4 max-h-[340px] overflow-y-auto">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Sort by</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.sortBy.map(o => (
                            <button key={o.value} onClick={() => { setActiveSort(o.value); trackFilterChange("sort", o.value); }} data-testid={`map-filter-sort-${o.value}`}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeSort === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{labelOf(o)}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Price range</p>
                        <div className="flex gap-1.5">
                          {FILTER_OPTIONS.priceRange.map(o => (
                            <button key={o.value} onClick={() => { togglePrice(o.value); trackFilterChange("price", o.value); }} data-testid={`map-filter-price-${o.value}`}
                              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${activePrices.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{labelOf(o)}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dietary</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.dietary.map(o => (
                            <button key={o.value} onClick={() => { toggleDietary(o.value); trackFilterChange("dietary", o.value); }} data-testid={`map-filter-dietary-${o.value}`}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDietary.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{labelOf(o)}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Distance</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.distance.map(o => (
                            <button key={o.value} onClick={() => { setActiveDistance(activeDistance === o.value ? null : o.value); trackFilterChange("distance", o.value); }} data-testid={`map-filter-distance-${o.value}`}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDistance === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{labelOf(o)}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {locationPickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                className="mt-2 w-[200px] ml-auto bg-white rounded-2xl overflow-hidden border border-gray-100 z-[110]"
                style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)" }}
                data-testid="location-picker-dropdown"
              >
                <div className="py-2 max-h-[280px] overflow-y-auto">
                  <button
                    onClick={() => { void requestCurrentLocation("picker"); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left ${
                      currentLocationName === "__current__" ? "bg-gray-50" : ""
                    }`}
                    data-testid="location-option-current"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-3 h-3 text-blue-500" />
                    </div>
                    <span className={`text-sm font-medium ${currentLocationName === "__current__" ? "text-foreground" : "text-blue-500"}`}>{t("home.current_location")}</span>
                    {currentLocationName === "__current__" && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                  <div className="border-b border-gray-100 mx-4 my-1" />
                  <p className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Bangkok areas</p>
                  {BANGKOK_LOCATIONS.map(loc => (
                    <button
                      key={loc.name}
                      onClick={() => {
                        trackEvent("filter", { metadata: { name: "location", value: loc.name } });
                        setCurrentLocationName(loc.name);
                        setUserLocation({ lat: loc.lat, lng: loc.lng });
                        setLocationPickerOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left ${
                        currentLocationName === loc.name ? "bg-gray-50" : ""
                      }`}
                      data-testid={`location-option-${loc.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: currentLocationName === loc.name ? accentColor : undefined }} />
                      <span className={`text-sm font-medium ${currentLocationName === loc.name ? "text-foreground" : "text-muted-foreground"}`}>{loc.name}</span>
                      {currentLocationName === loc.name && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!drawerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="px-4 pb-2"
            >
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" data-testid="map-category-chips">
                {mapLoading ? (
                  [0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex-shrink-0 h-8 w-16 rounded-full bg-white/70 animate-pulse" />
                  ))
                ) : (
                  <>
                    <button
                      onClick={() => { setSelectedCategory(null); trackFilterChange("map_category", "all"); }}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                        selectedCategory === null
                          ? "bg-foreground text-white shadow-md"
                          : "bg-white/90 backdrop-blur-sm text-foreground border border-gray-200/60"
                      }`}
                      style={selectedCategory === null ? {} : { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                      data-testid="chip-category-all"
                    >
                      All
                    </button>
                    {MAP_CATEGORIES.map(cat => (
                      <button
                        key={cat.label}
                        onClick={() => {
                          const next = selectedCategory === cat.label ? null : cat.label;
                          setSelectedCategory(next);
                          trackFilterChange("map_category", next ?? "all");
                        }}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                          selectedCategory === cat.label
                            ? "bg-foreground text-white shadow-md"
                            : "bg-white/90 backdrop-blur-sm text-foreground border border-gray-200/60"
                        }`}
                        style={selectedCategory === cat.label ? {} : { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                        data-testid={`chip-category-${cat.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <FoodIconFromEmoji emoji={cat.emoji} size={18} />
                        {cat.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!drawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="absolute left-0 right-0 z-30"
            style={{ bottom: "210px" }}
            data-testid="map-restaurant-cards"
          >
            <div
              ref={scrollContainerRef}
              className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory px-4"
            >
              {mapLoading ? (
                [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[260px] snap-start bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse"
                    style={{ boxShadow: "0 6px 24px -4px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)" }}
                  >
                    <div className="h-[110px] w-full bg-gray-200" />
                    <div className="px-3.5 py-2.5">
                      <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-2" />
                      <div className="h-2.5 bg-gray-50 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : (
                filteredMapCards.map((pin) => (
                  <motion.button
                    key={pin.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate(`/restaurant/${pin.id}`)}
                    className="flex-shrink-0 w-[260px] snap-start bg-white rounded-2xl overflow-hidden border border-gray-100"
                    style={{ boxShadow: "0 6px 24px -4px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)" }}
                    data-testid={`map-card-${pin.id}`}
                  >
                    <div className="relative h-[110px] w-full">
                      <img src={pin.imageUrl} alt={pin.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold text-foreground flex items-center gap-1">
                        <FoodIconFromEmoji emoji={pin.emoji} size={14} /> {pin.category}
                      </div>
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold text-foreground">
                        {pin.price}
                      </div>
                    </div>
                    <div className="px-3.5 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground truncate">{pin.name}</p>
                        <span className="text-xs font-semibold text-muted-foreground ml-2 flex-shrink-0">{pin.rating}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{pin.description}</p>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ bottom: drawerOpen ? "0px" : "0px", height: drawerOpen ? "82%" : "200px" }}
        transition={{ type: "spring", damping: 26, stiffness: 240, mass: 1 }}
        className="absolute left-0 right-0 rounded-t-[28px] z-50 flex flex-col gpu-accelerated"
        style={{
          background: "#F5F5F5",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.08), 0 -2px 10px rgba(0,0,0,0.03)",
          bottom: 0,
          touchAction: "none",
        }}
      >
        <div
          {...bindDrag()}
          className="w-full flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
          onClick={() => setDrawerOpen(prev => !prev)}
        >
          <div className="pt-3 pb-2 flex justify-center">
            <div className="w-10 h-[5px] bg-gray-300/60 rounded-full" />
          </div>

          <AnimatePresence>
            {!drawerOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-6 pt-1">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={effectiveLogoUrl} alt="Toast" className="h-9 w-auto" data-testid="img-collapsed-logo" />
                    <div className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
                      className="text-xs font-medium text-muted-foreground"
                      data-testid="button-expand-drawer"
                    >
                      See more <ChevronDown className="w-3 h-3 inline rotate-180" />
                    </button>
                  </div>
                  <div className={`grid gap-2.5 ${isEnabled("group_mode") ? "grid-cols-2" : "grid-cols-1"}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate("/solo/quiz"); }}
                      className="relative overflow-hidden bg-white rounded-xl px-4 py-3 border border-gray-100 text-left"
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                      data-testid="button-solo-collapsed"
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accentColor }} />
                      <span className="absolute top-0 right-2 text-[32px] font-bold select-none pointer-events-none" style={{ color: "rgba(0,0,0,0.04)" }}>1</span>
                      <p className="text-sm font-bold text-foreground leading-tight">Solo</p>
                      <p className="text-[10px] text-muted-foreground">Just you</p>
                    </button>
                    {isEnabled("group_mode") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate("/group/setup"); }}
                        className="relative overflow-hidden bg-white rounded-xl px-4 py-3 border border-gray-100 text-left"
                        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                        data-testid="button-group-collapsed"
                      >
                        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "#00B14F" }} />
                        <span className="absolute top-0 right-2 text-[32px] font-bold select-none pointer-events-none" style={{ color: "rgba(0,0,0,0.04)" }}>2+</span>
                        <p className="text-sm font-bold text-foreground leading-tight">Group</p>
                        <p className="text-[10px] text-muted-foreground">With others</p>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 relative" style={{ overscrollBehavior: "contain" }}>
          <div className="px-6 pt-1 pb-1 flex items-center justify-between">
            <div>
              <img src={effectiveLogoUrl} alt="Toast" className="h-9 w-auto" data-testid="img-home-logo" />
              {heroSubtitle && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight" data-testid="text-hero-subtitle">
                  {heroSubtitle}
                </p>
              )}
            </div>
          </div>
          <div className="px-6 pt-1 pb-3">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2"
              data-testid="text-context-line"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {getContextLine()}
            </motion.p>
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1">
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 25 }}
                  className="text-[26px] font-bold text-foreground leading-[1.15] tracking-tight"
                  data-testid="text-greeting"
                >
                  Hey there,<br />{t(getGreeting())}
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-2 mt-3 flex-wrap"
                >
                  {topPreference.score > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-xs font-medium text-foreground border border-gray-100" data-testid="badge-taste">
                      {getMoodSignal.emoji} {topPreference.label} fan
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-xs font-medium text-foreground border border-gray-100" data-testid="badge-streak">
                    12-wk streak
                  </span>
                </motion.div>
              </div>
              <motion.img
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
                src={effectiveMascotUrl}
                alt="Toast mascot"
                className="w-20 h-20 object-contain flex-shrink-0"
                data-testid="img-hero-mascot"
              />
            </div>
          </div>

          <div className="px-6 pb-1">
            <PublicBannerSlot position="home_top" />
          </div>

          <div className="px-6 pt-2 pb-4">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[20px] font-bold text-foreground mb-4"
              data-testid="text-who-eating"
            >
              Who's joining you tonight?
            </motion.h2>
            <div className={`grid gap-3 ${isEnabled("group_mode") ? "grid-cols-2" : "grid-cols-1"}`}>
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, type: "spring", stiffness: 300, damping: 22 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/solo/quiz")}
                data-testid="button-solo"
                className="relative overflow-hidden rounded-[20px] text-left bg-white border border-gray-100"
                style={{
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]" style={{ background: `linear-gradient(90deg, ${accentColor}, hsl(40, 75%, 68%))` }} />
                <div className="relative pt-5 px-5 pb-5">
                  <span
                    className="absolute top-2 left-4 text-[72px] font-bold leading-none select-none pointer-events-none"
                    style={{ color: "rgba(0,0,0,0.04)" }}
                  >
                    1
                  </span>
                  <div className="relative z-10 pt-12">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 flex items-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} /> Just you
                    </p>
                    <p
                      className="text-[24px] font-bold text-foreground leading-tight"
                    >
                      Solo
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-2 leading-snug">Two options face off until one wins</p>
                  </div>
                </div>
              </motion.button>

              {isEnabled("group_mode") && (
                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36, type: "spring", stiffness: 300, damping: 22 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/group/setup")}
                  data-testid="button-group"
                  className="relative overflow-hidden rounded-[20px] text-left bg-white border border-gray-100"
                  style={{
                    boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]" style={{ background: "linear-gradient(90deg, #00B14F, #00C300)" }} />
                  <div className="relative pt-5 px-5 pb-5">
                    <span
                      className="absolute top-2 left-4 text-[72px] font-bold leading-none select-none pointer-events-none"
                      style={{ color: "rgba(0,0,0,0.04)" }}
                    >
                      2+
                    </span>
                    <div className="absolute top-4 right-4">
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 flex items-center gap-1 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 4 live
                      </span>
                    </div>
                    <div className="relative z-10 pt-12">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> With others
                      </p>
                      <p className="text-[24px] font-bold text-foreground leading-tight">
                        Group
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-2 leading-snug">Everyone swipes, the match wins</p>
                    </div>
                  </div>
                </motion.button>
              )}
            </div>
          </div>

          {isEnabled("decide_for_me") && (
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                <h2 className="text-[11px] font-bold text-foreground uppercase tracking-[0.12em]" data-testid="text-toast-decides">{mascotGreeting}</h2>
              </div>
              {isEnabled("toast_picks") && (
                <button onClick={() => navigate("/toast-picks")} className="text-xs font-medium text-muted-foreground" data-testid="link-why-this">
                  Why this? <span className="text-muted-foreground/40">&#8250;</span>
                </button>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-[20px] p-5 overflow-hidden bg-white border border-gray-100 relative"
              style={{
                boxShadow: "0 6px 24px -6px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)",
              }}
              data-testid="card-toast-decides"
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${accentColor}, hsl(45, 90%, 65%))` }} />
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src={effectiveMascotUrl} alt="" className="w-10 h-10 object-contain" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Just for you
                  </span>
                </div>
                {isEnabled("toast_picks") && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate("/toast-picks")}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: accentColor }}
                    data-testid="button-toast-decides-go"
                  >
                    <ArrowRight className="w-4 h-4 text-foreground" />
                  </motion.button>
                )}
              </div>

              <p className="text-[18px] font-bold text-foreground leading-snug mb-1" data-testid="text-ai-quote">
                "{getSuggestionTitle}"
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Based on your recent activity and taste profile
              </p>

              <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-2">
                {recsLoading ? (
                  [0, 1, 2].map((i) => (
                    <div key={i} className="flex-shrink-0 w-[110px] animate-pulse">
                      <div className="w-full h-[80px] rounded-xl bg-gray-100 mb-1.5" />
                      <div className="h-3 bg-gray-100 rounded w-3/4 mb-1" />
                      <div className="h-2.5 bg-gray-50 rounded w-1/2" />
                    </div>
                  ))
                ) : (
                  personalizedRecs.length > 0 ? (
                    personalizedRecs.map((rec, idx) => (
                      <motion.button
                        key={rec.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 + idx * 0.08, type: "spring", stiffness: 280, damping: 22 }}
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/restaurant/${rec.id}`)}
                        className="flex-shrink-0 w-[110px] group"
                        data-testid={`card-ai-rec-${rec.id}`}
                      >
                        <div className="relative w-full h-[80px] rounded-xl overflow-hidden mb-1.5 border border-gray-100">
                          <img src={rec.imageUrl} alt={rec.name} className="w-full h-full object-cover" />
                          <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                            {rec.match}%
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-foreground truncate">{rec.name}</p>
                        <p className="text-[10px] text-muted-foreground">{rec.address} &middot; ★{rec.rating}</p>
                      </motion.button>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground py-6 px-1">
                      No personalized picks available yet.
                    </div>
                  )
                )}
              </div>

              {topMatch && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Match Confidence</span>
                    <span className="text-sm font-bold text-foreground">{topMatch.match}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${topMatch.match}%` }}
                      transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${accentColor}, hsl(45, 90%, 60%))` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
          )}

          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold text-foreground uppercase tracking-[0.12em]" data-testid="text-pick-vibe">Pick a Vibe</h2>
              <span className="text-xs font-medium text-muted-foreground">Opens a world <span className="text-muted-foreground/40">&#8250;</span></span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {visibleMainVibes.map((vibe, idx) => (
                  <motion.button
                    key={vibe.mode}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + idx * 0.04, type: "spring", stiffness: 320, damping: 22 }}
                    whileHover={{ scale: 1.06, y: -3 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleVibeClick(vibe.mode)}
                    className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border border-gray-100/80"
                    style={{ boxShadow: "0 2px 12px -3px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02)" }}
                    data-testid={`vibe-${vibe.mode}`}
                  >
                    <motion.div
                      className="flex items-center justify-center"
                      whileHover={{ rotate: 8, scale: 1.1 }}
                      whileTap={{ rotate: -12, scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <FoodIconFromEmoji emoji={vibe.emoji} size={38} />
                    </motion.div>
                    <span className="text-[11px] font-semibold text-foreground">{t(vibe.labelKey)}</span>
                  </motion.button>
              ))}
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + 7 * 0.04, type: "spring", stiffness: 320, damping: 22 }}
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setMoreVibesOpen(true)}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border border-gray-100/80"
                style={{ boxShadow: "0 2px 12px -3px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02)" }}
                data-testid="vibe-more"
              >
                <motion.div
                  className="flex items-center justify-center"
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  whileTap={{ rotate: -12, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Grid3X3 className="w-6 h-6 text-muted-foreground" />
                </motion.div>
                <span className="text-[11px] font-semibold text-foreground">More</span>
              </motion.button>
            </div>
          </div>

          <RestaurantRow
            title="Your Usuals"
            subtitle="Places you keep coming back to"
            restaurants={suggestions}
            isLoading={suggestionsLoading}
            size="default"
            category="Suggestions"
          />

          <RestaurantRow
            title="New near you"
            restaurants={nearbyRestaurants}
            isLoading={nearbyLoading}
            size="xl"
            category="New"
          />

          <div className="px-6 pt-5 pb-0">
            <PublicBannerSlot position="home_bottom" />
          </div>

          {resumableGroupSession && (
            <div className="px-6 pt-5 pb-0">
              <div
                className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3 bg-white border border-gray-100"
                style={{ boxShadow: "0 2px 12px -3px rgba(0,0,0,0.05)" }}
                data-testid="card-continue-session"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-foreground truncate">Continue session</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {resumableGroupSession.id} · {resumableGroupSession.memberCount ?? 0} members
                  </p>
                </div>
                <button
                  onClick={() => navigate(resumableGroupSession.route)}
                  className="px-4 py-2 rounded-xl bg-[#FFCC02] text-[#2d2000] text-xs font-bold whitespace-nowrap"
                  data-testid="button-continue-session"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          <div className="px-6 pt-5 pb-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl px-5 py-4 flex items-center gap-4 bg-white border border-gray-100"
              style={{ boxShadow: "0 2px 12px -3px rgba(0,0,0,0.05)" }}
              data-testid="card-streak"
            >
              <span className="text-3xl flex-shrink-0">🔥</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-foreground">12-week decision streak!</p>
                <p className="text-xs text-muted-foreground mt-0.5">You & your crew keep showing up -- keep it going</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/profile")}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: accentColor }}
                data-testid="button-streak-go"
              >
                <ArrowRight className="w-4 h-4 text-foreground" />
              </motion.button>
            </motion.div>
          </div>

          <div className="h-8" />
        </div>
      </motion.div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-[#FAF7F2]"
            data-testid="search-overlay"
          >
            <div className="safe-top px-4 pt-3 pb-2">
              <div
                className="bg-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 border border-gray-200"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              >
                <Search className="w-4 h-4 text-muted-foreground/50" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What are you craving?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-foreground font-medium w-full placeholder:text-muted-foreground text-sm"
                  data-testid="input-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
                    className="text-muted-foreground flex-shrink-0"
                    data-testid="button-clear-search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div ref={filterRef} className="relative">
                  <button
                    onClick={() => {
                      const next = !showFilters;
                      trackEvent("filter", { metadata: { action: "toggle_search_filters", open: next } });
                      setShowFilters(next);
                    }}
                    className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 relative active:scale-95 transition-transform"
                    data-testid="button-filter"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/70" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground rounded-full text-[9px] text-white flex items-center justify-center font-bold">{activeFilterCount}</span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
                        className="absolute top-11 right-0 w-[260px] bg-white rounded-2xl overflow-hidden border border-gray-100 z-[110]"
                        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
                      >
                        <div className="p-4 space-y-4 max-h-[340px] overflow-y-auto">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Sort by</p>
                            <div className="flex flex-wrap gap-1.5">
                              {FILTER_OPTIONS.sortBy.map(o => (
                                <button key={o.value} onClick={() => { setActiveSort(o.value); trackFilterChange("sort", o.value); }} data-testid={`filter-sort-${o.value}`}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeSort === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                                >{labelOf(o)}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Price range</p>
                            <div className="flex gap-1.5">
                              {FILTER_OPTIONS.priceRange.map(o => (
                                <button key={o.value} onClick={() => { togglePrice(o.value); trackFilterChange("price", o.value); }} data-testid={`filter-price-${o.value}`}
                                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${activePrices.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                                >{labelOf(o)}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dietary</p>
                            <div className="flex flex-wrap gap-1.5">
                              {FILTER_OPTIONS.dietary.map(o => (
                                <button key={o.value} onClick={() => { toggleDietary(o.value); trackFilterChange("dietary", o.value); }} data-testid={`filter-dietary-${o.value}`}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDietary.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                                >{labelOf(o)}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Distance</p>
                            <div className="flex flex-wrap gap-1.5">
                              {FILTER_OPTIONS.distance.map(o => (
                                <button key={o.value} onClick={() => { setActiveDistance(activeDistance === o.value ? null : o.value); trackFilterChange("distance", o.value); }} data-testid={`filter-distance-${o.value}`}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDistance === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                                >{labelOf(o)}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); setShowFilters(false); }}
                  className="text-sm font-medium text-muted-foreground flex-shrink-0 ml-1"
                  data-testid="button-close-search"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-24">
              {searchQuery.trim() ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-foreground">
                      {searchResults.length > 0
                        ? `${searchResults.length} results for "${searchQuery}"`
                        : `No results for "${searchQuery}"`
                      }
                    </p>
                    <button
                      onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
                      className="text-[11px] font-semibold text-[#D4A800]"
                      data-testid="button-clear-drawer-search"
                    >
                      Clear
                    </button>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map((r, idx) => {
                        const isNameMatch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
                        return (
                          <button
                            key={`${r.id}-${idx}`}
                            onClick={() => {
                              trackEvent("view_detail", { restaurantId: r.id, metadata: { source: "search_results", query: searchQuery.trim() } });
                              setSearchOpen(false);
                              navigate(`/restaurant/${r.id}`);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100/80 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 text-left"
                            style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)" }}
                            data-testid={`drawer-search-result-${r.id}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                              {isNameMatch ? "📍" : "🏷️"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">★ {r.rating} · {r.category} · {r.address}</p>
                            </div>
                            {!isNameMatch && (
                              <span className="text-[9px] text-muted-foreground/60 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Similar</span>
                            )}
                            <span className="text-muted-foreground/40 text-xs">&#8250;</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <span className="text-4xl">🔍</span>
                      <p className="text-sm text-muted-foreground">Try a different search term</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[22px] font-bold text-foreground tracking-tight leading-tight mb-1" data-testid="text-search-heading">
                    Let's find what you're craving
                  </p>
                  <p className="text-[13px] text-muted-foreground mb-5">
                    Start typing or pick a suggestion below
                  </p>
                  <div className="space-y-2">
                    {suggestions.slice(0, 6).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          trackEvent("view_detail", { restaurantId: r.id, metadata: { source: "search_suggestions" } });
                          setSearchOpen(false);
                          navigate(`/restaurant/${r.id}`);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100/80 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 text-left"
                        style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)" }}
                        data-testid={`search-suggestion-${r.id}`}
                      >
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(40,50%,96%) 0%, hsl(35,40%,91%) 100%)" }}>
                          <FoodIconFromEmoji emoji={r.category?.includes("Thai") ? "🍜" : r.category?.includes("Japan") ? "🍣" : r.category?.includes("Korean") ? "🍜" : r.category?.includes("Italian") || r.category?.includes("Pizza") ? "🍕" : r.category?.includes("Burger") ? "🍔" : r.category?.includes("Ramen") || r.category?.includes("Noodle") ? "🍜" : r.category?.includes("Seafood") ? "🍽️" : "🍽️"} size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">★ {r.rating} · {r.category}</p>
                        </div>
                        <span className="text-muted-foreground/40 text-xs">&#8250;</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moreVibesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreVibesOpen(false)}
            data-testid="more-vibes-backdrop"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] max-h-[85vh] flex flex-col"
              style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }}
              onClick={(e) => e.stopPropagation()}
              data-testid="more-vibes-drawer"
            >
              <div className="pt-3 pb-2 flex justify-center flex-shrink-0">
                <div className="w-10 h-[5px] bg-gray-300/60 rounded-full" />
              </div>
              <div className="px-6 pb-2 flex-shrink-0">
                <h2 className="text-lg font-bold text-foreground">All Vibes</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Pick a mood, we will find the match</p>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0">
                <div className="px-6 pb-3">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Popular</p>
                  <div className="grid grid-cols-4 gap-2">
                    {visibleMainVibes.map((vibe) => (
                      <motion.button
                        key={vibe.mode}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setMoreVibesOpen(false); handleVibeClick(vibe.mode); }}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gray-50 border border-gray-100/80"
                        data-testid={`more-vibe-${vibe.mode}`}
                      >
                        <div className="flex items-center justify-center">
                          <FoodIconFromEmoji emoji={vibe.emoji} size={32} />
                        </div>
                        <span className="text-[10px] font-semibold text-foreground leading-tight">{t(vibe.labelKey)}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="px-6 pb-8">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">More Vibes</p>
                  <div className="grid grid-cols-4 gap-2">
                    {visibleExtraVibes.map((vibe) => (
                      <motion.button
                        key={vibe.mode}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setMoreVibesOpen(false); handleVibeClick(vibe.mode); }}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gray-50 border border-gray-100/80"
                        data-testid={`more-vibe-${vibe.mode}`}
                      >
                        <div className="flex items-center justify-center">
                          <FoodIconFromEmoji emoji={vibe.emoji} size={32} />
                        </div>
                        <span className="text-[10px] font-semibold text-foreground leading-tight">{t(vibe.labelKey)}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SessionBar />
      <BottomNav showBack={false} hidden={searchOpen || moreVibesOpen} />
    </div>
  );
}
