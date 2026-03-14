import { z } from "zod";
import type { Restaurant } from "@shared/schema";

export type CuisineKey =
  | "thai"
  | "japanese"
  | "korean"
  | "chinese"
  | "indian"
  | "vietnamese"
  | "italian"
  | "american"
  | "cafe"
  | "bar"
  | "seafood"
  | "fusion"
  | "steak"
  | "generic";

export type DishTemplate = {
  name: string;
  description: string;
  tags: string[];
  dietFlags: string[];
  imageKeys: string[];
};

export type CuisineProfile = {
  key: CuisineKey;
  matchers: RegExp[];
  templates: DishTemplate[];
};

export type ImageCatalog = Record<string, string[]>;
export type CuisineFallbackImages = Record<CuisineKey, string[]>;

export type RestaurantSeed = Pick<Restaurant, "id" | "name" | "category" | "priceLevel" | "description" | "district">;

export type MenuTextCandidate = {
  name: string;
  description: string;
  tags: string[];
  dietFlags: string[];
  imageKeys?: string[];
};

export type GeneratedMenuDraft = {
  name: string;
  description: string;
  imageUrl: string;
  priceApprox: number;
  tags: string[];
  dietFlags: string[];
  isActive: boolean;
  isSponsored: boolean;
};

export const openAIDishesResponseSchema = z.object({
  dishes: z.array(
    z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(280),
      tags: z.array(z.string().min(1).max(32)).max(8).default([]),
      dietFlags: z.array(z.string().min(1).max(32)).max(5).default([]),
    }),
  ).min(1).max(12),
});

export function parseOpenAIDishesResponse(raw: string): MenuTextCandidate[] {
  const parsed = openAIDishesResponseSchema.parse(JSON.parse(raw));
  return parsed.dishes.map((d) => ({
    name: d.name,
    description: d.description,
    tags: d.tags ?? [],
    dietFlags: d.dietFlags ?? [],
  }));
}

const PLACEHOLDER_NAME_PATTERNS = [
  /^chef special$/i,
  /^signature dish$/i,
  /^special$/i,
  /^coming soon$/i,
  /^menu item$/i,
  /^placeholder/i,
  /^test/i,
];

function isPlaceholderName(name: string): boolean {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) return true;
  return PLACEHOLDER_NAME_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function countRealActiveMenus(items: Array<{ name: string; isActive: boolean }>): number {
  return items.filter((item) => item.isActive && !isPlaceholderName(item.name)).length;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeTagList(values: string[], maxItems: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeToken(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= maxItems) break;
  }
  return out;
}

function hashToFloat(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function pickDeterministic<T>(items: T[], seed: string): T {
  if (items.length === 0) throw new Error("Cannot pick from empty array");
  const idx = Math.floor(hashToFloat(seed) * items.length) % items.length;
  return items[idx]!;
}

export function estimatePriceApprox(args: {
  priceLevel: number;
  cuisineKey: CuisineKey;
  dishName: string;
  restaurantId: number;
}): number {
  const boundsByLevel: Record<number, [number, number]> = {
    1: [100, 200],
    2: [200, 400],
    3: [400, 700],
    4: [700, 1200],
  };
  const level = Number.isFinite(args.priceLevel) ? Math.max(1, Math.min(4, Math.round(args.priceLevel))) : 2;
  const [minBase, maxBase] = boundsByLevel[level] ?? boundsByLevel[2];

  let min = minBase;
  let max = maxBase;
  if (args.cuisineKey === "cafe" || args.cuisineKey === "bar") {
    min = Math.round(min * 0.75);
    max = Math.round(max * 0.85);
  } else if (args.cuisineKey === "steak" || args.cuisineKey === "seafood") {
    min = Math.round(min * 1.1);
    max = Math.round(max * 1.2);
  }

  const ratio = hashToFloat(`${args.restaurantId}|${args.dishName}|${args.cuisineKey}`);
  const raw = min + (max - min) * ratio;
  return Math.max(60, Math.round(raw / 10) * 10);
}

export const IMAGE_CATALOG: ImageCatalog = {
  pad_thai: [
    "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=1200&auto=format&fit=crop&q=60",
  ],
  curry_bowl: [
    "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=1200&auto=format&fit=crop&q=60",
  ],
  noodle_soup: [
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&auto=format&fit=crop&q=60",
  ],
  sushi: [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&auto=format&fit=crop&q=60",
  ],
  ramen: [
    "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=1200&auto=format&fit=crop&q=60",
  ],
  korean_bbq: [
    "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1583224964978-2257b960c3d3?w=1200&auto=format&fit=crop&q=60",
  ],
  dim_sum: [
    "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1200&auto=format&fit=crop&q=60",
  ],
  biryani: [
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200&auto=format&fit=crop&q=60",
  ],
  pho: [
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&auto=format&fit=crop&q=60",
  ],
  pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&auto=format&fit=crop&q=60",
  ],
  pasta: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&auto=format&fit=crop&q=60",
  ],
  burger: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1200&auto=format&fit=crop&q=60",
  ],
  steak: [
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=60",
  ],
  seafood: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&auto=format&fit=crop&q=60",
  ],
  brunch: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=60",
  ],
  coffee: [
    "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&auto=format&fit=crop&q=60",
  ],
  dessert: [
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=1200&auto=format&fit=crop&q=60",
  ],
  cocktail: [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=1200&auto=format&fit=crop&q=60",
  ],
  salad: [
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=60",
  ],
  fried_rice: [
    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=1200&auto=format&fit=crop&q=60",
  ],
};

const GLOBAL_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&auto=format&fit=crop&q=60",
];

export const CUISINE_FALLBACK_IMAGES: CuisineFallbackImages = {
  thai: [IMAGE_CATALOG.pad_thai[0]!, IMAGE_CATALOG.curry_bowl[0]!, IMAGE_CATALOG.noodle_soup[0]!],
  japanese: [IMAGE_CATALOG.sushi[0]!, IMAGE_CATALOG.ramen[0]!],
  korean: [IMAGE_CATALOG.korean_bbq[0]!, IMAGE_CATALOG.noodle_soup[0]!],
  chinese: [IMAGE_CATALOG.dim_sum[0]!, IMAGE_CATALOG.noodle_soup[0]!],
  indian: [IMAGE_CATALOG.biryani[0]!, IMAGE_CATALOG.curry_bowl[1]!],
  vietnamese: [IMAGE_CATALOG.pho[0]!, IMAGE_CATALOG.salad[0]!],
  italian: [IMAGE_CATALOG.pizza[0]!, IMAGE_CATALOG.pasta[0]!],
  american: [IMAGE_CATALOG.burger[0]!, IMAGE_CATALOG.steak[0]!],
  cafe: [IMAGE_CATALOG.brunch[0]!, IMAGE_CATALOG.coffee[0]!, IMAGE_CATALOG.dessert[0]!],
  bar: [IMAGE_CATALOG.cocktail[0]!, IMAGE_CATALOG.brunch[0]!],
  seafood: [IMAGE_CATALOG.seafood[0]!, IMAGE_CATALOG.seafood[1]!],
  fusion: [IMAGE_CATALOG.noodle_soup[1]!, IMAGE_CATALOG.pizza[1]!, IMAGE_CATALOG.cocktail[1]!],
  steak: [IMAGE_CATALOG.steak[0]!, IMAGE_CATALOG.seafood[0]!],
  generic: GLOBAL_FALLBACK_IMAGES,
};

function buildTemplates(items: Array<Omit<DishTemplate, "dietFlags"> & { dietFlags?: string[] }>): DishTemplate[] {
  return items.map((item) => ({
    ...item,
    dietFlags: item.dietFlags ?? [],
  }));
}

export const CUISINE_PROFILES: CuisineProfile[] = [
  {
    key: "thai",
    matchers: [/thai/i, /street\s*food/i, /isaan/i, /som\s*tum/i, /northern/i],
    templates: buildTemplates([
      { name: "Pad Kra Pao Moo", description: "Wok-fried minced pork with holy basil and chili over jasmine rice.", tags: ["thai", "wok", "spicy"], imageKeys: ["pad_thai"] },
      { name: "Pad Thai Goong", description: "Classic stir-fried rice noodles with prawns, tamarind sauce, and peanuts.", tags: ["thai", "noodles", "popular"], imageKeys: ["pad_thai"] },
      { name: "Tom Yum Goong", description: "Hot and sour prawn soup with lemongrass, galangal, and kaffir lime.", tags: ["thai", "soup", "spicy"], imageKeys: ["curry_bowl"] },
      { name: "Green Curry Chicken", description: "Creamy coconut green curry with chicken, eggplant, and sweet basil.", tags: ["thai", "curry"], imageKeys: ["curry_bowl"] },
      { name: "Som Tum Thai", description: "Fresh green papaya salad with lime, fish sauce, peanuts, and palm sugar.", tags: ["thai", "salad", "fresh"], imageKeys: ["salad"] },
      { name: "Massaman Beef", description: "Rich southern-style curry with tender beef, potatoes, and roasted spices.", tags: ["thai", "curry"], imageKeys: ["curry_bowl"] },
      { name: "Crab Omelette", description: "Fluffy Thai-style omelette filled with sweet crab meat.", tags: ["thai", "seafood"], imageKeys: ["seafood"] },
      { name: "Mango Sticky Rice", description: "Sweet sticky rice served with ripe mango and coconut cream.", tags: ["dessert", "thai"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "japanese",
    matchers: [/japanese/i, /sushi/i, /ramen/i, /izakaya/i, /donburi/i],
    templates: buildTemplates([
      { name: "Salmon Nigiri Set", description: "Fresh salmon nigiri selection with wasabi and pickled ginger.", tags: ["japanese", "sushi"], imageKeys: ["sushi"] },
      { name: "Tonkotsu Ramen", description: "Rich pork bone broth ramen with chashu, egg, and spring onion.", tags: ["japanese", "ramen"], imageKeys: ["ramen"] },
      { name: "Chicken Katsu Curry", description: "Crispy chicken cutlet served with Japanese curry rice.", tags: ["japanese", "curry"], imageKeys: ["curry_bowl"] },
      { name: "Gyudon Bowl", description: "Simmered beef and onions over steamed rice with soft egg.", tags: ["japanese", "rice_bowl"], imageKeys: ["fried_rice"] },
      { name: "Tempura Udon", description: "Thick udon noodles in dashi broth with crispy prawn tempura.", tags: ["japanese", "noodles"], imageKeys: ["noodle_soup"] },
      { name: "Yakitori Platter", description: "Assorted charcoal-grilled chicken skewers with tare glaze.", tags: ["japanese", "grill"], imageKeys: ["steak"] },
      { name: "Unagi Don", description: "Grilled eel glazed with tare sauce over fluffy rice.", tags: ["japanese", "rice_bowl", "seafood"], imageKeys: ["seafood"] },
      { name: "Matcha Parfait", description: "Layered matcha parfait with mochi, red bean, and vanilla cream.", tags: ["dessert", "japanese"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "korean",
    matchers: [/korean/i, /kimchi/i, /tteok/i, /samgyeop/i, /bulgogi/i],
    templates: buildTemplates([
      { name: "Bibimbap", description: "Rice bowl topped with seasoned vegetables, egg, and gochujang sauce.", tags: ["korean", "rice_bowl"], imageKeys: ["fried_rice"] },
      { name: "Korean Fried Chicken", description: "Crispy double-fried chicken glazed with sweet spicy sauce.", tags: ["korean", "fried", "popular"], imageKeys: ["korean_bbq"] },
      { name: "Samgyeopsal Set", description: "Grilled pork belly served with banchan and ssam vegetables.", tags: ["korean", "bbq"], imageKeys: ["korean_bbq"] },
      { name: "Kimchi Jjigae", description: "Comforting kimchi stew with tofu, pork, and spring onion.", tags: ["korean", "stew", "spicy"], imageKeys: ["curry_bowl"] },
      { name: "Tteokbokki", description: "Chewy rice cakes in spicy gochujang sauce with fish cake.", tags: ["korean", "spicy"], imageKeys: ["korean_bbq"] },
      { name: "Bulgogi Rice Bowl", description: "Marinated beef slices stir-fried with onions and sesame over rice.", tags: ["korean", "beef"], imageKeys: ["fried_rice"] },
      { name: "Japchae", description: "Sweet potato glass noodles with stir-fried vegetables and sesame.", tags: ["korean", "noodles"], imageKeys: ["noodle_soup"] },
      { name: "Sundubu Jjigae", description: "Silky soft tofu stew with chili broth and egg.", tags: ["korean", "stew"], imageKeys: ["curry_bowl"] },
    ]),
  },
  {
    key: "chinese",
    matchers: [/chinese/i, /dim\s*sum/i, /cantonese/i, /sichuan/i],
    templates: buildTemplates([
      { name: "Xiao Long Bao", description: "Steamed soup dumplings with savory pork filling.", tags: ["chinese", "dim_sum"], imageKeys: ["dim_sum"] },
      { name: "Char Siu Rice", description: "Cantonese BBQ pork over rice with house soy glaze.", tags: ["chinese", "bbq"], imageKeys: ["fried_rice"] },
      { name: "Wonton Noodle Soup", description: "Egg noodles in clear broth with shrimp pork wontons.", tags: ["chinese", "noodles", "soup"], imageKeys: ["noodle_soup"] },
      { name: "Kung Pao Chicken", description: "Stir-fried chicken with dried chili, peanuts, and scallions.", tags: ["chinese", "spicy"], imageKeys: ["steak"] },
      { name: "Mapo Tofu", description: "Silken tofu in spicy fermented bean chili sauce.", tags: ["chinese", "tofu", "spicy"], dietFlags: ["vegetarian"], imageKeys: ["curry_bowl"] },
      { name: "Roast Duck Plate", description: "Crispy-skinned roast duck served with fragrant rice.", tags: ["chinese", "roast"], imageKeys: ["steak"] },
      { name: "Stir-Fried Morning Glory", description: "Wok-tossed morning glory with garlic and soy.", tags: ["chinese", "vegetable"], dietFlags: ["vegetarian"], imageKeys: ["salad"] },
      { name: "Egg Tart", description: "Flaky pastry tart with silky egg custard filling.", tags: ["dessert", "chinese"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "indian",
    matchers: [/indian/i, /biryani/i, /tandoor/i, /curry/i, /masala/i],
    templates: buildTemplates([
      { name: "Chicken Biryani", description: "Fragrant basmati rice layered with spiced chicken.", tags: ["indian", "rice"], imageKeys: ["biryani"] },
      { name: "Butter Chicken", description: "Tandoor chicken in creamy tomato butter gravy.", tags: ["indian", "curry"], imageKeys: ["curry_bowl"] },
      { name: "Paneer Tikka Masala", description: "Char-grilled paneer cubes in rich masala gravy.", tags: ["indian", "curry"], dietFlags: ["vegetarian"], imageKeys: ["curry_bowl"] },
      { name: "Garlic Naan Set", description: "Fresh tandoor naan brushed with garlic butter.", tags: ["indian", "bread"], dietFlags: ["vegetarian"], imageKeys: ["brunch"] },
      { name: "Tandoori Chicken", description: "Yogurt-marinated chicken roasted in a tandoor oven.", tags: ["indian", "grill"], imageKeys: ["steak"] },
      { name: "Chana Masala", description: "Slow-cooked chickpeas with tomato and warming spices.", tags: ["indian", "curry"], dietFlags: ["vegan", "vegetarian"], imageKeys: ["curry_bowl"] },
      { name: "Lamb Rogan Josh", description: "Kashmiri-style lamb curry with aromatic spice blend.", tags: ["indian", "lamb"], imageKeys: ["curry_bowl"] },
      { name: "Mango Lassi", description: "Chilled yogurt drink blended with ripe mango.", tags: ["drink", "indian"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "vietnamese",
    matchers: [/vietnamese/i, /pho/i, /banh\s*mi/i],
    templates: buildTemplates([
      { name: "Pho Bo", description: "Slow-simmered beef broth with rice noodles and herbs.", tags: ["vietnamese", "noodles", "soup"], imageKeys: ["pho"] },
      { name: "Banh Mi Pork", description: "Crispy baguette with pork, pickled carrot, and cilantro.", tags: ["vietnamese", "sandwich"], imageKeys: ["brunch"] },
      { name: "Bun Cha", description: "Grilled pork patties with rice vermicelli and herbs.", tags: ["vietnamese", "grill"], imageKeys: ["steak"] },
      { name: "Fresh Spring Rolls", description: "Rice paper rolls with shrimp, herbs, and dipping sauce.", tags: ["vietnamese", "fresh"], imageKeys: ["salad"] },
      { name: "Lemongrass Chicken Rice", description: "Charred lemongrass chicken served over steamed rice.", tags: ["vietnamese", "rice"], imageKeys: ["fried_rice"] },
      { name: "Bun Bo Hue", description: "Spicy central Vietnam noodle soup with beef slices.", tags: ["vietnamese", "spicy", "soup"], imageKeys: ["noodle_soup"] },
      { name: "Vietnamese Iced Coffee", description: "Strong drip coffee with sweetened milk and ice.", tags: ["drink", "coffee"], dietFlags: ["vegetarian"], imageKeys: ["coffee"] },
      { name: "Che Dessert Bowl", description: "Sweet Vietnamese dessert with coconut milk and jelly.", tags: ["dessert", "vietnamese"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "italian",
    matchers: [/italian/i, /pizza/i, /pasta/i, /trattoria/i],
    templates: buildTemplates([
      { name: "Margherita Pizza", description: "Wood-fired pizza with tomato, mozzarella, and basil.", tags: ["italian", "pizza"], dietFlags: ["vegetarian"], imageKeys: ["pizza"] },
      { name: "Truffle Mushroom Pizza", description: "Creamy mushroom pizza finished with truffle oil.", tags: ["italian", "pizza"], dietFlags: ["vegetarian"], imageKeys: ["pizza"] },
      { name: "Spaghetti Carbonara", description: "Classic Roman pasta with pancetta, egg, and pecorino.", tags: ["italian", "pasta"], imageKeys: ["pasta"] },
      { name: "Aglio e Olio", description: "Spaghetti tossed with olive oil, garlic, and chili flakes.", tags: ["italian", "pasta"], dietFlags: ["vegetarian"], imageKeys: ["pasta"] },
      { name: "Lasagna Bolognese", description: "Layered pasta baked with beef ragu and bechamel sauce.", tags: ["italian", "baked"], imageKeys: ["pasta"] },
      { name: "Risotto Funghi", description: "Creamy Arborio rice with mixed mushrooms and parmesan.", tags: ["italian", "risotto"], dietFlags: ["vegetarian"], imageKeys: ["curry_bowl"] },
      { name: "Burrata Salad", description: "Fresh burrata with tomato, basil, and extra virgin olive oil.", tags: ["italian", "salad"], dietFlags: ["vegetarian"], imageKeys: ["salad"] },
      { name: "Tiramisu", description: "Espresso-soaked ladyfingers layered with mascarpone cream.", tags: ["dessert", "italian"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "american",
    matchers: [/american/i, /burger/i, /bbq/i, /diner/i],
    templates: buildTemplates([
      { name: "Classic Cheeseburger", description: "Grilled beef patty with cheddar, lettuce, tomato, and sauce.", tags: ["american", "burger"], imageKeys: ["burger"] },
      { name: "BBQ Bacon Burger", description: "Smoky BBQ burger stacked with crispy bacon and onion.", tags: ["american", "burger", "bbq"], imageKeys: ["burger"] },
      { name: "Buffalo Wings", description: "Crispy wings tossed in tangy buffalo sauce.", tags: ["american", "fried"], imageKeys: ["korean_bbq"] },
      { name: "Mac and Cheese", description: "Creamy baked macaroni with cheddar and parmesan crust.", tags: ["american", "comfort_food"], dietFlags: ["vegetarian"], imageKeys: ["pasta"] },
      { name: "Pulled Pork Sandwich", description: "Slow-cooked pulled pork with house slaw on brioche bun.", tags: ["american", "sandwich"], imageKeys: ["burger"] },
      { name: "Loaded Fries", description: "Crispy fries topped with cheese sauce, bacon, and scallions.", tags: ["american", "snack"], imageKeys: ["burger"] },
      { name: "Grilled Chicken Caesar", description: "Romaine salad with grilled chicken, croutons, and parmesan.", tags: ["american", "salad"], imageKeys: ["salad"] },
      { name: "Chocolate Brownie", description: "Warm fudgy brownie served with vanilla cream.", tags: ["dessert"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "cafe",
    matchers: [/cafe/i, /coffee/i, /brunch/i, /bakery/i, /dessert/i],
    templates: buildTemplates([
      { name: "Avocado Toast", description: "Sourdough toast topped with smashed avocado and cherry tomato.", tags: ["cafe", "brunch"], dietFlags: ["vegetarian"], imageKeys: ["brunch"] },
      { name: "Eggs Benedict", description: "Poached eggs on toasted muffin with hollandaise sauce.", tags: ["cafe", "brunch"], imageKeys: ["brunch"] },
      { name: "Buttermilk Pancakes", description: "Stack of fluffy pancakes with maple syrup and butter.", tags: ["cafe", "breakfast"], dietFlags: ["vegetarian"], imageKeys: ["brunch"] },
      { name: "Croissant Sandwich", description: "Buttery croissant sandwich with egg and smoked ham.", tags: ["cafe", "sandwich"], imageKeys: ["brunch"] },
      { name: "Acai Bowl", description: "Chilled acai bowl with granola, banana, and seasonal fruit.", tags: ["cafe", "healthy"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
      { name: "Iced Latte", description: "Double espresso with cold milk served over ice.", tags: ["coffee", "drink"], dietFlags: ["vegetarian"], imageKeys: ["coffee"] },
      { name: "Matcha Latte", description: "Whisked premium matcha with steamed milk.", tags: ["coffee", "drink"], dietFlags: ["vegetarian"], imageKeys: ["coffee"] },
      { name: "Basque Cheesecake", description: "Creamy burnt cheesecake with caramelized top.", tags: ["dessert", "cafe"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "bar",
    matchers: [/bar/i, /cocktail/i, /pub/i, /rooftop/i],
    templates: buildTemplates([
      { name: "Truffle Fries", description: "Crispy fries tossed with truffle oil and parmesan.", tags: ["bar_bites", "snack"], dietFlags: ["vegetarian"], imageKeys: ["burger"] },
      { name: "Chicken Karaage Bites", description: "Japanese-style crispy chicken bites with spicy mayo.", tags: ["bar_bites", "fried"], imageKeys: ["korean_bbq"] },
      { name: "Nachos Supreme", description: "Corn chips topped with salsa, cheese, and jalapenos.", tags: ["bar_bites", "shareable"], imageKeys: ["burger"] },
      { name: "Beef Sliders", description: "Mini beef sliders with caramelized onions and pickles.", tags: ["bar_bites", "burger"], imageKeys: ["burger"] },
      { name: "Calamari Rings", description: "Golden fried calamari served with citrus aioli.", tags: ["bar_bites", "seafood"], imageKeys: ["seafood"] },
      { name: "Signature Negroni", description: "Classic negroni with gin, vermouth, and bitter orange.", tags: ["cocktail", "drink"], dietFlags: ["vegetarian"], imageKeys: ["cocktail"] },
      { name: "Passionfruit Spritz", description: "Refreshing sparkling cocktail with passionfruit and citrus.", tags: ["cocktail", "drink"], dietFlags: ["vegetarian"], imageKeys: ["cocktail"] },
      { name: "Citrus Fizz Mocktail", description: "Alcohol-free citrus cooler with soda and mint.", tags: ["mocktail", "drink"], dietFlags: ["vegan", "vegetarian"], imageKeys: ["cocktail"] },
    ]),
  },
  {
    key: "seafood",
    matchers: [/seafood/i, /prawn/i, /fish/i, /oyster/i, /crab/i],
    templates: buildTemplates([
      { name: "Grilled River Prawn", description: "Charcoal-grilled river prawn served with seafood sauce.", tags: ["seafood", "grill"], imageKeys: ["seafood"] },
      { name: "Steamed Sea Bass Lime", description: "Steamed sea bass in garlic-lime chili broth.", tags: ["seafood", "thai"], imageKeys: ["seafood"] },
      { name: "Crab Fried Rice", description: "Wok-fried jasmine rice with sweet crab meat and egg.", tags: ["seafood", "rice"], imageKeys: ["fried_rice"] },
      { name: "Garlic Pepper Squid", description: "Tender squid stir-fried with garlic and cracked pepper.", tags: ["seafood", "wok"], imageKeys: ["seafood"] },
      { name: "Tom Yum Seafood", description: "Hot and sour broth with prawns, squid, and mushrooms.", tags: ["seafood", "soup", "spicy"], imageKeys: ["curry_bowl"] },
      { name: "Stir-Fried Clams Basil", description: "Fresh clams wok-fried with basil and chili paste.", tags: ["seafood", "spicy"], imageKeys: ["seafood"] },
      { name: "Seafood Glass Noodles", description: "Claypot glass noodles with mixed seafood and ginger.", tags: ["seafood", "noodles"], imageKeys: ["noodle_soup"] },
      { name: "Oyster Omelette", description: "Crispy Thai oyster omelette with bean sprouts.", tags: ["seafood", "street_food"], imageKeys: ["seafood"] },
    ]),
  },
  {
    key: "fusion",
    matchers: [/fusion/i, /modern/i, /contemporary/i],
    templates: buildTemplates([
      { name: "Truffle Pad Thai", description: "Pad thai with tiger prawns and aromatic truffle finish.", tags: ["fusion", "thai"], imageKeys: ["pad_thai"] },
      { name: "Miso Butter Salmon Rice", description: "Grilled salmon with miso butter glaze over rice.", tags: ["fusion", "japanese"], imageKeys: ["seafood"] },
      { name: "Tom Yum Pasta", description: "Creamy pasta infused with tom yum spices and prawns.", tags: ["fusion", "pasta", "spicy"], imageKeys: ["pasta"] },
      { name: "Korean BBQ Tacos", description: "Soft tacos filled with bulgogi beef and kimchi slaw.", tags: ["fusion", "korean"], imageKeys: ["korean_bbq"] },
      { name: "Green Curry Risotto", description: "Creamy risotto with Thai green curry notes and basil.", tags: ["fusion", "risotto"], imageKeys: ["curry_bowl"] },
      { name: "Smoked Duck Larb", description: "Spicy herb salad with smoked duck and toasted rice powder.", tags: ["fusion", "thai", "spicy"], imageKeys: ["steak"] },
      { name: "Yuzu Cheesecake", description: "Silky cheesecake with bright yuzu citrus profile.", tags: ["fusion", "dessert"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
      { name: "Thai Tea Creme Brulee", description: "Caramelized custard infused with Thai tea.", tags: ["fusion", "dessert"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "steak",
    matchers: [/steak/i, /grillhouse/i, /wagyu/i, /ribeye/i],
    templates: buildTemplates([
      { name: "Ribeye Steak", description: "Char-grilled ribeye served with roasted vegetables.", tags: ["steak", "beef"], imageKeys: ["steak"] },
      { name: "Striploin Steak", description: "Juicy striploin with herb butter and sea salt.", tags: ["steak", "beef"], imageKeys: ["steak"] },
      { name: "Wagyu Don", description: "Sliced wagyu over warm rice with house tare.", tags: ["steak", "japanese"], imageKeys: ["steak"] },
      { name: "Grilled Lamb Chops", description: "Tender lamb chops with rosemary and garlic jus.", tags: ["steak", "lamb"], imageKeys: ["steak"] },
      { name: "Creamed Spinach", description: "Classic creamy spinach side dish.", tags: ["steakhouse", "side"], dietFlags: ["vegetarian"], imageKeys: ["salad"] },
      { name: "Truffle Mash", description: "Buttery mashed potatoes with truffle aroma.", tags: ["steakhouse", "side"], dietFlags: ["vegetarian"], imageKeys: ["brunch"] },
      { name: "Peppercorn Sauce Set", description: "House peppercorn sauce served with grilled proteins.", tags: ["steakhouse", "sauce"], imageKeys: ["steak"] },
      { name: "Chocolate Lava Cake", description: "Warm molten chocolate cake with vanilla cream.", tags: ["dessert"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
    ]),
  },
  {
    key: "generic",
    matchers: [/^$/],
    templates: buildTemplates([
      { name: "House Fried Rice", description: "Wok-fried rice with vegetables and house seasoning.", tags: ["house_special"], imageKeys: ["fried_rice"] },
      { name: "Signature Noodle Bowl", description: "Savory noodle bowl with seasonal toppings.", tags: ["house_special", "noodles"], imageKeys: ["noodle_soup"] },
      { name: "Grilled Chicken Plate", description: "Juicy grilled chicken with herb rice and sauce.", tags: ["grill"], imageKeys: ["steak"] },
      { name: "Seasonal Salad", description: "Fresh seasonal greens with light citrus dressing.", tags: ["salad", "fresh"], dietFlags: ["vegan", "vegetarian"], imageKeys: ["salad"] },
      { name: "Chef Soup of the Day", description: "Daily rotating soup made from fresh ingredients.", tags: ["soup"], imageKeys: ["curry_bowl"] },
      { name: "Crispy Appetizer Platter", description: "Selection of crispy starters for sharing.", tags: ["appetizer", "shareable"], imageKeys: ["korean_bbq"] },
      { name: "House Dessert", description: "Daily dessert crafted by the pastry station.", tags: ["dessert"], dietFlags: ["vegetarian"], imageKeys: ["dessert"] },
      { name: "Refreshing Iced Tea", description: "Brewed house tea served chilled with citrus.", tags: ["drink"], dietFlags: ["vegan", "vegetarian"], imageKeys: ["coffee"] },
    ]),
  },
];

const IMAGE_KEYWORD_INDEX: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /\b(pad thai|noodle|ramen|udon|pho|vermicelli)\b/i, key: "noodle_soup" },
  { pattern: /\b(sushi|nigiri|sashimi)\b/i, key: "sushi" },
  { pattern: /\b(curry|masala|tom yum|jjigae|stew)\b/i, key: "curry_bowl" },
  { pattern: /\b(pizza)\b/i, key: "pizza" },
  { pattern: /\b(pasta|lasagna|risotto)\b/i, key: "pasta" },
  { pattern: /\b(burger|slider|fries|nachos|sandwich)\b/i, key: "burger" },
  { pattern: /\b(steak|ribeye|striploin|wagyu|lamb)\b/i, key: "steak" },
  { pattern: /\b(seafood|prawn|shrimp|crab|fish|oyster|clam|squid)\b/i, key: "seafood" },
  { pattern: /\b(coffee|latte|matcha|tea)\b/i, key: "coffee" },
  { pattern: /\b(cocktail|mocktail|spritz|negroni)\b/i, key: "cocktail" },
  { pattern: /\b(salad|spring roll|vegetable)\b/i, key: "salad" },
  { pattern: /\b(dessert|cake|cheesecake|brownie|parfait|sticky rice)\b/i, key: "dessert" },
  { pattern: /\b(brunch|pancake|eggs|toast|croissant)\b/i, key: "brunch" },
  { pattern: /\b(biryani)\b/i, key: "biryani" },
  { pattern: /\b(dim sum|dumpling|bao)\b/i, key: "dim_sum" },
  { pattern: /\b(kbbq|bulgogi|samgyeopsal|karaage)\b/i, key: "korean_bbq" },
  { pattern: /\b(fried rice|rice bowl|gyudon|don)\b/i, key: "fried_rice" },
];

export function detectCuisineKey(category: string): CuisineKey {
  const normalized = category.trim().toLowerCase();
  if (!normalized) return "generic";
  for (const profile of CUISINE_PROFILES) {
    if (profile.key === "generic") continue;
    if (profile.matchers.some((matcher) => matcher.test(normalized))) return profile.key;
  }
  return "generic";
}

function getCuisineProfile(cuisineKey: CuisineKey): CuisineProfile {
  return CUISINE_PROFILES.find((profile) => profile.key === cuisineKey) ?? CUISINE_PROFILES[CUISINE_PROFILES.length - 1]!;
}

function deriveImageKeysFromDish(text: string, tags: string[], cuisineKey: CuisineKey): string[] {
  const combined = `${text} ${(tags ?? []).join(" ")}`;
  const out: string[] = [];
  for (const item of IMAGE_KEYWORD_INDEX) {
    if (item.pattern.test(combined)) out.push(item.key);
  }
  if (out.length === 0 && CUISINE_FALLBACK_IMAGES[cuisineKey]?.length) {
    if (cuisineKey === "cafe") out.push("coffee");
    else if (cuisineKey === "bar") out.push("cocktail");
    else if (cuisineKey === "thai") out.push("pad_thai");
    else if (cuisineKey === "japanese") out.push("sushi");
  }
  return Array.from(new Set(out));
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveMenuImageUrl(args: {
  imageKeys?: string[];
  cuisineKey: CuisineKey;
  restaurantId: number;
  itemIndex: number;
}): string {
  const keys = (args.imageKeys ?? []).filter(Boolean);
  for (const key of keys) {
    const candidates = IMAGE_CATALOG[key];
    if (!candidates?.length) continue;
    const picked = pickDeterministic(candidates, `${args.restaurantId}|${args.itemIndex}|${key}`);
    if (picked && isValidHttpUrl(picked)) return picked;
  }

  const cuisineCandidates = CUISINE_FALLBACK_IMAGES[args.cuisineKey] ?? [];
  if (cuisineCandidates.length) {
    const picked = pickDeterministic(cuisineCandidates, `${args.restaurantId}|${args.itemIndex}|${args.cuisineKey}`);
    if (picked && isValidHttpUrl(picked)) return picked;
  }

  return pickDeterministic(GLOBAL_FALLBACK_IMAGES, `${args.restaurantId}|${args.itemIndex}|fallback`);
}

function sanitizeDescription(input: string, fallbackName: string): string {
  const text = input.trim().replace(/\s+/g, " ");
  if (text.length >= 12) return text.slice(0, 280);
  return `${fallbackName} prepared with balanced flavor and fresh ingredients.`;
}

function sanitizeName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 100);
}

function sanitizeDishCandidate(candidate: MenuTextCandidate, cuisineKey: CuisineKey, fallbackIndex: number): MenuTextCandidate | null {
  const name = sanitizeName(candidate.name);
  if (!name) return null;
  const description = sanitizeDescription(candidate.description ?? "", name);
  const tags = normalizeTagList([
    ...(candidate.tags ?? []),
    cuisineKey,
    "signature",
  ], 6);
  const dietFlags = normalizeTagList(candidate.dietFlags ?? [], 3);
  const imageKeys = candidate.imageKeys?.length
    ? candidate.imageKeys
    : deriveImageKeysFromDish(`${name} ${description}`, tags, cuisineKey);
  return {
    name,
    description,
    tags,
    dietFlags,
    imageKeys: imageKeys.length ? imageKeys : ["fried_rice", "noodle_soup", "salad"].slice(0, 1 + (fallbackIndex % 2)),
  };
}

function pickFallbackTemplates(cuisineKey: CuisineKey, targetCount: number, restaurantId: number): DishTemplate[] {
  const templates = getCuisineProfile(cuisineKey).templates;
  if (templates.length === 0) return [];
  const start = restaurantId % templates.length;
  const out: DishTemplate[] = [];
  for (let i = 0; i < Math.max(targetCount * 2, templates.length); i += 1) {
    out.push(templates[(start + i) % templates.length]!);
    if (out.length >= targetCount * 2) break;
  }
  return out;
}

export function buildMenuDrafts(input: {
  restaurant: RestaurantSeed;
  targetCount: number;
  existingNames: string[];
  llmDishes?: MenuTextCandidate[];
}): {
  cuisineKey: CuisineKey;
  drafts: GeneratedMenuDraft[];
  usedLlm: boolean;
  usedFallback: boolean;
  duplicatesFiltered: number;
  missingImages: number;
} {
  const cuisineKey = detectCuisineKey(input.restaurant.category ?? "");
  const targetCount = Math.max(5, Math.min(8, Math.round(input.targetCount)));
  const existingNames = new Set(input.existingNames.map((name) => sanitizeName(name).toLowerCase()).filter(Boolean));
  const seenNames = new Set<string>();

  const llmCandidates = (input.llmDishes ?? [])
    .map((dish, idx) => sanitizeDishCandidate(dish, cuisineKey, idx))
    .filter((item): item is MenuTextCandidate => Boolean(item))
    .map((item) => ({ ...item, source: "llm" as const }));

  const fallbackTemplates = pickFallbackTemplates(cuisineKey, targetCount, input.restaurant.id);
  const fallbackCandidates = fallbackTemplates
    .map((template, idx) => sanitizeDishCandidate(template, cuisineKey, idx))
    .filter((item): item is MenuTextCandidate => Boolean(item))
    .map((item) => ({ ...item, source: "fallback" as const }));

  const combined = [...llmCandidates, ...fallbackCandidates];
  const drafts: GeneratedMenuDraft[] = [];
  let duplicatesFiltered = 0;
  let usedLlm = false;
  let usedFallback = false;

  const tryPushCandidate = (candidate: (MenuTextCandidate & { source: "llm" | "fallback" }), candidateIndex: number): boolean => {
    const normalizedName = sanitizeName(candidate.name).toLowerCase();
    if (!normalizedName || existingNames.has(normalizedName) || seenNames.has(normalizedName)) {
      duplicatesFiltered += 1;
      return false;
    }
    seenNames.add(normalizedName);

    const imageUrl = resolveMenuImageUrl({
      imageKeys: candidate.imageKeys,
      cuisineKey,
      restaurantId: input.restaurant.id,
      itemIndex: drafts.length + candidateIndex,
    });
    if (candidate.source === "llm") usedLlm = true;
    if (candidate.source === "fallback") usedFallback = true;

    drafts.push({
      name: sanitizeName(candidate.name),
      description: sanitizeDescription(candidate.description, candidate.name),
      imageUrl,
      priceApprox: estimatePriceApprox({
        priceLevel: input.restaurant.priceLevel,
        cuisineKey,
        dishName: candidate.name,
        restaurantId: input.restaurant.id,
      }),
      tags: normalizeTagList(candidate.tags ?? [], 6),
      dietFlags: normalizeTagList(candidate.dietFlags ?? [], 3),
      isActive: true,
      isSponsored: false,
    });
    return true;
  };

  for (let i = 0; i < combined.length && drafts.length < targetCount; i += 1) {
    tryPushCandidate(combined[i]!, i);
  }

  let guard = 0;
  while (drafts.length < targetCount && guard < 24) {
    const base = fallbackCandidates[guard % Math.max(1, fallbackCandidates.length)];
    if (!base) break;
    const candidateName = `${base.name} ${guard > 0 ? `${guard + 1}` : ""}`.trim();
    tryPushCandidate({ ...base, name: candidateName, source: "fallback" }, guard + combined.length);
    guard += 1;
  }

  return {
    cuisineKey,
    drafts,
    usedLlm,
    usedFallback,
    duplicatesFiltered,
    missingImages: drafts.filter((d) => !d.imageUrl).length,
  };
}
