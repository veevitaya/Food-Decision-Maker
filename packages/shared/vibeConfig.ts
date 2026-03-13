export const VIBE_TAGS = [
  "spicy",
  "drinks",
  "budget",
  "healthy",
  "outdoor",
  "date_night",
  "delivery",
  "late_night",
  "sweets",
  "brunch",
  "street_food",
  "rooftop",
  "family",
  "cafe",
] as const;

export type VibeTag = typeof VIBE_TAGS[number];

export const VIBE_LABELS: Record<VibeTag, string> = {
  spicy: "Spicy",
  drinks: "Drinks",
  budget: "Budget",
  healthy: "Healthy",
  outdoor: "Outdoor",
  date_night: "Date Night",
  delivery: "Delivery",
  late_night: "Late Night",
  sweets: "Sweets",
  brunch: "Brunch",
  street_food: "Street Food",
  rooftop: "Rooftop",
  family: "Family",
  cafe: "Cafe",
};

export const VIBE_EMOJI: Record<VibeTag, string> = {
  spicy: "🌶️",
  drinks: "🍸",
  budget: "💰",
  healthy: "🥗",
  outdoor: "⛱️",
  date_night: "💕",
  delivery: "🛵",
  late_night: "🌙",
  sweets: "🍰",
  brunch: "🥞",
  street_food: "🍜",
  rooftop: "🏙️",
  family: "🤗",
  cafe: "☕",
};

export const MODE_TO_VIBE: Record<string, VibeTag> = {
  hot: "spicy",
  drinks: "drinks",
  cheap: "budget",
  healthy: "healthy",
  outdoor: "outdoor",
  partner: "date_night",
  delivery: "delivery",
  late: "late_night",
  sweet: "sweets",
  brunch: "brunch",
  streetfood: "street_food",
  rooftop: "rooftop",
  family: "family",
  cafe: "cafe",
};

export const BANGKOK_DISTRICTS = [
  "Ari",
  "Asoke",
  "Bang Rak",
  "Charoen Krung",
  "Chinatown",
  "Ekkamai",
  "Khao San",
  "Langsuan",
  "Lat Phrao",
  "Nana",
  "Old Town",
  "On Nut",
  "Phaya Thai",
  "Phrom Phong",
  "Phra Nakhon",
  "Ratchathewi",
  "Riverside",
  "Sathorn",
  "Siam",
  "Silom",
  "Sukhumvit",
  "Thonglor",
  "Victory Monument",
  "Wireless",
] as const;

const CATEGORY_RULES: { keywords: string[]; vibe: VibeTag }[] = [
  { keywords: ["spicy", "isaan", "hot", "chili"], vibe: "spicy" },
  { keywords: ["bar", "cocktail", "wine", "beer", "pub", "izakaya", "spirits"], vibe: "drinks" },
  { keywords: ["salad", "vegan", "vegetarian", "organic", "poke", "healthy", "acai"], vibe: "healthy" },
  { keywords: ["outdoor", "garden", "terrace", "riverside", "by the river"], vibe: "outdoor" },
  { keywords: ["fine dining", "romantic", "omakase", "upscale", "kaiseki", "premium"], vibe: "date_night" },
  { keywords: ["late night", "night market", "midnight"], vibe: "late_night" },
  { keywords: ["dessert", "bakery", "ice cream", "kakigori", "cake", "pastry", "sweet", "honey toast"], vibe: "sweets" },
  { keywords: ["brunch", "breakfast", "morning"], vibe: "brunch" },
  { keywords: ["street food", "night market", "hawker", "stall", "cart"], vibe: "street_food" },
  { keywords: ["rooftop"], vibe: "rooftop" },
  { keywords: ["family", "buffet", "food court", "casual", "home-style", "traditional", "home cooking"], vibe: "family" },
  { keywords: ["cafe", "coffee", "tea", "latte"], vibe: "cafe" },
];

const CUISINE_SPICY = ["thai", "indian", "mexican", "korean", "isaan", "northern", "southern"];

function detectDistrictFromAddress(address: string): string | null {
  const lower = address.toLowerCase();
  const districtMap: Record<string, string[]> = {
    "Ari": ["ari"],
    "Asoke": ["asoke"],
    "Bang Rak": ["bang rak"],
    "Charoen Krung": ["charoen krung"],
    "Chinatown": ["chinatown", "yaowarat"],
    "Ekkamai": ["ekkamai"],
    "Khao San": ["khao san"],
    "Langsuan": ["langsuan"],
    "Lat Phrao": ["lat phrao", "ladprao"],
    "Nana": ["nana", "sukhumvit 3", "sukhumvit 4"],
    "Old Town": ["old town", "rattanakosin"],
    "On Nut": ["on nut", "onnut"],
    "Phaya Thai": ["phaya thai", "phayathai"],
    "Phrom Phong": ["phrom phong"],
    "Phra Nakhon": ["phra nakhon", "maha chai", "maharat", "maha rat"],
    "Ratchathewi": ["ratchathewi"],
    "Riverside": ["riverside", "charoen nakhon"],
    "Sathorn": ["sathorn"],
    "Siam": ["siam", "central world"],
    "Silom": ["silom"],
    "Sukhumvit": ["sukhumvit"],
    "Thonglor": ["thonglor", "thong lor", "sukhumvit 55"],
    "Victory Monument": ["victory monument", "victory mon"],
    "Wireless": ["wireless"],
  };
  for (const [district, keywords] of Object.entries(districtMap)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return district;
    }
  }
  return null;
}

interface RestaurantLike {
  category: string;
  priceLevel: number;
  address: string;
  operatingHours?: string | null;
  description?: string;
}

export function autoAssignVibes(r: RestaurantLike): string[] {
  const vibes = new Set<string>();
  const catLower = r.category.toLowerCase();
  const descLower = (r.description || "").toLowerCase();
  const combined = catLower + " " + descLower;

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) {
        vibes.add(rule.vibe);
        break;
      }
    }
  }

  const cuisineParts = catLower.split(/[,·•\s]+/).map(s => s.trim());
  for (const part of cuisineParts) {
    if (CUISINE_SPICY.some(c => part.includes(c))) {
      vibes.add("spicy");
      break;
    }
  }

  if (r.priceLevel <= 2) {
    vibes.add("budget");
  }

  if (r.priceLevel <= 3) {
    vibes.add("delivery");
  }

  if (r.operatingHours) {
    const match = r.operatingHours.match(/(\d{2}):\d{2}\s*-\s*(\d{2}):\d{2}/);
    if (match) {
      const openHour = parseInt(match[1]);
      const closeHour = parseInt(match[2]);
      if (closeHour >= 0 && closeHour <= 5) {
        vibes.add("late_night");
      }
      if (openHour >= 6 && openHour <= 10) {
        vibes.add("brunch");
      }
    }
  }

  if (combined.includes("rooftop")) {
    vibes.add("outdoor");
  }

  return Array.from(vibes).sort();
}

export function autoDetectDistrict(address: string): string | null {
  return detectDistrictFromAddress(address);
}
