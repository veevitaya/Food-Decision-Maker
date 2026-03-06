import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import mascotPath from "@assets/image_1772011321697.png";
import { useRestaurants } from "@/hooks/use-restaurants";
import { useUserLocation } from "@/hooks/use-user-location";
import type { RestaurantResponse } from "@shared/routes";

type MenuItem = {
  id: number;
  name: string;
  type: string;
  tags: string[];
  restaurantCount: number;
  imageUrl: string;
  budget: string;
  interests: string[];
  dietary: string[];
  setting: string[];
};

function parseQuizParams(): { cuisines: string[]; diet: string[]; locations: string[]; budget: string[]; interests: string[] } {
  const params = new URLSearchParams(window.location.search);
  return {
    cuisines: params.get("cuisines")?.split(",").filter(Boolean) || [],
    diet: params.get("diet")?.split(",").filter(Boolean) || [],
    locations: params.get("locations")?.split(",").filter(Boolean) || [],
    budget: params.get("budget")?.split(",").filter(Boolean) || [],
    interests: params.get("interests")?.split(",").filter(Boolean) || [],
  };
}

function inferType(category: string): string {
  return category.split("•")[0]?.trim() || "Other";
}

function inferBudget(priceLevel: number | null | undefined): string {
  if (!priceLevel || priceLevel <= 1) return "Cheap";
  if (priceLevel === 2) return "Moderate";
  if (priceLevel === 3) return "Fancy";
  return "Expensive";
}

function inferDietary(category: string, description: string): string[] {
  const source = `${category} ${description}`.toLowerCase();
  const out: string[] = [];
  if (source.includes("vegan")) out.push("Vegan");
  if (source.includes("vegetarian")) out.push("Vegetarian");
  if (source.includes("halal")) out.push("Halal");
  if (source.includes("gluten")) out.push("Gluten-Free");
  return out;
}

function inferInterests(item: RestaurantResponse): string[] {
  const out: string[] = [];
  if ((item.trendingScore || 0) >= 85) out.push("Popular spots");
  if ((item.priceLevel || 1) <= 2) out.push("Budget-friendly");
  if ((item.priceLevel || 1) >= 3) out.push("Fine dining");
  if ((item.description || "").toLowerCase().includes("spicy")) out.push("Hot & spicy");
  if (out.length === 0) out.push("Comfort food");
  return out;
}

function inferSetting(item: RestaurantResponse): string[] {
  const source = `${item.category} ${item.address}`.toLowerCase();
  const out: string[] = [];
  if (source.includes("street")) out.push("Street food");
  if (source.includes("mall")) out.push("At the mall");
  if (source.includes("bts")) out.push("Near BTS");
  if (source.includes("late") || source.includes("night")) out.push("Late night");
  if ((item.trendingScore || 0) >= 90) out.push("Trendy spots");
  if (out.length === 0) out.push("Restaurants");
  return out;
}

function toMenuItems(restaurants: RestaurantResponse[]): MenuItem[] {
  const counts: Record<string, number> = {};
  for (const r of restaurants) {
    const type = inferType(r.category);
    counts[type] = (counts[type] || 0) + 1;
  }

  return restaurants.map((r) => {
    const type = inferType(r.category);
    const budget = inferBudget(r.priceLevel);
    return {
      id: r.id,
      name: r.name,
      type,
      tags: [`★ ${r.rating}`, `💸 ${"$".repeat(Math.max(1, r.priceLevel || 1))}`, `📍 ${r.address.split(",")[0] || r.address}`],
      restaurantCount: counts[type] || 1,
      imageUrl: r.imageUrl,
      budget,
      interests: inferInterests(r),
      dietary: inferDietary(r.category, r.description),
      setting: inferSetting(r),
    };
  });
}

function filterMenus(quizAnswers: ReturnType<typeof parseQuizParams>, pool: MenuItem[]): MenuItem[] {
  const { cuisines, diet, locations, budget, interests } = quizAnswers;
  const hasFilters = cuisines.length || diet.length || locations.length || budget.length || interests.length;
  if (!hasFilters) return pool;

  const scored = pool.map((item) => {
    let score = 0;

    if (cuisines.length) {
      for (const c of cuisines) {
        if (item.type.toLowerCase() === c.toLowerCase()) score += 10;
      }
    }

    if (budget.length) {
      if (budget.includes(item.budget)) score += 5;
      const budgetRank = ["Cheap", "Moderate", "Fancy", "Expensive"];
      const itemIdx = budgetRank.indexOf(item.budget);
      for (const b of budget) {
        const bIdx = budgetRank.indexOf(b);
        if (bIdx >= 0 && Math.abs(itemIdx - bIdx) <= 1 && !budget.includes(item.budget)) score += 2;
      }
    }

    if (interests.length) {
      for (const i of interests) {
        if (item.interests.includes(i)) score += 4;
      }
    }

    if (diet.length) {
      for (const d of diet) {
        if (item.dietary.includes(d)) score += 6;
      }
    }

    if (locations.length) {
      for (const l of locations) {
        if (item.setting.includes(l)) score += 3;
      }
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const filtered = scored.filter((s) => s.score > 0).map((s) => s.item);
  return filtered.length >= 2 ? filtered : pool;
}

function ToastMascot({ pointDirection }: { pointDirection: "left" | "right" | "center" }) {
  const xShift = pointDirection === "left" ? -16 : pointDirection === "right" ? 16 : 0;

  return (
    <motion.div
      className="flex flex-col items-center mb-2"
      animate={{ x: xShift }}
      transition={{ type: "spring", damping: 14, stiffness: 140 }}
    >
      <motion.div
        className="relative"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.img
          src={mascotPath}
          alt="Toast mascot"
          className="h-24 w-auto object-contain"
          animate={{ rotate: pointDirection === "left" ? -10 : pointDirection === "right" ? 10 : [0, 3, -3, 0] }}
          transition={pointDirection === "center" ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { type: "spring", damping: 12, stiffness: 120 }}
        />
        <motion.div
          className="absolute -top-1 -right-2 text-lg"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function SoloResults() {
  const [, navigate] = useLocation();
  const userLocation = useUserLocation();
  const { data: restaurants = [], isLoading } = useRestaurants({
    lat: userLocation.lat,
    lng: userLocation.lng,
    radius: 5000,
    limit: 60,
    localOnly: true,
    sourcePreference: "osm-first",
  });

  const quizAnswers = useMemo(() => parseQuizParams(), []);
  const menuPool = useMemo(() => toMenuItems(restaurants), [restaurants]);
  const filteredMenus = useMemo(() => filterMenus(quizAnswers, menuPool), [quizAnswers, menuPool]);

  const hasFilters = quizAnswers.cuisines.length || quizAnswers.diet.length || quizAnswers.locations.length || quizAnswers.budget.length || quizAnswers.interests.length;

  const allFilterChips = [
    ...quizAnswers.cuisines.map((c) => ({ label: c, type: "cuisine" })),
    ...quizAnswers.budget.map((b) => ({ label: b, type: "budget" })),
    ...quizAnswers.diet.map((d) => ({ label: d, type: "diet" })),
    ...quizAnswers.locations.map((l) => ({ label: l, type: "location" })),
    ...quizAnswers.interests.map((i) => ({ label: i, type: "interest" })),
  ];

  const [currentChoice, setCurrentChoice] = useState<MenuItem | null>(null);
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());
  const [leftOption, setLeftOption] = useState<MenuItem | null>(null);
  const [rightOption, setRightOption] = useState<MenuItem | null>(null);
  const [round, setRound] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(null);
  const [replacingSide, setReplacingSide] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    if (filteredMenus.length < 2) return;
    setCurrentChoice(null);
    setUsedIds(new Set([filteredMenus[0].id, filteredMenus[1].id]));
    setLeftOption(filteredMenus[0]);
    setRightOption(filteredMenus[1]);
    setRound(1);
    setSelectedSide(null);
    setReplacingSide(null);
    setAnimating(false);
  }, [filteredMenus]);

  const getNextMenu = () => {
    if (!leftOption || !rightOption) return null;
    const currentIds = new Set([leftOption.id, rightOption.id]);
    const remaining = filteredMenus.filter((m) => !usedIds.has(m.id) && !currentIds.has(m.id));
    if (remaining.length === 0) {
      const allOther = filteredMenus.filter((m) => !currentIds.has(m.id));
      if (allOther.length === 0) return filteredMenus[0] || null;
      return allOther[Math.floor(Math.random() * allOther.length)];
    }
    return remaining[Math.floor(Math.random() * remaining.length)];
  };

  const handleSelect = (side: "left" | "right") => {
    if (animating || !leftOption || !rightOption) return;
    setAnimating(true);
    setSelectedSide(side);

    const chosen = side === "left" ? leftOption : rightOption;
    setCurrentChoice(chosen);

    const otherSide = side === "left" ? "right" : "left";

    setTimeout(() => {
      setReplacingSide(otherSide);
    }, 500);

    setTimeout(() => {
      const nextMenu = getNextMenu();
      if (!nextMenu) return;
      setUsedIds((prev) => new Set([...Array.from(prev), nextMenu.id]));

      if (otherSide === "left") setLeftOption(nextMenu);
      else setRightOption(nextMenu);

      setTimeout(() => {
        setSelectedSide(null);
        setReplacingSide(null);
        setAnimating(false);
        setRound((r) => r + 1);
      }, 400);
    }, 800);
  };

  const handleReadyToEat = () => {
    const finalChoice = currentChoice || leftOption;
    if (!finalChoice) return;
    navigate(`/restaurants?category=${encodeURIComponent(finalChoice.name)}`);
  };

  const getMascotDirection = (): "left" | "right" | "center" => {
    if (!selectedSide) return "center";
    return selectedSide;
  };

  const renderCard = (opt: MenuItem, side: "left" | "right") => {
    const isSelected = selectedSide === side;
    const isDismissed = selectedSide !== null && selectedSide !== side;
    const isReplacing = replacingSide === side;
    const isCurrentChoice = currentChoice?.id === opt.id;

    return (
      <div className="flex-1" key={`slot-${side}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={opt.id}
            initial={isReplacing ? { y: 30, opacity: 0, scale: 0.9 } : false}
            animate={{ y: 0, opacity: isDismissed && !isReplacing ? 0.4 : 1, scale: isSelected ? 1.02 : isDismissed && !isReplacing ? 0.95 : 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 250 }}
            className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 relative ${isSelected || isCurrentChoice ? "ring-2 ring-[#FFCC02]" : ""}`}
            style={{ boxShadow: isSelected || isCurrentChoice ? "0 12px 35px -8px rgba(255,204,2,0.25)" : "0 4px 20px -4px rgba(0,0,0,0.08)" }}
            onClick={() => handleSelect(side)}
            data-testid={`card-option-${side === "left" ? 1 : 2}`}
          >
            <div className="w-full aspect-[4/3] overflow-hidden relative">
              <img src={opt.imageUrl} alt={opt.name} className="w-full h-full object-cover" />
              {isSelected && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 bg-[#FFCC02]/20 flex items-center justify-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }} className="w-12 h-12 rounded-full bg-[#FFCC02] flex items-center justify-center" style={{ boxShadow: "0 4px 15px rgba(255,204,2,0.5)" }}>
                    <span className="text-[#2d2000] text-xl font-bold">✓</span>
                  </motion.div>
                </motion.div>
              )}
            </div>

            {(isCurrentChoice && !isSelected) && (
              <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#FFCC02] flex items-center justify-center z-10" style={{ boxShadow: "0 2px 8px rgba(255,204,2,0.4)" }}>
                <span className="text-[#2d2000] text-xs font-bold">✓</span>
              </div>
            )}

            <div className="p-3.5">
              <h3 className="font-bold text-[15px] mb-0.5">{opt.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{opt.type}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {opt.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-gray-100 rounded-full px-2 py-0.5 font-medium">{tag}</span>
                ))}
              </div>
              <p className="text-xs font-semibold text-muted-foreground">📍 {opt.restaurantCount} places</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  if (isLoading || !leftOption || !rightOption) {
    return (
      <div className="w-full min-h-[100dvh] bg-white flex items-center justify-center" data-testid="solo-results-loading">
        <p className="text-sm text-muted-foreground">Loading options...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-white flex flex-col items-center pt-10 px-6 pb-32" data-testid="solo-results-page">
      <div className="w-full flex items-center justify-center mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Round {round}</span>
      </div>

      {hasFilters > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your preferences</span>
            <span className="text-[10px] text-muted-foreground">({filteredMenus.length} matches)</span>
          </div>
          <div className="flex flex-wrap gap-1.5" data-testid="filter-chips">
            {allFilterChips.map((chip) => (
              <span
                key={`${chip.type}-${chip.label}`}
                className={`text-[10px] font-medium rounded-full px-2.5 py-1 ${
                  chip.type === "cuisine" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                  chip.type === "budget" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  chip.type === "diet" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                  chip.type === "location" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
                data-testid={`chip-filter-${chip.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <ToastMascot pointDirection={getMascotDirection()} />

      <h2 className="text-lg font-semibold mb-0.5" data-testid="text-choose-prompt">
        Which one sounds better?
      </h2>
      <p className="text-xs text-muted-foreground mb-5">Tap to pick — the other gets replaced</p>

      {currentChoice && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-100 rounded-full px-4 py-2">
          <span className="text-xs">🍽️</span>
          <span className="text-xs font-semibold text-foreground">Current pick: {currentChoice.name}</span>
        </motion.div>
      )}

      <div className="flex gap-3.5 w-full max-w-md mb-6">
        {renderCard(leftOption, "left")}
        {renderCard(rightOption, "right")}
      </div>

      <motion.button
        onClick={handleReadyToEat}
        data-testid="button-ready-to-eat"
        whileTap={{ scale: 0.96 }}
        className="w-full max-w-md py-4 rounded-full bg-[#FFCC02] text-[#2d2000] font-bold text-sm mb-4"
        style={{ boxShadow: "0 6px 20px -4px rgba(255,204,2,0.4)" }}
      >
        🍽️ Ready to eat!{currentChoice ? ` — ${currentChoice.name}` : ""}
      </motion.button>

      <div className="flex gap-3">
        <motion.button onClick={() => navigate("/")} data-testid="button-search" whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-gray-200 text-sm font-medium" style={{ boxShadow: "var(--shadow-sm)" }}>
          🔍 Search
        </motion.button>
        <motion.button onClick={() => navigate("/swipe")} data-testid="button-swipe-mode" whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-gray-200 text-sm font-medium" style={{ boxShadow: "var(--shadow-sm)" }}>
          🍽️ Swipe
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}
