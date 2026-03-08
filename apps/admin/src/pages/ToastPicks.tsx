import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { SaveBucketPicker } from "@/components/SaveBucketPicker";
import { Sparkles, ChevronRight, RefreshCw, Heart, Star } from "lucide-react";
import type { RestaurantResponse } from "@shared/routes";
import mascotPath from "@assets/toast_mascot_nobg.png";

const PROFILE_STORAGE_KEY = "toast_user_profile";

interface UserProfile {
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  defaultBudget: number;
  defaultDistance: string;
}

function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { dietaryRestrictions: [], cuisinePreferences: [], defaultBudget: 2, defaultDistance: "5km" };
}

function getTimeContext(): { meal: string; greeting: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { meal: "breakfast", greeting: "Good morning" };
  if (hour >= 11 && hour < 14) return { meal: "lunch", greeting: "Lunchtime" };
  if (hour >= 14 && hour < 17) return { meal: "afternoon snack", greeting: "Afternoon" };
  if (hour >= 17 && hour < 21) return { meal: "dinner", greeting: "Evening" };
  return { meal: "late night bite", greeting: "Late night" };
}

function scoreRestaurant(
  restaurant: RestaurantResponse,
  tasteProfile: ReturnType<typeof useTasteProfile>["profile"],
  userProfile: UserProfile,
  savedIds: number[]
): number {
  let score = 0;
  const category = restaurant.category.toLowerCase();

  for (const [cuisine, entry] of Object.entries(tasteProfile.likes)) {
    if (category.includes(cuisine.toLowerCase())) {
      score += entry.count * 3;
    }
  }
  for (const [cuisine, entry] of Object.entries(tasteProfile.superLikes)) {
    if (category.includes(cuisine.toLowerCase())) {
      score += entry.count * 5;
    }
  }
  for (const [cuisine, entry] of Object.entries(tasteProfile.dislikes)) {
    if (category.includes(cuisine.toLowerCase())) {
      score -= entry.count * 2;
    }
  }

  if (userProfile.cuisinePreferences.length > 0) {
    for (const pref of userProfile.cuisinePreferences) {
      if (category.includes(pref.toLowerCase())) {
        score += 4;
      }
    }
  }

  if (restaurant.priceLevel <= userProfile.defaultBudget) {
    score += 2;
  } else if (restaurant.priceLevel > userProfile.defaultBudget + 1) {
    score -= 3;
  }

  score += parseFloat(restaurant.rating) * 2;
  score += (restaurant.trendingScore || 50) / 20;
  if (restaurant.isNew) score += 1;
  if (savedIds.includes(restaurant.id)) score -= 5;

  const timeContext = getTimeContext();
  if (timeContext.meal === "breakfast" && (category.includes("brunch") || category.includes("cafe") || category.includes("coffee"))) {
    score += 4;
  }
  if (timeContext.meal === "lunch" && (category.includes("street food") || category.includes("noodles") || category.includes("curry"))) {
    score += 3;
  }
  if (timeContext.meal === "dinner" && (category.includes("fine dining") || category.includes("bbq") || category.includes("seafood"))) {
    score += 3;
  }
  if (timeContext.meal === "late night bite" && (category.includes("ramen") || category.includes("street food") || category.includes("noodles"))) {
    score += 3;
  }
  if (timeContext.meal === "afternoon snack" && (category.includes("dessert") || category.includes("cafe") || category.includes("tea"))) {
    score += 3;
  }

  score += (Math.random() - 0.5) * 2;

  return score;
}

function PickCard({ restaurant, index, onNavigate }: { restaurant: RestaurantResponse; index: number; onNavigate: () => void }) {
  const { isSaved, getBucket } = useSavedRestaurants();
  const [showPicker, setShowPicker] = useState(false);
  const saved = isSaved(restaurant.id);
  const bucket = getBucket(restaurant.id);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.8 + index * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        onClick={onNavigate}
        className="relative overflow-hidden rounded-[20px] cursor-pointer active:scale-[0.98] transition-transform duration-200 gpu-accelerated"
        style={{ boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1), 0 2px 8px -2px rgba(0,0,0,0.04)" }}
        data-testid={`card-pick-${restaurant.id}`}
      >
        <div className="relative h-44 overflow-hidden">
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          {index === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: "spring", stiffness: 300, damping: 20 }}
              className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#FFCC02] rounded-full px-3 py-1.5"
              style={{ boxShadow: "0 2px 10px rgba(255,204,2,0.4)" }}
            >
              <Sparkles className="w-3 h-3 text-[#2d2000]" />
              <span className="text-[10px] font-bold text-[#2d2000] uppercase tracking-wide">Top Pick</span>
            </motion.div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowPicker(true); }}
            className="absolute top-3 right-3 text-lg drop-shadow-md active:scale-125 transition-transform"
            data-testid={`button-save-pick-${restaurant.id}`}
          >
            <Heart className={`w-5 h-5 ${saved ? (bucket === "partner" ? "text-pink-400 fill-pink-400" : "text-red-500 fill-red-500") : "text-white/80"}`} />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-white font-semibold text-lg tracking-tight drop-shadow-sm truncate" data-testid={`text-pick-name-${restaurant.id}`}>{restaurant.name}</h3>
            <p className="text-white/80 text-xs mt-0.5 truncate" data-testid={`text-pick-category-${restaurant.id}`}>{restaurant.category}</p>
          </div>
        </div>
        <div className="bg-white px-4 py-3.5 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold">{restaurant.rating}</span>
            </div>
            <span className="text-muted-foreground/30 flex-shrink-0">·</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">{"฿".repeat(restaurant.priceLevel)}</span>
            <span className="text-muted-foreground/30 flex-shrink-0">·</span>
            <span className="text-xs text-muted-foreground truncate">{restaurant.address}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 ml-2" />
        </div>
      </motion.div>
      <SaveBucketPicker
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        open={showPicker}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

export default function ToastPicks() {
  const [, navigate] = useLocation();
  const { profile: tasteProfile, topPreference, getMoodSignal } = useTasteProfile();
  const { data: savedData } = useSavedRestaurants();
  const [phase, setPhase] = useState<"thinking" | "reveal">("thinking");
  const [refreshKey, setRefreshKey] = useState(0);
  const userProfile = useMemo(() => getUserProfile(), []);
  const timeContext = useMemo(() => getTimeContext(), []);

  const { data: allRestaurants = [] } = useQuery<RestaurantResponse[]>({
    queryKey: ["/api/restaurants"],
  });

  const picks = useMemo(() => {
    if (allRestaurants.length === 0) return [];
    const allSavedIds = [...savedData.mine, ...savedData.partner];
    const scored = allRestaurants.map(r => ({
      restaurant: r,
      score: scoreRestaurant(r, tasteProfile, userProfile, allSavedIds),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(s => s.restaurant);
  }, [allRestaurants, tasteProfile, userProfile, savedData, refreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => setPhase("reveal"), 3200);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  const handleRefresh = () => {
    setPhase("thinking");
    setRefreshKey(k => k + 1);
  };

  const thinkingMessage = useMemo(() => {
    const hour = new Date().getHours();
    const date = new Date().getDate();
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;
    const isEndOfMonth = date >= 25;
    const isStartOfMonth = date <= 5;
    const hasHistory = topPreference.score > 0;

    const lines: string[] = [];

    if (hasHistory) {
      lines.push(`Your ${topPreference.label} taste? Noted.`);
    } else {
      lines.push("Reading your taste...");
    }

    if (isEndOfMonth) {
      lines.push("Month-end, wallet-friendly picks.");
    } else if (isStartOfMonth) {
      lines.push("Payday energy activated.");
    }

    if (isWeekend) {
      lines.push("Weekend mode, no rush.");
    } else if (hour >= 17 && hour < 21) {
      lines.push("Dinner picks loading...");
    } else if (hour >= 11 && hour < 14) {
      lines.push("Lunchtime spot incoming.");
    } else if (hour >= 22 || hour < 5) {
      lines.push("Late night? Say less.");
    }

    return lines;
  }, [topPreference, refreshKey]);

  const reasonText = useMemo(() => {
    const reasons: string[] = [];
    if (topPreference.key !== "Thai") {
      reasons.push(`your love for ${topPreference.label}`);
    }
    reasons.push(`${timeContext.meal} time`);
    if (userProfile.defaultBudget <= 2) {
      reasons.push("your budget");
    }
    if (userProfile.cuisinePreferences.length > 0) {
      reasons.push("your cuisine picks");
    }
    return reasons.length > 0 ? `Based on ${reasons.slice(0, 2).join(" & ")}` : "Curated just for you";
  }, [topPreference, timeContext, userProfile]);

  return (
    <div className="w-full min-h-[100dvh] bg-[hsl(30,20%,97%)]" data-testid="toast-picks-page">
      <div
        className="relative overflow-hidden"
        style={{ background: phase === "thinking" ? "#ffffff" : "linear-gradient(180deg, hsl(45,40%,94%) 0%, hsl(30,20%,97%) 100%)", minHeight: phase === "thinking" ? "100dvh" : "auto", paddingBottom: 40 }}
      >
        {phase !== "thinking" && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #FFCC02 0%, transparent 70%)" }} />
            <div className="absolute top-60 -left-10 w-40 h-40 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #FFCC02 0%, transparent 70%)" }} />
          </div>
        )}

        <div className="relative z-10 px-6 pt-14">
          <AnimatePresence mode="wait">
            {phase === "thinking" ? (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center text-center"
                style={{ minHeight: "70dvh" }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 8, -8, 4, 0],
                    scale: [1, 1.05, 1, 1.03, 1],
                  }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="mb-8"
                >
                  <img src={mascotPath} alt="Toast mascot" className="h-24 mx-auto" />
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-[22px] font-semibold text-foreground tracking-tight leading-snug mb-3"
                  data-testid="text-toast-thinking"
                >
                  Got it. I'll make this<br />easy for you.
                </motion.p>

                <div className="space-y-2 mt-2 max-w-[280px]">
                  {thinkingMessage.map((line, i) => (
                    <motion.p
                      key={`${refreshKey}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.7 }}
                      className="text-sm text-muted-foreground leading-relaxed"
                      data-testid={`text-thinking-line-${i}`}
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + thinkingMessage.length * 0.7 }}
                  className="mt-8 flex gap-1.5"
                >
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#FFCC02]"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: "easeInOut" }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="reveal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/30"
                  >
                    Toast Picks
                  </motion.p>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    onClick={handleRefresh}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md text-muted-foreground text-xs font-medium active:scale-95 transition-transform"
                    data-testid="button-refresh-picks"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </motion.button>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-center mb-8"
                >
                  <p className="text-[11px] font-bold text-muted-foreground/50 mb-2">{timeContext.greeting}</p>
                  <h1 className="text-[24px] font-semibold text-foreground tracking-tight leading-tight mb-2">
                    Here's what I'd pick<br />for your {timeContext.meal}
                  </h1>
                  <p className="text-xs text-muted-foreground">{reasonText}</p>
                </motion.div>

                <div className="space-y-4 pb-32">
                  {picks.map((restaurant, idx) => (
                    <PickCard
                      key={`${restaurant.id}-${refreshKey}`}
                      restaurant={restaurant}
                      index={idx}
                      onNavigate={() => navigate(`/restaurant/${restaurant.id}`)}
                    />
                  ))}

                  {picks.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <img src={mascotPath} alt="Toast mascot" className="h-12 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Still learning your taste — swipe more to unlock personalized picks!</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
