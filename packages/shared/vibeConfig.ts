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

const KEYWORD_RULES: { keywords: string[]; vibe: VibeTag }[] = [
  {
    vibe: "spicy",
    keywords: [
      "spicy", "isaan", "isan", "som tum", "somtam", "laab", "larb", "pad ped",
      "gaeng ped", "pad kee mao", "drunken noodle", "jungle curry", "prik kee nu",
      "bird chili", "extra hot", "sichuan", "szechuan", "nam prik", "chili paste",
      "fiery", "hot pot spicy", "korean bbq spicy", "kimchi", "tteokbokki",
    ],
  },
  {
    vibe: "drinks",
    keywords: [
      "bar", "cocktail", "wine", "beer", "pub", "izakaya", "spirits", "whisky",
      "whiskey", "sake", "craft beer", "rooftop bar", "jazz bar", "nightclub",
      "night club", "karaoke", "tapas bar", "wine bar", "speakeasy", "mixology",
      "gin", "rum", "sangria", "aperitivo", "brew", "brewery", "draught",
      "happy hour", "mocktail", "highball",
    ],
  },
  {
    vibe: "healthy",
    keywords: [
      "salad", "vegan", "vegetarian", "organic", "poke", "healthy", "acai",
      "smoothie", "grain bowl", "plant-based", "plant based", "quinoa",
      "gluten-free", "gluten free", "raw food", "detox", "superfood", "kale",
      "juice bar", "fresh juice", "protein bowl", "low-carb", "clean eating",
      "light bites", "wellness", "tofu", "tempeh", "wholefoods", "whole foods",
    ],
  },
  {
    vibe: "outdoor",
    keywords: [
      "outdoor", "garden", "terrace", "riverside", "by the river", "al fresco",
      "open air", "open-air", "canal", "floating", "lakeside", "courtyard",
      "patio", "sea view", "river view", "poolside", "beachside", "greenery",
      "lush garden", "tropical garden",
    ],
  },
  {
    vibe: "date_night",
    keywords: [
      "fine dining", "romantic", "omakase", "upscale", "kaiseki", "premium",
      "tasting menu", "chef's table", "private dining", "candlelit", "candlelight",
      "intimate", "elegant", "luxury", "michelin", "fondue", "degustation",
      "set menu", "wine pairing", "hidden gem", "speakeasy", "date night",
      "couples", "honeymoon",
    ],
  },
  {
    vibe: "late_night",
    keywords: [
      "late night", "night market", "midnight", "all night", "24 hours", "24/7",
      "open late", "nightlife", "night life", "after midnight", "till late",
      "until late", "graveyard", "after-hours", "nocturnal",
    ],
  },
  {
    vibe: "sweets",
    keywords: [
      "dessert", "bakery", "ice cream", "kakigori", "cake", "pastry", "sweet",
      "honey toast", "crepe", "waffle", "donut", "doughnut", "gelato", "bingsu",
      "mochi", "macaron", "chocolate", "patisserie", "boba", "bubble tea",
      "milk tea", "shaved ice", "taro", "matcha", "churros", "pudding",
      "cheesecake", "tart", "brownie", "confectionery",
    ],
  },
  {
    vibe: "brunch",
    keywords: [
      "brunch", "breakfast", "all-day breakfast", "all day breakfast",
      "eggs benedict", "granola", "pancakes", "french toast", "avocado toast",
      "eggs", "omelette", "waffles", "mimosa", "benedict", "smoothie bowl",
      "acai bowl", "morning", "early bird", "bakery breakfast",
    ],
  },
  {
    vibe: "street_food",
    keywords: [
      "street food", "night market", "hawker", "stall", "cart", "food truck",
      "market food", "boat noodles", "moo ping", "satay", "pad thai stall",
      "grilled skewer", "skewer", "yaowarat", "chatuchak", "open-air market",
      "sidewalk", "roadside", "food stall",
    ],
  },
  {
    vibe: "rooftop",
    keywords: [
      "rooftop", "roof top", "sky bar", "sky lounge", "sky deck", "penthouse",
      "panoramic view", "city view", "above the city", "high rise", "tower view",
      "skyline", "skyscraper view",
    ],
  },
  {
    vibe: "family",
    keywords: [
      "family", "buffet", "food court", "home-style", "traditional", "home cooking",
      "kids", "children", "halal", "all-you-can-eat", "all you can eat",
      "yakiniku", "mookata", "sukiyaki", "steamboat", "hot pot", "hotpot",
      "bbq grill", "shabu", "suki", "sharing platter", "communal dining",
      "dim sum", "yum cha",
    ],
  },
  {
    vibe: "cafe",
    keywords: [
      "cafe", "coffee", "tea", "latte", "espresso", "specialty coffee",
      "third wave", "single origin", "flat white", "cold brew", "pour over",
      "coffeehouse", "tea room", "afternoon tea", "matcha latte", "cappuccino",
      "barista", "filter coffee", "drip coffee", "coffee roaster",
    ],
  },
];

// Cuisines that are inherently spicy
const CUISINE_SPICY = [
  "thai", "indian", "mexican", "korean", "isaan", "isan", "northern thai",
  "southern thai", "sichuan", "szechuan", "ethiopian", "yunnanese", "hunan",
  "malay", "malaysian", "indonesian",
];

// Bangkok districts associated with specific vibes
const DISTRICT_VIBES: Partial<Record<string, VibeTag[]>> = {
  "Ari":              ["cafe", "brunch", "healthy"],
  "Ekkamai":          ["cafe", "brunch", "date_night"],
  "Thonglor":         ["date_night", "drinks", "cafe"],
  "Phrom Phong":      ["date_night", "drinks", "cafe"],
  "Silom":            ["drinks", "date_night", "late_night"],
  "Sathorn":          ["date_night", "drinks"],
  "Sukhumvit":        ["drinks", "late_night"],
  "Nana":             ["late_night", "drinks"],
  "Asoke":            ["drinks", "late_night"],
  "Khao San":         ["street_food", "budget", "late_night", "drinks"],
  "Chinatown":        ["street_food", "late_night", "family"],
  "Riverside":        ["outdoor", "date_night"],
  "Charoen Krung":    ["outdoor", "date_night", "cafe"],
  "Old Town":         ["street_food", "family"],
  "Siam":             ["budget", "family", "sweets"],
  "Victory Monument": ["street_food", "budget"],
  "On Nut":           ["budget", "street_food"],
  "Lat Phrao":        ["family", "budget"],
  "Ratchathewi":      ["budget", "street_food"],
  "Langsuan":         ["date_night", "drinks"],
  "Bang Rak":         ["cafe", "date_night"],
};

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
  name?: string;
  category: string;
  priceLevel: number;
  address: string;
  description?: string;
  rating?: string;
  district?: string | null;
  openingHours?: { day: string; hours: string }[] | null;
  reviews?: { text: string; rating?: number }[] | null;
}

const FIELD_WEIGHTS = {
  name: 3.0,
  category: 2.5,
  description: 1.8,
  address: 1.2,
  reviews: 1.0,
} as const;

const VIBE_PRIORITY: VibeTag[] = [
  "cafe",
  "street_food",
  "drinks",
  "date_night",
  "healthy",
  "brunch",
  "sweets",
  "late_night",
  "outdoor",
  "rooftop",
  "family",
  "budget",
  "delivery",
  "spicy",
];

const MAX_AUTO_VIBES = 4;
const MIN_SCORE_THRESHOLD = 2;

function toLower(value?: string | null): string {
  return (value || "").toLowerCase();
}

function normalizeText(value?: string | null): string {
  return ` ${toLower(value).replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countKeywordHits(text: string, normalizedText: string, keyword: string): number {
  const key = keyword.trim().toLowerCase();
  if (!key) return 0;

  if (!/[a-z0-9]/.test(key)) return 0;

  // Phrase keywords are searched in normalized text with flexible spacing.
  if (key.includes(" ") || key.includes("-") || key.includes("/")) {
    const phrase = key.replace(/[-/]+/g, " ").trim().replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(?:^|\\s)${phrase}(?:$|\\s)`, "g");
    return normalizedText.match(regex)?.length ?? 0;
  }

  // Single token keywords use strict non-word boundaries to avoid noisy substring matches.
  const token = escapeRegex(key);
  const regex = new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`, "g");
  return text.match(regex)?.length ?? 0;
}

function scoreKeywordField(
  text: string,
  normalizedText: string,
  keyword: string,
  weight: number,
): number {
  const hits = countKeywordHits(text, normalizedText, keyword);
  if (hits <= 0) return 0;
  // Multiple hits in the same field matter, but quickly saturate.
  return Math.min(hits, 2) * weight;
}

function addScore(scores: Map<VibeTag, number>, vibe: VibeTag, amount: number): void {
  if (amount <= 0) return;
  scores.set(vibe, (scores.get(vibe) ?? 0) + amount);
}

function getScore(scores: Map<VibeTag, number>, vibe: VibeTag): number {
  return scores.get(vibe) ?? 0;
}

function capKeywordScore(score: number): number {
  return Math.min(score, 8);
}

export function autoAssignVibes(r: RestaurantLike): string[] {
  const scores = new Map<VibeTag, number>();
  const directSignal = new Map<VibeTag, number>();

  const nameLower = toLower(r.name);
  const catLower = toLower(r.category);
  const descLower = toLower(r.description);
  const addrLower = toLower(r.address);
  const reviewText = (r.reviews || []).map((rv) => toLower(rv.text)).join(" ");
  const nameNorm = normalizeText(r.name);
  const catNorm = normalizeText(r.category);
  const descNorm = normalizeText(r.description);
  const addrNorm = normalizeText(r.address);
  const reviewNorm = normalizeText(reviewText);

  // Weighted text evidence: a keyword in the name/category is much stronger than in reviews.
  for (const rule of KEYWORD_RULES) {
    let keywordScore = 0;
    let signalFields = 0;
    for (const kw of rule.keywords) {
      const nameScore = scoreKeywordField(nameLower, nameNorm, kw, FIELD_WEIGHTS.name);
      const catScore = scoreKeywordField(catLower, catNorm, kw, FIELD_WEIGHTS.category);
      const descScore = scoreKeywordField(descLower, descNorm, kw, FIELD_WEIGHTS.description);
      const addrScore = scoreKeywordField(addrLower, addrNorm, kw, FIELD_WEIGHTS.address);
      const reviewScore = scoreKeywordField(reviewText, reviewNorm, kw, FIELD_WEIGHTS.reviews);

      keywordScore += nameScore + catScore + descScore + addrScore + reviewScore;
      if (nameScore > 0) signalFields++;
      if (catScore > 0) signalFields++;
      if (descScore > 0) signalFields++;
      if (addrScore > 0) signalFields++;
      if (reviewScore > 0) signalFields++;
    }

    addScore(scores, rule.vibe, capKeywordScore(keywordScore));
    if (signalFields > 0) {
      directSignal.set(rule.vibe, (directSignal.get(rule.vibe) ?? 0) + 1);
    }
  }

  // Spicy cuisines as a prior (even if "spicy" keyword never appears).
  const cuisineParts = catLower.split(/[,·•\/\s]+/).map((s) => s.trim()).filter(Boolean);
  for (const part of cuisineParts) {
    if (CUISINE_SPICY.some((c) => part.includes(c))) {
      addScore(scores, "spicy", 2.2);
      break;
    }
  }

  const rating = Number.parseFloat(r.rating || "0");

  // Price/rating priors.
  if (r.priceLevel === 1) {
    addScore(scores, "budget", 3.5);
    addScore(scores, "street_food", 2.0);
    addScore(scores, "delivery", 1.5);
  } else if (r.priceLevel === 2) {
    addScore(scores, "budget", 2.2);
    addScore(scores, "delivery", 1.2);
  } else if (r.priceLevel >= 3) {
    addScore(scores, "date_night", 1.2);
    if (r.priceLevel >= 4) addScore(scores, "drinks", 0.8);
    if (rating >= 4.3) addScore(scores, "date_night", 1.8);
  }

  if (rating >= 4.5) {
    addScore(scores, "date_night", 0.8);
  }

  // Strong category priors for obvious classifications.
  if (catLower.includes("cafe") || catLower.includes("coffee")) addScore(scores, "cafe", 2.6);
  if (catLower.includes("rooftop")) addScore(scores, "rooftop", 3.0);
  if (catLower.includes("dessert") || catLower.includes("bakery")) addScore(scores, "sweets", 2.4);
  if (catLower.includes("street food")) addScore(scores, "street_food", 2.8);
  if (catLower.includes("family") || catLower.includes("buffet")) addScore(scores, "family", 1.7);

  // Delivery/aggregator signal regardless of price.
  if (
    nameLower.includes("delivery") ||
    catLower.includes("delivery") ||
    descLower.includes("delivery") ||
    descLower.includes("grab") ||
    descLower.includes("foodpanda") ||
    descLower.includes("lineman") ||
    descLower.includes("line man")
  ) {
    addScore(scores, "delivery", 2.0);
  }

  // District priors.
  const districtToCheck = r.district || detectDistrictFromAddress(r.address);
  if (districtToCheck) {
    const distVibes = DISTRICT_VIBES[districtToCheck];
    if (distVibes) {
      for (const dv of distVibes) {
        if (dv === "budget" && r.priceLevel >= 3) continue;
        if (dv === "date_night" && r.priceLevel === 1) continue;
        addScore(scores, dv, 1.3);
      }
    }
  }

  // Operating hours clues.
  if (r.openingHours && r.openingHours.length > 0) {
    for (const slot of r.openingHours) {
      const slotLower = toLower(slot.hours);
      if (slotLower.includes("24") && (slotLower.includes("24/7") || slotLower.includes("24 hours") || slotLower.includes("24 hrs"))) {
        addScore(scores, "late_night", 2.0);
        addScore(scores, "delivery", 1.0);
      }

      const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g;
      let m: RegExpExecArray | null;
      while ((m = timePattern.exec(slot.hours)) !== null) {
        const openRaw = Number.parseInt(m[1], 10);
        const openMeridiem = m[3];
        const closeRaw = Number.parseInt(m[4], 10);
        const closeMeridiem = m[6];
        if (!Number.isFinite(openRaw) || !Number.isFinite(closeRaw)) continue;

        const openHour = openMeridiem
          ? (openRaw % 12) + (openMeridiem === "pm" ? 12 : 0)
          : openRaw;
        const closeHour = closeMeridiem
          ? (closeRaw % 12) + (closeMeridiem === "pm" ? 12 : 0)
          : closeRaw;
        const overnight = closeHour < openHour;
        if (overnight || closeHour >= 23 || (closeHour >= 0 && closeHour <= 5)) addScore(scores, "late_night", 2.3);
        if (openHour >= 6 && openHour <= 10) addScore(scores, "brunch", 1.5);
      }
    }
  }

  // Correlation adjustments.
  if (getScore(scores, "rooftop") > 0) addScore(scores, "outdoor", 1.0);
  if (getScore(scores, "cafe") > 1.5) addScore(scores, "brunch", 0.8);
  if (getScore(scores, "sweets") > 2.5 && getScore(scores, "cafe") > 0) addScore(scores, "cafe", 0.7);
  if (getScore(scores, "drinks") > 2.5 && rating >= 4.2 && r.priceLevel >= 3) addScore(scores, "date_night", 0.8);

  // Prevent weaker priors from overpowering direct signals.
  if ((directSignal.get("drinks") ?? 0) === 0 && getScore(scores, "drinks") > 0 && getScore(scores, "cafe") >= getScore(scores, "drinks") + 2) {
    scores.set("drinks", Math.max(0, getScore(scores, "drinks") - 1.4));
  }
  if ((directSignal.get("cafe") ?? 0) === 0 && getScore(scores, "cafe") > 0 && getScore(scores, "drinks") >= getScore(scores, "cafe") + 2) {
    scores.set("cafe", Math.max(0, getScore(scores, "cafe") - 1.2));
  }
  if (r.priceLevel <= 2 && getScore(scores, "street_food") > 0 && getScore(scores, "date_night") > 0) {
    scores.set("date_night", Math.max(0, getScore(scores, "date_night") - 1.1));
  }

  if (r.priceLevel >= 3) {
    scores.set("budget", Math.max(0, getScore(scores, "budget") - 2));
    scores.set("street_food", Math.max(0, getScore(scores, "street_food") - 1));
  }

  const ranked = VIBE_TAGS
    .map((vibe) => ({ vibe, score: getScore(scores, vibe) }))
    .filter((item) => item.score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return VIBE_PRIORITY.indexOf(a.vibe) - VIBE_PRIORITY.indexOf(b.vibe);
    })
    .slice(0, MAX_AUTO_VIBES)
    .map((item) => item.vibe);

  if (ranked.length > 0) return ranked;

  // Defensive fallback so every restaurant gets at least one reasonable vibe.
  if (catLower.includes("cafe") || catLower.includes("coffee")) return ["cafe"];
  if (r.priceLevel <= 2) return ["budget"];
  return ["family"];
}

export function autoDetectDistrict(address: string): string | null {
  return detectDistrictFromAddress(address);
}
