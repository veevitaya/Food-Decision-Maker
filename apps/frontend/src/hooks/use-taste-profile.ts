import { useState, useCallback, useMemo } from "react";

const STORAGE_KEY = "toast_taste_profile";
const SEARCH_KEY = "toast_search_history";
const ACTIVITY_KEY = "toast_activity_log";

export interface TasteEntry {
  category: string;
  count: number;
  lastSeen: number;
}

export interface ActivityEntry {
  category: string;
  action: "swipe" | "search" | "select" | "view";
  hour: number;
  dayOfWeek: number;
  timestamp: number;
}

export interface TasteProfile {
  likes: Record<string, TasteEntry>;
  dislikes: Record<string, TasteEntry>;
  superLikes: Record<string, TasteEntry>;
}

function getProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { likes: {}, dislikes: {}, superLikes: {} };
  } catch {
    return { likes: {}, dislikes: {}, superLikes: {} };
  }
}

function saveProfile(profile: TasteProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function getActivityLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveActivityLog(log: ActivityEntry[]) {
  const trimmed = log.slice(-200);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed));
}

function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(history: string[]) {
  localStorage.setItem(SEARCH_KEY, JSON.stringify(history.slice(-50)));
}

function getTimeSlot(hour: number): string {
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "dinner";
  return "latenight";
}

function getDayType(day: number): string {
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

const CATEGORY_MAP: Record<string, string[]> = {
  "Pad Thai": ["Thai", "Noodles", "Street food"],
  "Korean BBQ": ["Korean", "BBQ", "Meat"],
  "Tonkotsu Ramen": ["Japanese", "Ramen", "Noodles"],
  "Margherita Pizza": ["Italian", "Pizza"],
  "Sushi Omakase": ["Japanese", "Sushi", "Premium"],
  "Green Curry": ["Thai", "Curry", "Spicy"],
  "Smash Burger": ["American", "Burger"],
  "Dim Sum": ["Chinese", "Dumplings", "Brunch"],
  "Eggs Benedict": ["Brunch", "Western", "Eggs"],
  "Croissant & Coffee": ["French", "Bakery", "Coffee"],
  "Croissant & Pastry": ["French", "Bakery", "Coffee"],
  "Smoothie Bowl": ["Healthy", "Vegan", "Brunch"],
  "Bubble Tea": ["Taiwanese", "Drinks", "Boba"],
  "Thai Milk Tea": ["Thai", "Drinks", "Tea"],
  "Som Tum": ["Thai", "Salad", "Spicy"],
  "Khao Soi": ["Thai", "Northern Thai", "Curry"],
  "Tacos al Pastor": ["Mexican", "Tacos"],
  "Tacos": ["Mexican", "Tacos"],
  "Pasta Carbonara": ["Italian", "Pasta"],
  "Soufflé Pancakes": ["Japanese", "Cafe", "Dessert"],
  "Thipsamai": ["Thai", "Street food", "Noodles"],
  "Jay Fai": ["Thai", "Street food", "Premium"],
  "Peppina": ["Italian", "Pizza"],
  "Sushi Masato": ["Japanese", "Sushi", "Premium"],
  "Bankara Ramen": ["Japanese", "Ramen", "Noodles"],
  "Daniel Thaiger": ["American", "Burger"],
  "Gaggan Anand": ["Indian", "Premium", "Fine dining"],
  "Krua Apsorn": ["Thai", "Curry", "Royal"],
  "Mongkol Korean": ["Korean", "BBQ", "Premium"],
  "P'Aor Tom Yum": ["Thai", "Spicy", "Soup"],
  "Açaí Bowl": ["Healthy", "Vegan", "Brunch"],
  "Matcha Latte & Cake": ["Japanese", "Cafe", "Dessert", "Coffee"],
  "Mango Sticky Rice": ["Thai", "Dessert", "Street food"],
  "Tom Yum Goong": ["Thai", "Spicy", "Soup"],
  "Seafood Platter": ["Seafood", "Premium", "Fine dining"],
  "Chicken Biryani": ["Indian", "Curry", "Spicy"],
  "Khao Tom": ["Thai", "Comfort", "Late night"],
  "Ice Cream & Gelato": ["Dessert", "Western"],
  "Craft Cocktails": ["Drinks", "Premium", "Late night"],
  "Wine & Tapas": ["Drinks", "Premium", "Fine dining"],
  "Beer Garden Bites": ["Drinks", "Western", "Outdoor"],
  "Wagyu Steak": ["Japanese", "Premium", "Fine dining"],
  "Lobster & Champagne": ["Seafood", "Premium", "Fine dining"],
  "Poke Bowl": ["Healthy", "Japanese", "Western"],
  "Avocado Toast & Latte": ["Brunch", "Coffee", "Healthy"],
  "Thai Iced Coffee": ["Thai", "Coffee", "Drinks"],
  "Pancakes & Waffles": ["Brunch", "Western", "Dessert"],
  "Pad Kra Pao": ["Thai", "Street food", "Spicy"],
};

const SUGGESTION_DATA: Record<string, { text: string; cuisines: string[] }> = {
  "Thai": { text: "Pad Thai", cuisines: ["Thai", "Street food", "Noodles"] },
  "Japanese": { text: "Ramen", cuisines: ["Japanese", "Ramen", "Sushi"] },
  "Korean": { text: "Korean BBQ", cuisines: ["Korean", "BBQ"] },
  "Italian": { text: "Pizza", cuisines: ["Italian", "Pizza", "Pasta"] },
  "Spicy": { text: "spicy food", cuisines: ["Thai", "Spicy", "Isaan"] },
  "Noodles": { text: "noodles", cuisines: ["Noodles", "Ramen", "Thai"] },
  "Brunch": { text: "brunch", cuisines: ["Brunch", "Western", "Cafe"] },
  "Healthy": { text: "healthy bowls", cuisines: ["Healthy", "Vegan", "Salad"] },
  "Coffee": { text: "coffee spots", cuisines: ["Coffee", "Cafe", "Bakery"] },
  "Burger": { text: "burgers", cuisines: ["American", "Burger"] },
  "Chinese": { text: "dim sum", cuisines: ["Chinese", "Dumplings"] },
  "Curry": { text: "curry", cuisines: ["Thai", "Curry", "Northern Thai"] },
  "Premium": { text: "fine dining", cuisines: ["Premium", "Sushi", "Omakase"] },
  "Street food": { text: "street food", cuisines: ["Street food", "Thai", "Night market"] },
  "Dessert": { text: "sweets", cuisines: ["Dessert", "Cafe", "Ice cream"] },
  "Drinks": { text: "drinks", cuisines: ["Drinks", "Boba", "Tea"] },
  "Seafood": { text: "seafood", cuisines: ["Seafood", "Thai"] },
  "Mexican": { text: "tacos", cuisines: ["Mexican", "Tacos"] },
  "Indian": { text: "curry", cuisines: ["Indian", "Curry"] },
  "Fine dining": { text: "fine dining", cuisines: ["Premium", "Fine dining"] },
  "BBQ": { text: "grilled meat", cuisines: ["BBQ", "Korean", "Meat"] },
  "Meat": { text: "grilled meat", cuisines: ["BBQ", "Meat"] },
  "Western": { text: "western food", cuisines: ["Western", "American"] },
  "French": { text: "pastries", cuisines: ["French", "Bakery"] },
  "Late night": { text: "late night eats", cuisines: ["Late night", "Street food"] },
  "Outdoor": { text: "outdoor dining", cuisines: ["Outdoor"] },
};

const TIME_SLOT_TITLES: Record<string, Record<string, string>> = {
  morning: {
    default: "Your morning pick",
    Brunch: "Your go-to brunch spot",
    Coffee: "Your morning coffee ritual",
    Healthy: "Start fresh today",
    Thai: "Your morning favourite",
  },
  lunch: {
    default: "Perfect for lunch",
    Thai: "Your lunch craving",
    Japanese: "Your midday pick",
    Noodles: "Noodles for lunch? 🍜",
    Burger: "Burger o'clock",
  },
  afternoon: {
    default: "Afternoon treat",
    Coffee: "Afternoon coffee break",
    Dessert: "Sweet afternoon pick",
    Drinks: "Afternoon refresher",
    Healthy: "Afternoon boost",
  },
  dinner: {
    default: "Tonight's pick for you",
    Thai: "Thai tonight?",
    Japanese: "Your evening favourite",
    Korean: "Perfect for tonight",
    Premium: "Treat yourself tonight",
    Italian: "Dinner mood: Italian",
    Spicy: "Something spicy tonight",
  },
  latenight: {
    default: "Late night craving",
    Thai: "Late night Thai fix",
    Noodles: "Late night noodles",
    "Street food": "Midnight street food",
    Drinks: "Night out picks",
    Burger: "Midnight munchies",
  },
};

const DAY_MODIFIERS: Record<string, Record<string, string>> = {
  weekend: {
    Brunch: "Weekend brunch pick",
    Premium: "Weekend treat",
    Drinks: "Weekend vibes",
    default: "Your weekend favourite",
  },
  weekday: {
    default: "",
  },
};

export function useTasteProfile() {
  const [profile, setProfile] = useState<TasteProfile>(getProfile);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(getActivityLog);
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory);

  const logActivity = useCallback((category: string, action: ActivityEntry["action"]) => {
    const now = new Date();
    const entry: ActivityEntry = {
      category,
      action,
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      timestamp: Date.now(),
    };
    setActivityLog(prev => {
      const next = [...prev, entry];
      saveActivityLog(next);
      return next;
    });
  }, []);

  const recordSwipe = useCallback((itemName: string, direction: "like" | "dislike" | "superlike") => {
    setProfile(prev => {
      const next = { ...prev };
      const categories = CATEGORY_MAP[itemName] || [itemName];
      const bucket = direction === "like" ? "likes" : direction === "superlike" ? "superLikes" : "dislikes";

      next[bucket] = { ...prev[bucket] };
      for (const cat of categories) {
        const existing = next[bucket][cat] || { category: cat, count: 0, lastSeen: 0 };
        next[bucket][cat] = {
          ...existing,
          count: existing.count + (direction === "superlike" ? 2 : 1),
          lastSeen: Date.now(),
        };
      }

      saveProfile(next);
      return next;
    });

    const categories = CATEGORY_MAP[itemName] || [itemName];
    for (const cat of categories) {
      logActivity(cat, "swipe");
    }
  }, [logActivity]);

  const recordSearch = useCallback((query: string) => {
    if (!query.trim() || query.trim().length < 2) return;
    setSearchHistory(prev => {
      const next = [...prev.filter(q => q !== query.trim()), query.trim()];
      saveSearchHistory(next);
      return next;
    });
    const q = query.toLowerCase();
    for (const [name, cats] of Object.entries(CATEGORY_MAP)) {
      if (name.toLowerCase().includes(q) || q.includes(name.toLowerCase())) {
        for (const cat of cats) {
          logActivity(cat, "search");
        }
        break;
      }
    }
  }, [logActivity]);

  const recordSelect = useCallback((itemName: string) => {
    const categories = CATEGORY_MAP[itemName] || [itemName];
    for (const cat of categories) {
      logActivity(cat, "select");
    }
  }, [logActivity]);

  const topPreference = useMemo(() => {
    const now = Date.now();
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const timeSlot = getTimeSlot(currentHour);
    const dayType = getDayType(currentDay);
    const scores: Record<string, number> = {};

    for (const [cat, entry] of Object.entries(profile.likes)) {
      const recencyDays = (now - entry.lastSeen) / (1000 * 60 * 60 * 24);
      const recencyMultiplier = Math.max(0.3, 1 - recencyDays * 0.05);
      scores[cat] = (scores[cat] || 0) + entry.count * recencyMultiplier;
    }
    for (const [cat, entry] of Object.entries(profile.superLikes)) {
      const recencyDays = (now - entry.lastSeen) / (1000 * 60 * 60 * 24);
      const recencyMultiplier = Math.max(0.3, 1 - recencyDays * 0.05);
      scores[cat] = (scores[cat] || 0) + entry.count * 2 * recencyMultiplier;
    }
    for (const [cat, entry] of Object.entries(profile.dislikes)) {
      scores[cat] = (scores[cat] || 0) - entry.count * 0.5;
    }

    const recentWindow = 7 * 24 * 60 * 60 * 1000;
    const recentActivities = activityLog.filter(a => now - a.timestamp < recentWindow);

    const timeSlotActivities = recentActivities.filter(a => getTimeSlot(a.hour) === timeSlot);
    for (const a of timeSlotActivities) {
      scores[a.category] = (scores[a.category] || 0) + 2;
    }

    const dayTypeActivities = recentActivities.filter(a => getDayType(a.dayOfWeek) === dayType);
    for (const a of dayTypeActivities) {
      scores[a.category] = (scores[a.category] || 0) + 1;
    }

    for (const q of searchHistory.slice(-5)) {
      const ql = q.toLowerCase();
      for (const [name, cats] of Object.entries(CATEGORY_MAP)) {
        if (name.toLowerCase().includes(ql) || ql.includes(name.toLowerCase())) {
          for (const cat of cats) {
            scores[cat] = (scores[cat] || 0) + 1.5;
          }
        }
      }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0 || sorted[0][1] <= 0) {
      return { label: "Pad Thai", key: "Thai", score: 0 };
    }

    const topKey = sorted[0][0];
    const suggestion = SUGGESTION_DATA[topKey];
    return {
      label: suggestion ? suggestion.text : topKey.toLowerCase(),
      key: topKey,
      score: sorted[0][1],
    };
  }, [profile, activityLog, searchHistory]);

  const getSuggestionTitle = useMemo(() => {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const timeSlot = getTimeSlot(currentHour);
    const dayType = getDayType(currentDay);
    const key = topPreference.key;

    const dayMod = DAY_MODIFIERS[dayType]?.[key];
    if (dayMod) return dayMod;

    const timeMod = TIME_SLOT_TITLES[timeSlot]?.[key];
    if (timeMod) return timeMod;

    const timeDefault = TIME_SLOT_TITLES[timeSlot]?.default;
    if (timeDefault && topPreference.score > 0) return timeDefault;

    return `Because you like ${topPreference.label}...`;
  }, [topPreference]);

  const getSuggestionSubtitle = useMemo(() => {
    const totalLikes = Object.values(profile.likes).reduce((sum, e) => sum + e.count, 0);
    const totalSuper = Object.values(profile.superLikes).reduce((sum, e) => sum + e.count, 0);
    const total = totalLikes + totalSuper;

    if (total === 0) return "Curated picks to get you started";
    if (total < 5) return "Getting to know your taste...";
    if (total < 15) return "Picked based on your recent likes";
    return "Handpicked from your taste profile";
  }, [profile]);

  const getMoodSignal = useMemo(() => {
    const currentHour = new Date().getHours();
    const timeSlot = getTimeSlot(currentHour);

    const moodMap: Record<string, { emoji: string; label: string }> = {
      morning: { emoji: "☀️", label: "Morning mode" },
      lunch: { emoji: "🍽️", label: "Lunch time" },
      afternoon: { emoji: "☕", label: "Afternoon chill" },
      dinner: { emoji: "🌙", label: "Dinner time" },
      latenight: { emoji: "🦉", label: "Night owl" },
    };

    return moodMap[timeSlot] || moodMap.dinner;
  }, []);

  return {
    profile,
    recordSwipe,
    recordSearch,
    recordSelect,
    topPreference,
    getSuggestionTitle,
    getSuggestionSubtitle,
    getMoodSignal,
    searchHistory,
    activityLog,
  };
}
