import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { SlidersHorizontal, X } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { BottomNav } from "@/components/BottomNav";
import { SessionBar } from "@/components/SessionBar";
import { InteractiveMap } from "@/components/InteractiveMap";
import { useSessions } from "@/lib/sessionStore";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { useRestaurants } from "@/hooks/use-restaurants";

const DEFAULT_LAT = 13.7420;
const DEFAULT_LNG = 100.54;

const CATEGORY_EMOJI: Record<string, string> = {
  thai: "??",
  sushi: "??",
  pizza: "??",
  cafe: "?",
  coffee: "?",
  burger: "??",
  breakfast: "??",
  bubble: "??",
  bar: "??",
  dessert: "??",
  bakery: "??",
};

function getEmoji(category: string): string {
  const key = category.toLowerCase();
  for (const k of Object.keys(CATEGORY_EMOJI)) {
    if (key.includes(k)) return CATEGORY_EMOJI[k];
  }
  return "???";
}

export default function Home() {
  const [, navigate] = useLocation();
  useSessions();
  const { getSuggestionTitle } = useTasteProfile();

  const [activeMode, setActiveMode] = useState<string>("trending");
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [forceDrawerOpen, setForceDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPinId, setSelectedPinId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: restaurants = [] } = useRestaurants({
    lat: userLocation.lat,
    lng: userLocation.lng,
    radius: 5000,
    sourcePreference: "osm-first",
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return restaurants
      .filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
      )
      .slice(0, 10)
      .map((r) => ({ id: r.id, name: r.name, category: r.category, rating: r.rating, address: r.address }));
  }, [restaurants, searchQuery]);

  const categories = useMemo(() => {
    const uniq = Array.from(new Set(restaurants.map((r) => r.category).filter(Boolean)));
    return uniq.slice(0, 10).map((label) => ({ label, emoji: getEmoji(label) }));
  }, [restaurants]);

  const mapCenter = useMemo<[number, number]>(() => [userLocation.lat, userLocation.lng], [userLocation]);

  const mapPins = useMemo(
    () =>
      restaurants
        .filter((r) => !Number.isNaN(Number(r.lat)) && !Number.isNaN(Number(r.lng)))
        .map((r) => ({
          id: r.id,
          name: r.name,
          emoji: getEmoji(r.category),
          category: r.category,
          price: "?".repeat(Math.max(1, r.priceLevel || 1)),
          lat: Number(r.lat),
          lng: Number(r.lng),
        })),
    [restaurants],
  );

  const selected = selectedPinId ? restaurants.find((r) => r.id === selectedPinId) : null;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#F0EDE8]" data-testid="home-page">
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          pins={mapPins}
          center={mapCenter}
          zoom={13}
          selectedPinId={selectedPinId}
          onPinSelect={(id) => setSelectedPinId((prev) => (prev === id ? null : id))}
          filteredCategory={activeCategory}
        />
      </div>

      {selected && (
        <div className="absolute left-4 right-4 bottom-[24%] z-[45] bg-white rounded-2xl p-3 shadow-lg" data-testid={`card-pin-${selected.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{selected.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.category}</p>
              <p className="text-xs text-muted-foreground truncate">?? {selected.address}</p>
            </div>
            <button className="text-xs font-semibold" onClick={() => navigate(`/restaurant/${selected.id}`)}>Open</button>
          </div>
        </div>
      )}

      <div className="absolute left-0 right-0 z-[55]" style={{ top: 0 }}>
        <div className="bg-white/80 backdrop-blur-lg safe-top pb-2 px-4">
          <div className="bg-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 border border-gray-300">
            <span className="text-base">??</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="What are you craving?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setForceDrawerOpen(true)}
              onBlur={() => setTimeout(() => setForceDrawerOpen(false), 200)}
              className="bg-transparent border-none outline-none text-foreground font-medium w-full text-sm"
              data-testid="input-search"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground text-sm" data-testid="button-clear-search">
                <X className="w-4 h-4" />
              </button>
            )}
            <div ref={filterRef} className="relative">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
                data-testid="button-filter"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/70" />
              </button>
            </div>
          </div>

          {!drawerOpen && (
            <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: "none" }}>
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => {
                    setActiveCategory((prev) => (prev === cat.label ? null : cat.label));
                    navigate(`/restaurants?category=${encodeURIComponent(cat.label)}`);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-[12px] font-semibold ${
                    activeCategory === cat.label ? "bg-foreground text-white" : "bg-white text-foreground/70 border border-gray-200/80"
                  }`}
                >
                  <span className="text-sm">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomSheet
        activeMode={activeMode}
        onModeChange={setActiveMode}
        isGroup={isGroup}
        onToggleGroup={() => setIsGroup(!isGroup)}
        onDrawerStateChange={setDrawerOpen}
        forceOpen={forceDrawerOpen}
        isSearchFocused={forceDrawerOpen}
        searchResults={searchResults}
        searchQuery={searchQuery}
        onClearSearch={() => {
          setSearchQuery("");
          inputRef.current?.blur();
        }}
        suggestionTitle={getSuggestionTitle}
        suggestionSubtitle="Places you might love"
      />

      <SessionBar />
      <BottomNav showBack={false} hidden={!drawerOpen || forceDrawerOpen} />
    </div>
  );
}