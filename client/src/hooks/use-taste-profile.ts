import { useState, useCallback, useMemo } from "react";

const STORAGE_KEY = "toast_taste_profile";

export interface TasteEntry {
  category: string;
  count: number;
  lastSeen: number;
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
  "Smoothie Bowl": ["Healthy", "Vegan", "Brunch"],
  "Bubble Tea": ["Taiwanese", "Drinks", "Boba"],
  "Thai Milk Tea": ["Thai", "Drinks", "Tea"],
  "Som Tum": ["Thai", "Salad", "Spicy"],
  "Khao Soi": ["Thai", "Northern Thai", "Curry"],
  "Tacos al Pastor": ["Mexican", "Tacos"],
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
};

export function useTasteProfile() {
  const [profile, setProfile] = useState<TasteProfile>(getProfile);

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
  }, []);

  const topPreference = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const [cat, entry] of Object.entries(profile.likes)) {
      scores[cat] = (scores[cat] || 0) + entry.count;
    }
    for (const [cat, entry] of Object.entries(profile.superLikes)) {
      scores[cat] = (scores[cat] || 0) + entry.count * 2;
    }
    for (const [cat, entry] of Object.entries(profile.dislikes)) {
      scores[cat] = (scores[cat] || 0) - entry.count * 0.5;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0 || sorted[0][1] <= 0) {
      return { label: "Pad Thai", key: "Thai" };
    }

    const topKey = sorted[0][0];
    const suggestion = SUGGESTION_DATA[topKey];
    if (suggestion) {
      return { label: suggestion.text, key: topKey };
    }
    return { label: topKey.toLowerCase(), key: topKey };
  }, [profile]);

  const getSuggestionTitle = useMemo(() => {
    return `Because you like ${topPreference.label}...`;
  }, [topPreference]);

  return { profile, recordSwipe, topPreference, getSuggestionTitle };
}
