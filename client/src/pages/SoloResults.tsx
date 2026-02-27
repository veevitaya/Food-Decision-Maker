import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import mascotPath from "@assets/image_1772011321697.png";

const ALL_MENUS = [
  { id: 1, name: "Pad Thai", type: "Thai", tags: ["🍜 Noodles", "🌶️ Spicy", "🦐 Shrimp"], restaurantCount: 9, imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Popular spots", "Hot & spicy", "Comfort food"], dietary: [], setting: ["Street food", "Late night"] },
  { id: 2, name: "Korean BBQ", type: "Korean", tags: ["🥩 Grilled", "🍖 Meat", "👥 Group"], restaurantCount: 10, imageUrl: "https://images.unsplash.com/photo-1583224964978-2257b960c3d3?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Popular spots", "Comfort food"], dietary: ["Gluten-Free"], setting: ["Restaurants", "Trendy spots"] },
  { id: 3, name: "Tonkotsu Ramen", type: "Japanese", tags: ["🍜 Noodles", "🍖 Pork", "🍥 Rich"], restaurantCount: 7, imageUrl: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Popular spots", "Comfort food", "Hot & spicy"], dietary: [], setting: ["Restaurants", "Near BTS", "At the mall"] },
  { id: 4, name: "Margherita Pizza", type: "Italian", tags: ["🧀 Cheesy", "🍅 Tomato", "🌿 Basil"], restaurantCount: 8, imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Popular spots", "Vegetarian", "Comfort food"], dietary: ["Vegetarian"], setting: ["Restaurants", "At the mall"] },
  { id: 5, name: "Green Curry", type: "Thai", tags: ["🌶️ Spicy", "🥥 Coconut", "🍚 Rice"], restaurantCount: 12, imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Hot & spicy", "Comfort food", "Budget-friendly"], dietary: ["Gluten-Free"], setting: ["Street food", "Restaurants"] },
  { id: 6, name: "Sushi Omakase", type: "Japanese", tags: ["🐟 Fresh", "🍣 Raw", "✨ Premium"], restaurantCount: 5, imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=60", budget: "Expensive", interests: ["Fine dining"], dietary: ["Gluten-Free"], setting: ["Restaurants", "Trendy spots"] },
  { id: 7, name: "Smash Burger", type: "Western", tags: ["🍔 Burger", "🧀 Cheesy", "🍟 Fries"], restaurantCount: 11, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Popular spots", "Comfort food"], dietary: [], setting: ["Restaurants", "Late night", "At the mall"] },
  { id: 8, name: "Som Tum", type: "Thai", tags: ["🥗 Salad", "🌶️ Spicy", "🥜 Peanuts"], restaurantCount: 15, imageUrl: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Hot & spicy", "Budget-friendly", "Vegetarian"], dietary: ["Vegan", "Gluten-Free"], setting: ["Street food", "Near BTS"] },
  { id: 9, name: "Dim Sum", type: "Chinese", tags: ["🥟 Dumpling", "🫖 Tea", "🌅 Brunch"], restaurantCount: 6, imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Popular spots", "Comfort food"], dietary: [], setting: ["Restaurants", "At the mall"] },
  { id: 10, name: "Tacos", type: "Mexican", tags: ["🌮 Taco", "🌶️ Spicy", "🫑 Fresh"], restaurantCount: 4, imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Hot & spicy", "Budget-friendly"], dietary: ["Gluten-Free"], setting: ["Street food", "Late night", "Trendy spots"] },
  { id: 11, name: "Mango Sticky Rice", type: "Thai", tags: ["🍰 Dessert", "🥭 Mango", "🍚 Rice"], restaurantCount: 8, imageUrl: "https://images.unsplash.com/photo-1621293954908-907159247fc8?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Dessert", "Popular spots", "Budget-friendly"], dietary: ["Vegan", "Gluten-Free"], setting: ["Street food", "Near BTS"] },
  { id: 12, name: "Tom Yum Goong", type: "Thai", tags: ["🍲 Soup", "🌶️ Spicy", "🦐 Shrimp"], restaurantCount: 14, imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Hot & spicy", "Comfort food", "Popular spots"], dietary: ["Gluten-Free"], setting: ["Restaurants", "By the river"] },
  { id: 13, name: "Khao Soi", type: "Thai", tags: ["🍜 Noodles", "🥥 Coconut", "🌶️ Spicy"], restaurantCount: 6, imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Hot & spicy", "Comfort food", "Budget-friendly"], dietary: [], setting: ["Street food", "Restaurants"] },
  { id: 14, name: "Seafood Platter", type: "Seafood", tags: ["🦀 Crab", "🦐 Shrimp", "🐟 Fresh"], restaurantCount: 7, imageUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=600&auto=format&fit=crop&q=60", budget: "Fancy", interests: ["Fine dining", "Outdoor dining"], dietary: ["Gluten-Free"], setting: ["By the river", "Restaurants", "Rooftops"] },
  { id: 15, name: "Chicken Biryani", type: "Indian", tags: ["🍛 Curry", "🍚 Rice", "🌶️ Spicy"], restaurantCount: 5, imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Hot & spicy", "Comfort food"], dietary: ["Halal"], setting: ["Restaurants", "Near BTS"] },
  { id: 16, name: "Açaí Bowl", type: "Western", tags: ["🫐 Berry", "🥣 Bowl", "🌿 Healthy"], restaurantCount: 4, imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Vegetarian", "Coffee", "Outdoor dining"], dietary: ["Vegan", "Gluten-Free"], setting: ["Trendy spots", "Near BTS"] },
  { id: 17, name: "Matcha Latte & Cake", type: "Japanese", tags: ["☕ Coffee", "🍰 Dessert", "🍵 Matcha"], restaurantCount: 9, imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Coffee", "Dessert", "Trendy spots"], dietary: ["Vegetarian"], setting: ["At the mall", "Trendy spots"] },
  { id: 18, name: "Pad Kra Pao", type: "Thai", tags: ["🌶️ Spicy", "🍳 Fried egg", "🌿 Basil"], restaurantCount: 20, imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Budget-friendly", "Hot & spicy", "Popular spots"], dietary: [], setting: ["Street food", "Late night", "Near BTS"] },
  { id: 19, name: "Eggs Benedict", type: "Western", tags: ["🍳 Eggs", "🥓 Bacon", "🌅 Brunch"], restaurantCount: 7, imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Popular spots", "Coffee", "Outdoor dining"], dietary: [], setting: ["Restaurants", "Trendy spots", "Near BTS"] },
  { id: 20, name: "Pancakes & Waffles", type: "Western", tags: ["🥞 Pancakes", "🧇 Waffles", "🍯 Syrup"], restaurantCount: 8, imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Dessert", "Popular spots", "Comfort food"], dietary: ["Vegetarian"], setting: ["Restaurants", "Trendy spots", "At the mall"] },
  { id: 21, name: "Smoothie Bowl", type: "Western", tags: ["🫐 Berry", "🥣 Bowl", "🌿 Healthy"], restaurantCount: 6, imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Vegetarian", "Outdoor dining", "Coffee"], dietary: ["Vegan", "Gluten-Free"], setting: ["Trendy spots", "Near BTS"] },
  { id: 22, name: "Croissant & Pastry", type: "French", tags: ["🥐 Croissant", "🧈 Buttery", "☕ Coffee"], restaurantCount: 9, imageUrl: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Coffee", "Popular spots", "Dessert"], dietary: ["Vegetarian"], setting: ["Trendy spots", "At the mall", "Near BTS"] },
  { id: 23, name: "Thai Milk Tea", type: "Thai", tags: ["🧋 Drink", "🍵 Tea", "🧡 Sweet"], restaurantCount: 12, imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Budget-friendly", "Popular spots"], dietary: [], setting: ["Street food", "Near BTS", "At the mall"] },
  { id: 24, name: "Bubble Tea", type: "Taiwanese", tags: ["🧋 Boba", "🥤 Drink", "🫧 Tapioca"], restaurantCount: 15, imageUrl: "https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Popular spots", "Budget-friendly"], dietary: [], setting: ["At the mall", "Near BTS", "Trendy spots"] },
  { id: 25, name: "Khao Tom", type: "Thai", tags: ["🍲 Soup", "🍚 Rice", "🌙 Late night"], restaurantCount: 10, imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop&q=60", budget: "Cheap", interests: ["Budget-friendly", "Comfort food"], dietary: ["Gluten-Free"], setting: ["Street food", "Late night"] },
  { id: 26, name: "Ice Cream & Gelato", type: "Western", tags: ["🍦 Ice cream", "🍨 Gelato", "🍰 Sweet"], restaurantCount: 8, imageUrl: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&auto=format&fit=crop&q=60", budget: "Moderate", interests: ["Dessert", "Popular spots"], dietary: ["Vegetarian"], setting: ["At the mall", "Trendy spots", "Near BTS"] },
];

type MenuItem = typeof ALL_MENUS[0];

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

function filterMenus(quizAnswers: ReturnType<typeof parseQuizParams>): MenuItem[] {
  const { cuisines, diet, locations, budget, interests } = quizAnswers;
  const hasFilters = cuisines.length || diet.length || locations.length || budget.length || interests.length;
  if (!hasFilters) return ALL_MENUS;

  const scored = ALL_MENUS.map((item) => {
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
  return filtered.length >= 2 ? filtered : ALL_MENUS;
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
          ✨
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function SoloResults() {
  const [, navigate] = useLocation();

  const quizAnswers = useMemo(() => parseQuizParams(), []);
  const filteredMenus = useMemo(() => filterMenus(quizAnswers), [quizAnswers]);

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
  const [leftOption, setLeftOption] = useState(filteredMenus[0] || ALL_MENUS[0]);
  const [rightOption, setRightOption] = useState(filteredMenus[1] || ALL_MENUS[1]);
  const [round, setRound] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(null);
  const [replacingSide, setReplacingSide] = useState<"left" | "right" | null>(null);

  const getNextMenu = () => {
    const currentIds = new Set([leftOption.id, rightOption.id]);
    const remaining = filteredMenus.filter((m) => !usedIds.has(m.id) && !currentIds.has(m.id));
    if (remaining.length === 0) {
      const allOther = filteredMenus.filter((m) => !currentIds.has(m.id));
      if (allOther.length === 0) {
        const anyOther = ALL_MENUS.filter((m) => !currentIds.has(m.id));
        return anyOther[Math.floor(Math.random() * anyOther.length)] || ALL_MENUS[0];
      }
      return allOther[Math.floor(Math.random() * allOther.length)];
    }
    return remaining[Math.floor(Math.random() * remaining.length)];
  };

  const handleSelect = (side: "left" | "right") => {
    if (animating) return;
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
            animate={{
              y: 0,
              opacity: isDismissed && !isReplacing ? 0.4 : 1,
              scale: isSelected ? 1.02 : isDismissed && !isReplacing ? 0.95 : 1,
            }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 250 }}
            className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 relative ${
              isSelected || isCurrentChoice ? "ring-2 ring-[#FFCC02]" : ""
            }`}
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
                    <span className="text-[#2d2000] text-xl font-bold">✓</span>
                  </motion.div>
                </motion.div>
              )}
              {isDismissed && !isReplacing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gray-900/30 flex items-center justify-center"
                >
                  <span className="text-3xl">👋</span>
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

  return (
    <div className="w-full min-h-[100dvh] bg-white flex flex-col items-center pt-10 px-6 pb-32" data-testid="solo-results-page">
      <div className="w-full flex items-center justify-center mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Round {round}</span>
      </div>

      {hasFilters > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-3"
        >
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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-100 rounded-full px-4 py-2"
        >
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
        <motion.button
          onClick={() => navigate("/")}
          data-testid="button-search"
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-gray-200 text-sm font-medium"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          🔍 Search
        </motion.button>
        <motion.button
          onClick={() => navigate("/swipe")}
          data-testid="button-swipe-mode"
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-gray-200 text-sm font-medium"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          🍽️ Swipe
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}
