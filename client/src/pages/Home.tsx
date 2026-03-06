import { useState, useRef, useEffect, useMemo } from "react";
import { useUserLocation } from "@/hooks/use-user-location";
import { useLocation } from "wouter";
import { LocateFixed, MapPin, SlidersHorizontal, X } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { BottomNav } from "@/components/BottomNav";
import { SessionBar } from "@/components/SessionBar";
import { InteractiveMap } from "@/components/InteractiveMap";
import { useSessions } from "@/lib/sessionStore";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { useRestaurants } from "@/hooks/use-restaurants";


const CATEGORY_EMOJI: Record<string, string> = {
  thai: "TH",
  sushi: "JP",
  pizza: "PZ",
  cafe: "CF",
  coffee: "CF",
  burger: "BG",
  breakfast: "BF",
  bubble: "BT",
  bar: "BR",
  dessert: "DS",
  bakery: "BK",
};

function getEmoji(category: string): string {
  const key = category.toLowerCase();
  for (const k of Object.keys(CATEGORY_EMOJI)) {
    if (key.includes(k)) return CATEGORY_EMOJI[k];
  }
  return "FD";
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
  const [locating, setLocating] = useState(false);
  const [locationOverride, setLocationOverride] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const userLocation = useUserLocation();
  const effectiveLocation = locationOverride ?? userLocation;

  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: restaurants = [] } = useRestaurants({
    lat: effectiveLocation.lat,
    lng: effectiveLocation.lng,
    radius: 5000,
    limit: 20,
    localOnly: true,
    sourcePreference: "osm-first",
  });

  useEffect(() => {
    const total = restaurants.length;
    const withImageUrl = restaurants.filter((r) => Boolean(r.imageUrl && r.imageUrl.trim())).length;
    const withPhotoFallback = restaurants.filter((r) => Boolean(r.photos?.[0])).length;
    const withoutAnyImage = restaurants.filter((r) => !(r.imageUrl && r.imageUrl.trim()) && !r.photos?.[0]).length;
    console.log("[liff-map-debug] restaurants image summary", {
      total,
      withImageUrl,
      withPhotoFallback,
      withoutAnyImage,
      sampleWithoutImage: restaurants
        .filter((r) => !(r.imageUrl && r.imageUrl.trim()) && !r.photos?.[0])
        .slice(0, 5)
        .map((r) => ({ id: r.id, name: r.name })),
    });
  }, [restaurants]);

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

  const mapCenter = useMemo<[number, number]>(
    () => [effectiveLocation.lat, effectiveLocation.lng],
    [effectiveLocation],
  );

  const mapPins = useMemo(
    () =>
      restaurants
        .filter((r) => !Number.isNaN(Number(r.lat)) && !Number.isNaN(Number(r.lng)))
        .map((r) => ({
          id: r.id,
          name: r.name,
          emoji: getEmoji(r.category),
          category: r.category,
          price: "$".repeat(Math.max(1, r.priceLevel || 1)),
          imageUrl: r.imageUrl || r.photos?.[0] || null,
          lat: Number(r.lat),
          lng: Number(r.lng),
        })),
    [restaurants],
  );

  useEffect(() => {
    const withImage = mapPins.filter((p) => Boolean(p.imageUrl && p.imageUrl.trim())).length;
    const withoutImage = mapPins.length - withImage;
    console.log("[liff-map-debug] mapped pins", {
      totalPins: mapPins.length,
      withImage,
      withoutImage,
      sampleImagePins: mapPins
        .filter((p) => Boolean(p.imageUrl && p.imageUrl.trim()))
        .slice(0, 3)
        .map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl })),
    });
  }, [mapPins]);

  const selected = selectedPinId ? restaurants.find((r) => r.id === selectedPinId) : null;

  function recenterToCurrentLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationOverride({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocationError(err.message || "Failed to get location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

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
      <button
        onClick={recenterToCurrentLocation}
        disabled={locating}
        className="absolute right-4 top-[88px] z-[65] h-11 w-11 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center disabled:opacity-70"
        aria-label="Use current location"
        data-testid="button-current-location"
      >
        <LocateFixed className={`w-5 h-5 text-foreground ${locating ? "animate-pulse-soft" : ""}`} />
      </button>
      <div className="absolute left-4 right-20 top-[92px] z-[64]">
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/95 backdrop-blur border border-gray-200 px-3 py-1.5 text-[11px] text-foreground shadow-sm">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {locationOverride ? "Current" : "Default"}: {effectiveLocation.lat.toFixed(4)}, {effectiveLocation.lng.toFixed(4)}
          </span>
        </div>
        {locationError ? <p className="text-[11px] text-red-600 mt-1">{locationError}</p> : null}
      </div>

      {selected && (
        <div className="absolute left-4 right-4 bottom-[24%] z-[45] bg-white rounded-2xl p-3 shadow-lg" data-testid={`card-pin-${selected.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{selected.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.category}</p>
              <p className="text-xs text-muted-foreground truncate">{selected.address}</p>
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
        userLocation={effectiveLocation}
      />

      <SessionBar />
      <BottomNav showBack={false} hidden={!drawerOpen || forceDrawerOpen} />
    </div>
  );
}
