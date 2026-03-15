import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { Sparkles, Clock, Wallet, TrendingUp, MapPin, Search, UtensilsCrossed, X, Check } from "lucide-react";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { useRestaurants } from "@/hooks/use-restaurants";
import { shareWithLiffOrClipboard } from "@/lib/share";
import { useLanguage } from "@/i18n/LanguageProvider";
import mascotPath from "@assets/image_1772011321697.png";
import drunkToastPath from "@assets/drunk_toast_nobg.png";

interface MenuItem {
  id: number;
  name: string;
  type: string;
  tags: string[];
  restaurantCount: number;
  imageUrl: string;
  budget: "Cheap" | "Moderate" | "Fancy" | "Expensive";
  interests: string[];
  dietary: string[];
  setting: string[];
}


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

function filterMenus(quizAnswers: ReturnType<typeof parseQuizParams>, menuPool: MenuItem[]): MenuItem[] {
  const { cuisines, diet, locations, budget, interests } = quizAnswers;
  const hasFilters = cuisines.length || diet.length || locations.length || budget.length || interests.length;
  if (!hasFilters) return menuPool;

  const scored = menuPool.map((item) => {
    let score = 0;

    if (cuisines.length) {
      const typeMap: Record<string, string[]> = {
        "Thai": ["Thai"], "Japanese": ["Japanese"], "Chinese": ["Chinese"],
        "Korean": ["Korean"], "Italian": ["Italian"], "Seafood": ["Seafood"],
        "Indian": ["Indian"], "Mexican": ["Mexican"], "Western": ["Western"],
        "French": ["French"], "Taiwanese": ["Taiwanese"],
      };
      for (const c of cuisines) {
        if (typeMap[c]?.includes(item.type)) score += 10;
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
  return filtered.length >= 2 ? filtered : menuPool;
}

function ToastMascot({ pointDirection, drunk = false }: { pointDirection: "left" | "right" | "center"; drunk?: boolean }) {
  const xShift = pointDirection === "left" ? -16 : pointDirection === "right" ? 16 : 0;

  if (drunk) {
    return (
      <motion.div
        className="flex flex-col items-center mb-2 relative"
        animate={{ x: xShift }}
        transition={{ type: "spring", damping: 14, stiffness: 140 }}
      >
        <div className="relative h-28 w-20">
          <img
            src={drunkToastPath}
            alt="Drunk toast mascot"
            className="h-[100px] w-[100px] object-contain absolute animate-drunk-stumble gpu-accelerated drop-shadow-md"
            style={{ bottom: 0 }}
            data-testid="img-drunk-toast-mascot"
          />
        </div>
      </motion.div>
    );
  }

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
          animate={{
            rotate: pointDirection === "left" ? -10 : pointDirection === "right" ? 10 : [0, 3, -3, 0],
          }}
          transition={
            pointDirection === "center"
              ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
              : { type: "spring", damping: 12, stiffness: 120 }
          }
        />
        <motion.div
          className="absolute -top-1 -right-2 text-lg"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-4 h-4" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function getPersonalizedThinkingSteps(
  tasteData: { topKey: string; topLabel: string; score: number },
  quizBudget: string[],
  quizInterests: string[],
) {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const date = new Date().getDate();
  const isWeekend = day === 0 || day === 6;
  const isEndOfMonth = date >= 25;
  const isStartOfMonth = date <= 5;
  const hasHistory = tasteData.score > 0;

  const timeLabel = hour >= 6 && hour < 11 ? "morning" : hour >= 11 && hour < 14 ? "lunch" : hour >= 14 && hour < 17 ? "afternoon" : hour >= 17 && hour < 21 ? "dinner" : "late night";

  const step1Variants = hasHistory
    ? [
        `Noted: you love ${tasteData.topLabel}`,
        `Reading your ${tasteData.topLabel} vibe`,
        `${tasteData.topLabel} fan, got it`,
      ]
    : [
        "Reading your vibe...",
        "Checking your taste...",
      ];

  const budgetLabel = quizBudget.length > 0 ? quizBudget[0] : "";
  const step2Variants = isEndOfMonth && budgetLabel !== "Fancy"
    ? [
        "Month-end, keeping it easy",
        "Wallet-friendly mode on",
      ]
    : isStartOfMonth
      ? [
          "Payday? Time to treat yourself",
          "Fresh month, fresh picks",
        ]
      : budgetLabel === "Cheap"
        ? [
            "Budget-smart picks loaded",
            "Great food, gentle price",
          ]
        : budgetLabel === "Fancy" || budgetLabel === "Expensive"
          ? [
              "Going fancy tonight",
              "Premium picks only",
            ]
          : [
              "Matching your budget...",
              "Finding your price range...",
            ];

  const step3Variants = isWeekend
    ? [
        "Weekend treat mode",
        `${timeLabel} weekend vibes`,
      ]
    : timeLabel === "lunch"
      ? [
          "Lunchtime, on it",
          "Midday pick locked in",
        ]
      : timeLabel === "dinner"
        ? [
            "Dinner mood set",
            "Evening pick coming up",
          ]
        : timeLabel === "late night"
          ? [
              "Late night cravings? Say less",
              "Midnight spot loading",
            ]
          : timeLabel === "morning"
            ? [
                "Morning pick incoming",
                "Fresh start, fresh food",
              ]
            : [
                "Afternoon pick-me-up",
                "Right now, right food",
              ];

  const hasHealthy = quizInterests.includes("Healthy");
  const hasSpicy = quizInterests.includes("Hot & spicy");
  const hasComfort = quizInterests.includes("Comfort food");
  const step4Variants = hasHealthy
    ? [
        "Healthy match found",
        "Clean eats, locked in",
      ]
    : hasSpicy
      ? [
          "Bringing the heat",
          "Spice level: maximum",
        ]
      : hasComfort
        ? [
            "Comfort food, coming up",
            "Cozy pick ready",
          ]
        : [
            "Locking in your match...",
            "Almost there...",
          ];

  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  return [
    { icon: Clock, label: pick(step1Variants), delay: 0 },
    { icon: Wallet, label: pick(step2Variants), delay: 0.7 },
    { icon: TrendingUp, label: pick(step3Variants), delay: 1.4 },
    { icon: MapPin, label: pick(step4Variants), delay: 2.1 },
  ];
}

export default function SoloResults() {
  const [, navigate] = useLocation();
  const { topPreference } = useTasteProfile();
  const { t } = useLanguage();
  const { data: apiRestaurants = [] } = useRestaurants();

  const quizAnswers = useMemo(() => parseQuizParams(), []);
  const menuPool = useMemo<MenuItem[]>(() => {
    return apiRestaurants.map((r) => {
      const descriptionTerms = (r.description ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3);
      const priceLevel = Number(r.priceLevel ?? 2);
      const budget = priceLevel <= 1 ? "Cheap" : priceLevel === 2 ? "Moderate" : priceLevel === 3 ? "Fancy" : "Expensive";
      return {
        id: r.id,
        name: r.name,
        type: r.category || "Restaurant",
        tags: descriptionTerms.length > 0 ? descriptionTerms : ["Popular spots"],
        restaurantCount: 1,
        imageUrl: r.imageUrl || "",
        budget,
        interests: ["Popular spots"],
        dietary: [],
        setting: ["Restaurants"],
      } as MenuItem;
    });
  }, [apiRestaurants]);
  const filteredMenus = useMemo(() => filterMenus(quizAnswers, menuPool), [quizAnswers, menuPool]);
  const isDrinksMode = quizAnswers.interests.includes("Drinks");

  const hasFilters = quizAnswers.cuisines.length || quizAnswers.diet.length || quizAnswers.locations.length || quizAnswers.budget.length || quizAnswers.interests.length;

  const allFilterChips = [
    ...quizAnswers.cuisines.map((c) => ({ label: c, type: "cuisine" })),
    ...quizAnswers.budget.map((b) => ({ label: b, type: "budget" })),
    ...quizAnswers.diet.map((d) => ({ label: d, type: "diet" })),
    ...quizAnswers.locations.map((l) => ({ label: l, type: "location" })),
    ...quizAnswers.interests.map((i) => ({ label: i, type: "interest" })),
  ];

  const [currentChoice, setCurrentChoice] = useState<MenuItem | null>(null);
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set([filteredMenus[0]?.id, filteredMenus[1]?.id].filter(Boolean)));
  const [leftOption, setLeftOption] = useState<MenuItem | null>(filteredMenus[0] ?? null);
  const [rightOption, setRightOption] = useState<MenuItem | null>(filteredMenus[1] ?? null);
  const [round, setRound] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(null);
  const [replacingSide, setReplacingSide] = useState<"left" | "right" | null>(null);
  const [showDecideForMe, setShowDecideForMe] = useState(false);
  const [decideStep, setDecideStep] = useState<"analyzing" | "result">("analyzing");
  const [aiRecommendation, setAiRecommendation] = useState<MenuItem | null>(null);
  const [shareState, setShareState] = useState("");

  useEffect(() => {
    if (filteredMenus.length === 0) return;
    if (!leftOption) setLeftOption(filteredMenus[0]);
    if (!rightOption) setRightOption(filteredMenus[1] ?? filteredMenus[0]);
  }, [filteredMenus, leftOption, rightOption]);

  const handleShareResult = async () => {
    const choice = currentChoice || aiRecommendation || leftOption;
    if (!choice) return;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(choice.name + " Bangkok")}`;
    const method = await shareWithLiffOrClipboard(`Toast solo pick: ${choice.name}\nMaps: ${mapsUrl}`);
    setShareState(method === "clipboard" ? "Copied to clipboard." : method === "failed" ? "Share failed." : "Shared.");
  };

  const getNextMenu = () => {
    if (!leftOption || !rightOption) return null;
    const currentIds = new Set([leftOption.id, rightOption.id]);
    const remaining = filteredMenus.filter((m) => !usedIds.has(m.id) && !currentIds.has(m.id));
    if (remaining.length === 0) {
      const allOther = filteredMenus.filter((m) => !currentIds.has(m.id));
      if (allOther.length === 0) {
        const anyOther = menuPool.filter((m) => !currentIds.has(m.id));
        return anyOther[Math.floor(Math.random() * anyOther.length)] ?? null;
      }
      return allOther[Math.floor(Math.random() * allOther.length)];
    }
    return remaining[Math.floor(Math.random() * remaining.length)];
  };

  const handleSelect = (side: "left" | "right") => {
    if (animating) return;
    if (!leftOption || !rightOption) return;
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
      if (!nextMenu) {
        setSelectedSide(null);
        setReplacingSide(null);
        setAnimating(false);
        return;
      }
      setUsedIds((prev) => new Set([...prev, nextMenu.id]));

      if (otherSide === "left") {
        setLeftOption(nextMenu);
      } else {
        setRightOption(nextMenu);
      }

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

  const getTimeContext = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return { period: "morning", label: "Morning", suggestion: "Something light and energizing" };
    if (hour >= 11 && hour < 14) return { period: "lunch", label: "Lunch time", suggestion: "A satisfying midday meal" };
    if (hour >= 14 && hour < 17) return { period: "afternoon", label: "Afternoon", suggestion: "A snack or late lunch" };
    if (hour >= 17 && hour < 21) return { period: "dinner", label: "Dinner time", suggestion: "Something hearty and fulfilling" };
    return { period: "latenight", label: "Late night", suggestion: "Late-night comfort food" };
  };

  const getDayContext = () => {
    const day = new Date().getDay();
    const date = new Date().getDate();
    const isWeekend = day === 0 || day === 6;
    const isPayday = date >= 25 || date <= 5;
    return { isWeekend, isPayday };
  };

  const generateAiRecommendation = (): MenuItem | null => {
    const timeCtx = getTimeContext();
    const dayCtx = getDayContext();

    const scored = filteredMenus.map((item) => {
      let score = Math.random() * 5;

      if (timeCtx.period === "morning" && (item.tags.some(t => t.includes("Coffee") || t.includes("Brunch") || t.includes("Pancake")) || item.interests.includes("Coffee"))) score += 15;
      if (timeCtx.period === "lunch" && item.budget !== "Expensive") score += 8;
      if (timeCtx.period === "dinner" && (item.interests.includes("Popular spots") || item.interests.includes("Comfort food"))) score += 10;
      if (timeCtx.period === "latenight" && item.setting.includes("Late night")) score += 12;
      if (timeCtx.period === "afternoon" && (item.interests.includes("Coffee") || item.interests.includes("Dessert"))) score += 10;

      if (dayCtx.isWeekend && item.budget !== "Cheap") score += 5;
      if (dayCtx.isPayday && (item.budget === "Fancy" || item.budget === "Expensive")) score += 8;
      if (!dayCtx.isPayday && item.budget === "Cheap") score += 6;

      if (item.restaurantCount > 10) score += 4;
      if (item.interests.includes("Popular spots")) score += 3;
      if (item.interests.includes("Comfort food")) score += 2;

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.item ?? filteredMenus[0] ?? null;
  };

  const handleDecideForMe = () => {
    setShowDecideForMe(true);
    setDecideStep("analyzing");

    const recommendation = generateAiRecommendation();
    setAiRecommendation(recommendation);

    setTimeout(() => {
      setDecideStep("result");
    }, 3400);
  };

  const handleAcceptRecommendation = () => {
    if (aiRecommendation) {
      navigate(`/restaurants?category=${encodeURIComponent(aiRecommendation.name)}`);
    }
  };

  const getMascotDirection = (): "left" | "right" | "center" => {
    if (!selectedSide) return "center";
    return selectedSide;
  };

  const renderCard = (opt: MenuItem | null, side: "left" | "right") => {
    if (!opt) {
      return (
        <div className="flex-1" key={`slot-${side}`}>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 h-full text-xs text-muted-foreground">
            No option
          </div>
        </div>
      );
    }
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
            animate={{
              y: 0,
              opacity: isDismissed && !isReplacing ? 0.4 : 1,
              scale: isSelected ? 1.02 : isDismissed && !isReplacing ? 0.95 : 1,
            }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 250 }}
            className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 relative ${
              isSelected || isCurrentChoice ? "ring-2 ring-[#FFCC02]" : ""
            } ${isDrinksMode ? (side === "left" ? "animate-drunk-sway" : "animate-drunk-sway-alt") : ""}`}
            style={{
              boxShadow: isSelected || isCurrentChoice
                ? "0 12px 35px -8px rgba(255,204,2,0.25)"
                : "0 4px 20px -4px rgba(0,0,0,0.08)",
            }}
            onClick={() => handleSelect(side)}
            data-testid={`card-option-${side === "left" ? 1 : 2}`}
          >
            <div className="w-full aspect-[4/3] overflow-hidden relative">
              <img src={opt.imageUrl} alt={opt.name} className="w-full h-full object-cover" />
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 bg-[#FFCC02]/20 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="w-12 h-12 rounded-full bg-[#FFCC02] flex items-center justify-center"
                    style={{ boxShadow: "0 4px 15px rgba(255,204,2,0.5)" }}
                  >
                    <Check className="w-5 h-5 text-[#2d2000]" strokeWidth={3} />
                  </motion.div>
                </motion.div>
              )}
              {isDismissed && !isReplacing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gray-900/30 flex items-center justify-center"
                >
                  <X className="w-8 h-8 text-white" strokeWidth={2.5} />
                </motion.div>
              )}
            </div>

            {(isCurrentChoice && !isSelected) && (
              <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#FFCC02] flex items-center justify-center z-10" style={{ boxShadow: "0 2px 8px rgba(255,204,2,0.4)" }}>
                <Check className="w-3 h-3 text-[#2d2000]" strokeWidth={3} />
              </div>
            )}

            <div className="p-3.5">
              <h3 className="font-bold text-[15px] mb-0.5 truncate">{opt.name}</h3>
              <p className="text-xs text-muted-foreground mb-2 truncate">{opt.type}</p>
              <div className="flex flex-wrap gap-1 mb-2 overflow-hidden max-h-[1.5rem]">
                {opt.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-gray-100 rounded-full px-2 py-0.5 font-medium">{tag}</span>
                ))}
              </div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {opt.restaurantCount} places</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-white flex flex-col items-center pt-10 px-6 pb-32" data-testid="solo-results-page">
      {hasFilters > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-3"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("solo.preferences")}</span>
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

      <ToastMascot pointDirection={getMascotDirection()} drunk={isDrinksMode} />

      <h2 className="text-lg font-semibold mb-0.5" data-testid="text-choose-prompt">
        {isDrinksMode ? t("solo.drinks_title") : t("solo.choose_title")}
      </h2>
      <p className="text-xs text-muted-foreground mb-5">{isDrinksMode ? t("solo.drinks_hint") : t("solo.choose_hint")}</p>

      {filteredMenus.length === 0 && (
        <div className="w-full max-w-md mb-5 rounded-2xl border border-gray-100 p-4 text-sm text-muted-foreground text-center">
          {t("solo.no_options")}
        </div>
      )}

      {currentChoice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-100 rounded-full px-4 py-2"
        >
          <UtensilsCrossed className="w-3 h-3" />
          <span className="text-xs font-semibold text-foreground">{isDrinksMode ? t("solo.current_drink") : t("solo.current_pick")} {currentChoice.name}</span>
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
        className="w-full max-w-md py-4 rounded-full bg-[#FFCC02] text-[#2d2000] font-bold text-sm mb-5"
        style={{ boxShadow: "0 6px 20px -4px rgba(255,204,2,0.4)" }}
      >
        {isDrinksMode ? t("solo.ready_drink") : t("solo.ready_eat")}{currentChoice ? ` — ${currentChoice.name}` : ""}
      </motion.button>
      <button
        onClick={handleShareResult}
        className="w-full max-w-md py-3 rounded-2xl bg-white border border-gray-200 text-sm font-semibold mb-5"
        data-testid="button-share-solo-result"
      >
        {t("solo.share")}
      </button>
      {shareState ? <p className="text-xs text-muted-foreground mb-5">{shareState}</p> : null}

      <div className="flex items-end gap-2.5 w-full max-w-md">
        <motion.button
          onClick={() => navigate("/?search=1")}
          data-testid="button-search"
          whileTap={{ scale: 0.95 }}
          className="flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-white border border-gray-200/80 text-xs font-medium text-muted-foreground"
          style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.04)" }}
        >
          <Search className="w-4 h-4" />
          {t("solo.search")}
        </motion.button>
        <motion.button
          onClick={handleDecideForMe}
          data-testid="button-decide-for-me"
          whileTap={{ scale: 0.96 }}
          className="flex-[1.4] flex flex-col items-center gap-1 py-[18px] rounded-2xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50 text-xs font-semibold text-foreground relative overflow-hidden"
          style={{ boxShadow: "0 4px 16px -4px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-50 to-[#FFCC02]/20 flex items-center justify-center mb-0.5">
            <Sparkles className="w-4 h-4 text-[#FFCC02]" />
          </div>
          <span className="text-foreground">{t("solo.decide")}</span>
        </motion.button>
        <motion.button
          onClick={() => navigate("/swipe")}
          data-testid="button-swipe-mode"
          whileTap={{ scale: 0.95 }}
          className="flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-white border border-gray-200/80 text-xs font-medium text-muted-foreground"
          style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.04)" }}
        >
          <UtensilsCrossed className="w-4 h-4" />
          {t("solo.swipe")}
        </motion.button>
      </div>

      <AnimatePresence>
        {showDecideForMe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white dark:bg-background flex flex-col"
            data-testid="decide-for-me-screen"
          >
            <button
              onClick={() => { setShowDecideForMe(false); setDecideStep("analyzing"); }}
              className="absolute top-14 right-5 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-muted flex items-center justify-center hover:bg-gray-200 dark:hover:bg-muted/80 transition-colors"
              data-testid="button-close-decide"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            {decideStep === "analyzing" ? (
              <motion.div
                className="flex-1 flex flex-col items-center justify-center px-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 rounded-full border-[3px] border-gray-100 dark:border-border border-t-[#FFCC02] mb-8"
                />
                <motion.img
                  src={isDrinksMode ? drunkToastPath : mascotPath}
                  alt={isDrinksMode ? "Drunk toast thinking" : "Toast thinking"}
                  className={`h-28 w-auto object-contain mb-6 ${isDrinksMode ? "animate-drunk-stumble" : ""}`}
                  animate={isDrinksMode ? undefined : { y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
                  transition={isDrinksMode ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <h2 className="text-xl font-bold text-foreground mb-2" data-testid="text-analyzing">{isDrinksMode ? t("solo.mixing") : t("solo.thinking")}</h2>
                <div className="space-y-3 w-full max-w-xs">
                  {getPersonalizedThinkingSteps(
                    { topKey: topPreference.key, topLabel: topPreference.label, score: topPreference.score },
                    quizAnswers.budget,
                    quizAnswers.interests,
                  ).map((step, idx) => (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: step.delay, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: step.delay + 0.2, type: "spring", damping: 12 }}
                        className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-muted flex items-center justify-center flex-shrink-0"
                      >
                        <step.icon className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                      <span className="text-sm text-muted-foreground">{step.label}</span>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: step.delay + 0.5 }}
                        className="ml-auto text-emerald-500"
                      >
                        <Check className="w-3 h-3" />
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="flex-1 flex flex-col items-center pt-16 px-6 pb-32 overflow-y-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 150 }}
                  className="w-14 h-14 rounded-full bg-[#FFCC02] flex items-center justify-center mb-4"
                  style={{ boxShadow: "0 6px 20px -4px rgba(255,204,2,0.4)" }}
                >
                  <Sparkles className="w-6 h-6 text-[#2d2000]" />
                </motion.div>
                <h2 className="text-xl font-bold text-foreground mb-1" data-testid="text-toast-suggests">{t("solo.suggests")}</h2>
                <p className="text-sm text-muted-foreground mb-6">{t("solo.based_on")}</p>

                {(() => {
                  const timeCtx = getTimeContext();
                  const dayCtx = getDayContext();
                  return (
                    <div className="flex flex-wrap gap-2 mb-6 justify-center">
                      <span className="text-xs bg-gray-100 dark:bg-muted rounded-full px-3 py-1 font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeCtx.label}
                      </span>
                      {dayCtx.isWeekend && (
                        <span className="text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full px-3 py-1 font-medium">{t("solo.weekend")}</span>
                      )}
                      {dayCtx.isPayday && (
                        <span className="text-xs bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-full px-3 py-1 font-medium">{t("solo.payday")}</span>
                      )}
                      {quizAnswers.budget.length > 0 && (
                        <span className="text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full px-3 py-1 font-medium flex items-center gap-1">
                          <Wallet className="w-3 h-3" />{quizAnswers.budget[0]}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {aiRecommendation && (
                  <motion.div
                    initial={{ y: 30, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", damping: 18, stiffness: 200 }}
                    className={`w-full max-w-sm bg-white dark:bg-card rounded-2xl overflow-hidden ring-2 ring-[#FFCC02] mb-6 ${isDrinksMode ? "animate-drunk-sway" : ""}`}
                    style={{ boxShadow: "0 12px 40px -8px rgba(255,204,2,0.25)" }}
                    data-testid="card-ai-recommendation"
                  >
                    <div className="w-full aspect-[16/10] overflow-hidden relative">
                      <img src={aiRecommendation.imageUrl} alt={aiRecommendation.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-[#FFCC02] text-[#2d2000] text-xs font-bold rounded-full px-3 py-1 flex items-center gap-1" style={{ boxShadow: "0 2px 8px rgba(255,204,2,0.4)" }}>
                        <Sparkles className="w-3 h-3" /> {t("solo.toast_pick")}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-foreground mb-1" data-testid="text-recommendation-name">{aiRecommendation.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{aiRecommendation.type}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {aiRecommendation.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-gray-100 dark:bg-muted rounded-full px-2.5 py-0.5 font-medium text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {aiRecommendation.restaurantCount} places nearby</span>
                        <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> {aiRecommendation.budget}</span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">{t("solo.why_pick")}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-recommendation-reason">
                          {(() => {
                            const timeCtx = getTimeContext();
                            const reasons: string[] = [];
                            reasons.push(`Perfect for ${timeCtx.label.toLowerCase()}`);
                            if (aiRecommendation.interests.includes("Popular spots")) reasons.push("trending in Bangkok right now");
                            if (aiRecommendation.interests.includes("Comfort food")) reasons.push("matches your comfort food mood");
                            if (aiRecommendation.restaurantCount > 8) reasons.push(`${aiRecommendation.restaurantCount} great options nearby`);
                            if (quizAnswers.budget.length > 0 && quizAnswers.budget.includes(aiRecommendation.budget)) reasons.push("fits your budget perfectly");
                            return reasons.slice(0, 3).join(" · ");
                          })()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <motion.button
                  onClick={handleAcceptRecommendation}
                  data-testid="button-accept-recommendation"
                  whileTap={{ scale: 0.96 }}
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="w-full max-w-sm py-4 rounded-full bg-[#FFCC02] text-[#2d2000] font-bold text-sm mb-3"
                  style={{ boxShadow: "0 6px 20px -4px rgba(255,204,2,0.4)" }}
                >
                  {t("solo.lets_go", { name: aiRecommendation?.name ?? "" })}
                </motion.button>

                <motion.button
                  onClick={() => { setShowDecideForMe(false); setDecideStep("analyzing"); }}
                  data-testid="button-back-to-choosing"
                  whileTap={{ scale: 0.95 }}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm font-medium text-muted-foreground py-2"
                >
                  {t("solo.keep_choosing")}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
