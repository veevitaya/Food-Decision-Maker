import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { EmojiFilter } from "./EmojiFilter";
import { RestaurantRow } from "./RestaurantRow";
import { useRestaurants, useSuggestions } from "@/hooks/use-restaurants";
import { useVibeFrequency, type VibeOption } from "@/hooks/use-vibe-frequency";
import { X } from "lucide-react";
import toastLogoPath from "@assets/toast_logo_nobg.png";

interface SearchResult {
  id: number;
  name: string;
  category: string;
  rating: string;
  address: string;
}

interface BottomSheetProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  isGroup: boolean;
  onToggleGroup: () => void;
  onDrawerStateChange?: (isOpen: boolean) => void;
  searchResults?: SearchResult[];
  searchQuery?: string;
  onClearSearch?: () => void;
  suggestionTitle?: string;
  suggestionSubtitle?: string;
  forceOpen?: boolean;
  isSearchFocused?: boolean;
}


export function BottomSheet({ activeMode, onModeChange, isGroup, onToggleGroup, onDrawerStateChange, searchResults = [], searchQuery = "", onClearSearch, suggestionTitle, suggestionSubtitle, forceOpen, isSearchFocused = false }: BottomSheetProps) {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [showMoreVibes, setShowMoreVibes] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentTranslateRef = useRef(0);
  const isSearching = searchQuery.trim().length > 0;
  const { mainVibes, moreVibes, recordVibe } = useVibeFrequency();

  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useSuggestions();
  const { data: newNearby = [], isLoading: isLoadingNearby } = useRestaurants("new");

  const closedTranslateY = "72%";
  const openTranslateY = "0%";

  const updateOpen = useCallback((newState: boolean) => {
    setIsOpen(newState);
    onDrawerStateChange?.(newState);
  }, [onDrawerStateChange]);

  const toggleOpen = useCallback(() => {
    updateOpen(!isOpen);
  }, [isOpen, updateOpen]);

  useEffect(() => {
    if (forceOpen && !isOpen) {
      updateOpen(true);
    }
  }, [forceOpen, isOpen, updateOpen]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    currentTranslateRef.current = 0;
  }, []);

  const handleSoloClick = () => {
    if (isGroup) onToggleGroup();
    navigate("/solo/quiz");
  };

  const handleGroupClick = () => {
    if (!isGroup) onToggleGroup();
    navigate("/group/setup");
  };

  return (
    <motion.div
      ref={drawerRef}
      initial={{ y: openTranslateY }}
      animate={{ y: isOpen ? openTranslateY : closedTranslateY }}
      transition={{
        type: "spring",
        damping: 22,
        stiffness: 200,
        mass: 1,
      }}
      className="absolute bottom-0 left-0 right-0 rounded-t-[28px] z-50 flex flex-col gpu-accelerated"
      style={{
        background: "#F5F5F5",
        boxShadow: "var(--shadow-drawer)",
        height: "82%",
        touchAction: "none",
      }}
    >
      <div
        className="w-full pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing flex-shrink-0"
        onPointerDown={handlePointerDown}
        onClick={toggleOpen}
      >
        <div className="w-10 h-[5px] bg-gray-300/60 rounded-full" />
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24" style={{ overscrollBehavior: "contain" }}>
        {isSearching ? (
          <div className="px-5 pt-2 pb-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-foreground">
                {searchResults.length > 0
                  ? `${searchResults.length} results for "${searchQuery}"`
                  : `No results for "${searchQuery}"`
                }
              </p>
              <button
                onClick={onClearSearch}
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
                      onClick={() => navigate(`/restaurant/${r.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100/80 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 text-left"
                      style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)" }}
                      data-testid={`drawer-search-result-${r.id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                        {isNameMatch ? "📍" : "🏷️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          ★ {r.rating} · {r.category} · {r.address}
                        </p>
                      </div>
                      {!isNameMatch && (
                        <span className="text-[9px] text-muted-foreground/60 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Similar</span>
                      )}
                      <span className="text-muted-foreground/40 text-xs">›</span>
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
        ) : isSearchFocused ? (
          <div className="px-5 pt-2 pb-5">
            <p className="text-[22px] font-bold text-foreground tracking-tight leading-tight mb-1" data-testid="text-search-heading">
              Let's find what you're craving
            </p>
            <p className="text-[13px] text-muted-foreground mb-5">Start typing or pick a suggestion below</p>

            <div className="space-y-2">
              {suggestions.slice(0, 8).map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/restaurant/${r.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100/80 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 text-left"
                  style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)" }}
                  data-testid={`search-suggestion-${r.id}`}
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(40,50%,96%) 0%, hsl(35,40%,91%) 100%)" }}>
                    {r.category?.includes("Thai") ? "🇹🇭" : r.category?.includes("Japan") ? "🇯🇵" : r.category?.includes("Korean") ? "🇰🇷" : r.category?.includes("Italian") || r.category?.includes("Pizza") ? "🍕" : r.category?.includes("Burger") ? "🍔" : r.category?.includes("Ramen") || r.category?.includes("Noodle") ? "🍜" : r.category?.includes("Seafood") ? "🦐" : r.category?.includes("Cocktail") || r.category?.includes("Bar") || r.category?.includes("Rooftop") ? "🍸" : r.category?.includes("Coffee") || r.category?.includes("Cafe") ? "☕" : r.category?.includes("Dessert") || r.category?.includes("Ice") ? "🍰" : "🍽️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      ★ {r.rating} · {r.category}
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 bg-gray-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    {Number(r.trendingScore) >= 90 ? "🔥 Hot" : Number(r.trendingScore) >= 80 ? "📈 Trending" : "✨ Try"}
                  </span>
                  <span className="text-muted-foreground/40 text-xs">›</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 pt-1 pb-4">
              <h2 className="text-[22px] font-bold text-foreground mb-5 flex items-baseline gap-1.5 flex-wrap" data-testid="text-let-toast">
                <span style={{ display: isOpen ? "inline" : "none" }}>
                  Let <img src={toastLogoPath} alt="Toast" className="h-[34px] inline-block" style={{ verticalAlign: "bottom", marginBottom: "2px" }} /> decides
                </span>
                <span style={{ display: isOpen ? "none" : "inline" }}>Quick start</span>
              </h2>

              {isOpen ? (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={handleSoloClick}
                    data-testid="button-solo"
                    className={`flex items-center gap-3 py-4 px-5 rounded-[20px] transition-all duration-200 active:scale-[0.97] relative overflow-hidden gpu-accelerated ${
                      !isGroup
                        ? "bg-white dark:bg-card border border-gray-100/80 dark:border-border"
                        : "bg-white dark:bg-card border border-gray-100/60 dark:border-border"
                    }`}
                    style={{
                      boxShadow: !isGroup
                        ? "0 6px 24px -6px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)"
                        : "0 3px 12px -4px rgba(0,0,0,0.06), 0 1px 4px -1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    <span className="text-[28px]">👨‍🍳</span>
                    <div className="text-left">
                      <span className="font-bold text-[15px] tracking-tight block">Solo</span>
                      <span className="text-[11px] text-muted-foreground font-medium">Just for you</span>
                    </div>
                  </button>

                  <button
                    onClick={handleGroupClick}
                    data-testid="button-group"
                    className={`flex items-center gap-3 py-4 px-5 rounded-[20px] transition-all duration-200 active:scale-[0.97] relative overflow-hidden gpu-accelerated ${
                      isGroup
                        ? "bg-white dark:bg-card border border-gray-100/80 dark:border-border"
                        : "bg-white dark:bg-card border border-gray-100/60 dark:border-border"
                    }`}
                    style={{
                      boxShadow: isGroup
                        ? "0 6px 24px -6px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)"
                        : "0 3px 12px -4px rgba(0,0,0,0.06), 0 1px 4px -1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    <span className="text-[28px]">🤝</span>
                    <div className="text-left">
                      <span className="font-bold text-[15px] tracking-tight block">Group</span>
                      <span className="text-[11px] text-muted-foreground font-medium">With friends</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={handleSoloClick}
                    data-testid="button-solo"
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-150 active:scale-[0.95] gpu-accelerated ${
                      !isGroup
                        ? "bg-white border-2 border-amber-300/70"
                        : "bg-white border-2 border-gray-200"
                    }`}
                    style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)" }}
                  >
                    <span className="text-lg">👨‍🍳</span>
                    <span className="font-bold text-sm">Solo</span>
                  </button>
                  <button
                    onClick={handleGroupClick}
                    data-testid="button-group"
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-150 active:scale-[0.95] gpu-accelerated ${
                      isGroup
                        ? "bg-white border-2 border-amber-300/70"
                        : "bg-white border-2 border-gray-200"
                    }`}
                    style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)" }}
                  >
                    <span className="text-lg">🤝</span>
                    <span className="font-bold text-sm">Group</span>
                  </button>
                </div>
              )}

              <h3 className="text-[15px] font-bold text-foreground mb-3">Pick a vibe</h3>

              {(() => {
                const squareVibes = mainVibes.filter(v => v.variant === "square");
                const wideVibes = mainVibes.filter(v => v.variant === "wide");

                const handleVibeClick = (v: VibeOption) => {
                  recordVibe(v.mode);
                  onModeChange(v.mode);
                  navigate(`/swipe?mode=${v.mode}`);
                };

                return (
                  <>
                    {squareVibes.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-2.5">
                        {squareVibes.map(v => (
                          <EmojiFilter key={v.mode} emoji={v.emoji} label={v.label} active={activeMode === v.mode} onClick={() => handleVibeClick(v)} />
                        ))}
                      </div>
                    )}
                    {wideVibes.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-2.5">
                        {wideVibes.map(v => (
                          <EmojiFilter key={v.mode} emoji={v.emoji} label={v.label} active={activeMode === v.mode} onClick={() => handleVibeClick(v)} variant="wide" />
                        ))}
                      </div>
                    )}
                    {moreVibes.length > 0 && (
                      <div className="grid grid-cols-1 mt-1">
                        <button
                          onClick={() => setShowMoreVibes(true)}
                          data-testid="button-more-vibes"
                          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white border border-gray-200/80 hover:border-gray-300 active:scale-[0.97] transition-all duration-200 gpu-accelerated"
                          style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)" }}
                        >
                          <span className="text-lg">🎲</span>
                          <span className="font-semibold text-sm text-foreground">More vibes</span>
                          <span className="text-[11px] text-muted-foreground bg-gray-200/60 px-2 py-0.5 rounded-full ml-1">{moreVibes.length}</span>
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}

              <AnimatePresence>
                {showMoreVibes && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
                    className="fixed inset-0 z-[100] flex items-end justify-center"
                    onClick={() => setShowMoreVibes(false)}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 22, stiffness: 200, mass: 1 }}
                      className="relative w-full max-w-md bg-white rounded-t-[28px] px-6 pt-4 pb-8 max-h-[80vh] overflow-y-auto"
                      style={{ boxShadow: "0 -10px 40px rgba(0,0,0,0.12)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[17px] font-bold text-foreground">More vibes</h3>
                        <button
                          onClick={() => setShowMoreVibes(false)}
                          data-testid="button-close-more-vibes"
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          <X size={16} className="text-muted-foreground" />
                        </button>
                      </div>
                      <p className="text-[12px] text-muted-foreground mb-4">Use these more often and they'll move to your main vibes</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {moreVibes.map((v) => (
                          <div key={v.mode}>
                            <EmojiFilter
                              emoji={v.emoji}
                              label={v.label}
                              active={activeMode === v.mode}
                              onClick={() => {
                                recordVibe(v.mode);
                                onModeChange(v.mode);
                                setShowMoreVibes(false);
                                navigate(`/swipe?mode=${v.mode}`);
                              }}
                              variant="wide"
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <RestaurantRow
              title="New near you"
              restaurants={newNearby}
              isLoading={isLoadingNearby}
              size="xl"
              category="New"
            />

            <RestaurantRow
              title={suggestionTitle || "Because you like Pad Thai..."}
              subtitle={suggestionSubtitle || "Places you might love"}
              restaurants={suggestions}
              isLoading={isLoadingSuggestions}
              size="default"
              category="Suggestions"
            />

            <div className="px-6 mt-6 mb-4">
              <button
                onClick={() => navigate("/toast-picks")}
                data-testid="button-toast-picks"
                className="w-full relative overflow-hidden rounded-[24px] p-5 text-left active:scale-[0.97] transition-transform duration-150 gpu-accelerated"
                style={{
                  background: "linear-gradient(135deg, hsl(40,50%,96%) 0%, hsl(35,40%,93%) 50%, hsl(30,35%,91%) 100%)",
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
                }}
              >
                <div className="absolute top-3 right-4 text-3xl opacity-40">🍞</div>
                <div className="absolute bottom-2 right-12 text-xl opacity-20">✨</div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-1">Can't decide?</p>
                <p className="text-[16px] font-semibold text-foreground tracking-tight leading-snug pr-10">Let Toast pick for you</p>
                <p className="text-[12px] text-muted-foreground mt-1">Personalized picks based on your taste</p>
              </button>
            </div>

          </>
        )}
      </div>
    </motion.div>
  );
}
