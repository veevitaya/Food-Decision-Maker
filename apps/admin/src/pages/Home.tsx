import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Search, X, MapPin, ArrowRight, ChevronDown,
  Sparkles, SlidersHorizontal, Users, Navigation, Grid3X3,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SessionBar } from "@/components/SessionBar";
import { RestaurantRow } from "@/components/RestaurantRow";
import { InteractiveMap } from "@/components/InteractiveMap";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { useRestaurants, useSuggestions } from "@/hooks/use-restaurants";
import { useVibeFrequency } from "@/hooks/use-vibe-frequency";
import { SaveBucketPicker } from "@/components/SaveBucketPicker";
import { FoodIconFromEmoji } from "@/components/FoodIcon";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { useLineProfile } from "@/lib/useLineProfile";
import { trackEvent } from "@/lib/analytics";
import toastLogoPath from "@assets/toast_logo_nobg.png";
import mascotPath from "@assets/toast_mascot_nobg.png";

const FILTER_OPTIONS = {
  sortBy: [
    { value: "rating", label: "Top Rated" },
    { value: "distance", label: "Nearest" },
    { value: "price_low", label: "Price: Low" },
    { value: "price_high", label: "Price: High" },
    { value: "trending", label: "Trending" },
  ],
  priceRange: [
    { value: "1", label: "฿" },
    { value: "2", label: "฿฿" },
    { value: "3", label: "฿฿฿" },
    { value: "4", label: "฿฿฿฿" },
  ],
  dietary: [
    { value: "halal", label: "Halal" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "vegan", label: "Vegan" },
    { value: "gluten_free", label: "Gluten Free" },
  ],
  distance: [
    { value: "500", label: "< 500m" },
    { value: "1000", label: "< 1 km" },
    { value: "3000", label: "< 3 km" },
    { value: "5000", label: "< 5 km" },
  ],
};

const RESTAURANT_PINS = [
  { id: 201, name: "Thipsamai", emoji: "🍜", category: "Thai", lat: 13.7520, lng: 100.5050, rating: "4.9", price: "฿", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", description: "Famous pad thai since 1966" },
  { id: 251, name: "Sushi Masato", emoji: "🍣", category: "Sushi", lat: 13.7320, lng: 100.5783, rating: "4.9", price: "฿฿฿", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=60", description: "Intimate 8-seat omakase counter" },
  { id: 261, name: "Daniel Thaiger", emoji: "🍔", category: "Burgers", lat: 13.7380, lng: 100.5680, rating: "4.5", price: "฿฿", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60", description: "Bangkok's OG food truck burger" },
  { id: 231, name: "Peppina", emoji: "🍕", category: "Pizza", lat: 13.7310, lng: 100.5690, rating: "4.8", price: "฿฿", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60", description: "Neapolitan pizza, wood-fired" },
  { id: 241, name: "Krua Apsorn", emoji: "🍛", category: "Thai", lat: 13.7620, lng: 100.5100, rating: "4.8", price: "฿", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", description: "Royal recipe green curry" },
  { id: 244, name: "Jay Fai", emoji: "🔥", category: "Thai", lat: 13.7560, lng: 100.5018, rating: "4.9", price: "฿฿฿", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", description: "Michelin-starred street food" },
  { id: 301, name: "Tep Bar", emoji: "🍸", category: "Bars", lat: 13.7280, lng: 100.5130, rating: "4.7", price: "฿฿", imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=60", description: "Thai heritage cocktails & live music" },
  { id: 311, name: "Roots Coffee", emoji: "☕", category: "Cafe", lat: 13.7466, lng: 100.5393, rating: "4.7", price: "฿฿", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=60", description: "Specialty pour-over coffee" },
  { id: 321, name: "After You", emoji: "🍰", category: "Desserts", lat: 13.7320, lng: 100.5783, rating: "4.5", price: "฿฿", imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=60", description: "Famous kakigori & honey toast" },
  { id: 282, name: "Din Tai Fung", emoji: "🥟", category: "Chinese", lat: 13.7466, lng: 100.5393, rating: "4.7", price: "฿฿", imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=60", description: "World-famous xiao long bao" },
  { id: 411, name: "Roast", emoji: "🍳", category: "Breakfast", lat: 13.7320, lng: 100.5783, rating: "4.7", price: "฿฿", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=60", description: "Bangkok's premier brunch spot" },
  { id: 461, name: "KOI Th\u00e9", emoji: "🧋", category: "Bubble Tea", lat: 13.7454, lng: 100.5340, rating: "4.5", price: "฿", imageUrl: "https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=600&auto=format&fit=crop&q=60", description: "Taiwan's golden bubble milk tea" },
  { id: 441, name: "Holey Bakery", emoji: "🥐", category: "Bakery", lat: 13.7310, lng: 100.5690, rating: "4.7", price: "฿฿", imageUrl: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=600&auto=format&fit=crop&q=60", description: "Award-winning French bakery" },
];

const ALL_SEARCHABLE = [
  { id: 201, name: "Thipsamai", category: "Thai", rating: "4.9", address: "Maha Chai Rd", menus: ["pad thai", "stir fry noodles", "spring rolls", "thai fried rice"] },
  { id: 202, name: "Pad Thai Fai Ta Lu", category: "Thai", rating: "4.7", address: "Dinso Rd", menus: ["pad thai", "wok noodles", "egg wrap noodles"] },
  { id: 203, name: "Baan Pad Thai", category: "Thai", rating: "4.5", address: "Siam Sq Soi 5", menus: ["pad thai", "thai noodles", "tom yum soup"] },
  { id: 204, name: "Pad Thai Pratu Pi", category: "Thai", rating: "4.6", address: "Phra Athit Rd", menus: ["pad thai", "fried noodles", "thai omelette"] },
  { id: 211, name: "Sukishi Korean BBQ", category: "Korean", rating: "4.4", address: "CentralWorld", menus: ["korean bbq", "bulgogi", "bibimbap", "kimchi", "japchae", "grilled meat"] },
  { id: 212, name: "Mongkol Korean", category: "Korean", rating: "4.6", address: "Sukhumvit 24", menus: ["korean fried chicken", "tteokbokki", "kimchi jjigae", "bibimbap"] },
  { id: 221, name: "Ippudo", category: "Ramen", rating: "4.6", address: "CentralWorld", menus: ["ramen", "tonkotsu", "gyoza", "karaage", "japanese noodles"] },
  { id: 222, name: "Bankara Ramen", category: "Ramen", rating: "4.7", address: "Thonglor", menus: ["ramen", "miso ramen", "chashu", "japanese noodles"] },
  { id: 224, name: "Noods Pork Noodles", category: "Noodles", rating: "4.6", address: "Ari", menus: ["pork noodles", "wonton", "noodle soup", "egg noodles"] },
  { id: 231, name: "Peppina", category: "Pizza", rating: "4.8", address: "Sukhumvit 33", menus: ["pizza", "margherita", "pasta", "italian", "wood fired"] },
  { id: 232, name: "Pizza Massilia", category: "Pizza", rating: "4.7", address: "Ekkamai", menus: ["pizza", "calzone", "salad", "italian"] },
  { id: 233, name: "Il Fumo", category: "Pizza", rating: "4.5", address: "Sathorn", menus: ["pizza", "pasta", "risotto", "italian", "tiramisu"] },
  { id: 241, name: "Krua Apsorn", category: "Thai", rating: "4.8", address: "Samsen Rd", menus: ["crab omelette", "stir fry basil", "thai curry", "fried rice", "tom yum"] },
  { id: 242, name: "Baan Ice", category: "Thai", rating: "4.6", address: "Soi Thonglor", menus: ["southern thai", "massaman curry", "yellow curry", "stir fry", "thai food"] },
  { id: 243, name: "Somtum Der", category: "Thai", rating: "4.5", address: "Sala Daeng", menus: ["som tum", "papaya salad", "larb", "isaan", "grilled chicken", "sticky rice"] },
  { id: 244, name: "Jay Fai", category: "Thai", rating: "4.9", address: "Maha Chai Rd", menus: ["crab omelette", "drunken noodles", "tom yum", "stir fry seafood"] },
  { id: 251, name: "Sushi Masato", category: "Sushi", rating: "4.9", address: "Thonglor 13", menus: ["sushi", "omakase", "sashimi", "nigiri", "japanese"] },
  { id: 252, name: "Sushi Zo", category: "Sushi", rating: "4.7", address: "Gaysorn", menus: ["sushi", "omakase", "sashimi", "japanese"] },
  { id: 261, name: "Daniel Thaiger", category: "Burgers", rating: "4.5", address: "Sukhumvit 36", menus: ["burger", "cheeseburger", "fries", "milkshake"] },
  { id: 262, name: "Shake Shack", category: "Burgers", rating: "4.3", address: "CentralWorld", menus: ["burger", "shake", "fries", "hot dog", "chicken sandwich"] },
  { id: 263, name: "Bun Meat & Cheese", category: "Burgers", rating: "4.6", address: "Ekkamai", menus: ["burger", "smash burger", "fries", "onion rings"] },
  { id: 271, name: "Somtum Der", category: "Isaan", rating: "4.6", address: "Sala Daeng", menus: ["som tum", "papaya salad", "larb", "nam tok", "grilled pork neck", "sticky rice"] },
  { id: 281, name: "Hong Bao", category: "Chinese", rating: "4.5", address: "Chinatown", menus: ["dim sum", "congee", "roast duck", "char siu", "wonton"] },
  { id: 282, name: "Din Tai Fung", category: "Chinese", rating: "4.7", address: "CentralWorld", menus: ["xiao long bao", "dumplings", "fried rice", "noodles", "dim sum"] },
  { id: 291, name: "Barrio Bonito", category: "Mexican", rating: "4.4", address: "Khao San", menus: ["tacos", "burritos", "nachos", "quesadilla", "guacamole"] },
  { id: 292, name: "Touche Hombre", category: "Mexican", rating: "4.6", address: "Thonglor", menus: ["tacos", "ceviche", "margarita", "mexican", "enchiladas"] },
  { id: 301, name: "Tep Bar", category: "Bars", rating: "4.7", address: "Charoen Krung", menus: ["cocktails", "drinks", "craft spirits", "bar snacks"] },
  { id: 302, name: "Rabbit Hole", category: "Bars", rating: "4.6", address: "Thonglor 7", menus: ["cocktails", "whiskey", "bar food", "drinks"] },
  { id: 303, name: "Sky Bar", category: "Bars", rating: "4.5", address: "Silom (Lebua)", menus: ["cocktails", "rooftop drinks", "wine", "tapas"] },
  { id: 304, name: "Havana Social", category: "Bars", rating: "4.4", address: "Sukhumvit 11", menus: ["rum cocktails", "cuban drinks", "cigars"] },
  { id: 305, name: "Iron Fairies", category: "Bars", rating: "4.3", address: "Thonglor 25", menus: ["cocktails", "jazz bar", "bar food"] },
  { id: 306, name: "Tropic City", category: "Bars", rating: "4.6", address: "Charoen Krung 28", menus: ["tropical cocktails", "rum drinks", "bar snacks"] },
  { id: 307, name: "Teens of Thailand", category: "Bars", rating: "4.5", address: "Soi Nana", menus: ["gin cocktails", "craft drinks", "bar bites"] },
  { id: 311, name: "Roots Coffee", category: "Coffee", rating: "4.7", address: "CentralWorld", menus: ["coffee", "latte", "espresso", "pour over", "pastry"] },
  { id: 312, name: "Factory Coffee", category: "Coffee", rating: "4.5", address: "Phrom Phong", menus: ["coffee", "cold brew", "flat white", "cake"] },
  { id: 313, name: "Kaizen Coffee", category: "Coffee", rating: "4.6", address: "Ekkamai", menus: ["coffee", "matcha latte", "drip coffee", "toast"] },
  { id: 321, name: "After You", category: "Desserts", rating: "4.5", address: "Thonglor", menus: ["kakigori", "honey toast", "shaved ice", "souffle", "dessert"] },
  { id: 322, name: "Creamery Boutique", category: "Desserts", rating: "4.6", address: "Sukhumvit 49", menus: ["ice cream", "gelato", "waffle", "sundae"] },
  { id: 323, name: "Baan Kanom Thai", category: "Desserts", rating: "4.3", address: "Old Town", menus: ["thai dessert", "mango sticky rice", "coconut pudding", "kanom"] },
  { id: 411, name: "Roast Coffee & Eatery", category: "Breakfast", rating: "4.7", address: "Thonglor", menus: ["brunch", "eggs benedict", "avocado toast", "pancakes", "coffee"] },
  { id: 412, name: "Broccoli Revolution", category: "Breakfast", rating: "4.5", address: "Sukhumvit 49", menus: ["vegan", "salad", "smoothie bowl", "acai", "healthy"] },
  { id: 413, name: "Clinton St. Baking Co.", category: "Breakfast", rating: "4.6", address: "Phrom Phong", menus: ["pancakes", "eggs", "french toast", "brunch", "waffles"] },
  { id: 421, name: "Gram Cafe", category: "Breakfast", rating: "4.6", address: "Siam Paragon", menus: ["souffle pancake", "brunch", "japanese pancake", "coffee"] },
  { id: 422, name: "Pancake Cafe", category: "Breakfast", rating: "4.4", address: "Ari", menus: ["pancakes", "waffles", "crepes", "brunch", "bacon"] },
  { id: 423, name: "Iwane Goes Nature", category: "Breakfast", rating: "4.5", address: "Ekkamai", menus: ["organic brunch", "granola", "smoothie", "salad", "healthy"] },
  { id: 431, name: "Broccoli Revolution", category: "Smoothie", rating: "4.5", address: "Sukhumvit 49", menus: ["smoothie", "juice", "acai bowl", "vegan", "healthy"] },
  { id: 433, name: "The Smoothie Bar", category: "Smoothie", rating: "4.3", address: "Thonglor", menus: ["smoothie", "protein shake", "fresh juice", "fruit bowl"] },
  { id: 441, name: "Holey Artisan Bakery", category: "Cafe", rating: "4.7", address: "Sukhumvit 49", menus: ["croissant", "sourdough", "pastry", "bread", "cafe"] },
  { id: 442, name: "Tiong Bahru Bakery", category: "Cafe", rating: "4.5", address: "Siam Discovery", menus: ["croissant", "kouign amann", "coffee", "pastry"] },
  { id: 443, name: "Karmakamet Diner", category: "Cafe", rating: "4.6", address: "Sukhumvit 51", menus: ["pasta", "brunch", "cake", "tea", "cafe"] },
  { id: 451, name: "ChaTraMue", category: "Thai Tea", rating: "4.6", address: "All over Bangkok", menus: ["thai milk tea", "cha yen", "thai tea", "iced tea"] },
  { id: 453, name: "Cha Bar BKK", category: "Thai Tea", rating: "4.5", address: "Thonglor", menus: ["thai tea", "milk tea", "matcha", "tea latte"] },
  { id: 461, name: "KOI Th\u00e9", category: "Bubble Tea", rating: "4.5", address: "Siam Paragon", menus: ["bubble tea", "boba", "milk tea", "pearl tea"] },
  { id: 462, name: "Tiger Sugar", category: "Bubble Tea", rating: "4.6", address: "CentralWorld", menus: ["brown sugar boba", "bubble tea", "tiger milk tea"] },
  { id: 463, name: "Gong Cha", category: "Bubble Tea", rating: "4.3", address: "Siam Square", menus: ["bubble tea", "milk tea", "taro", "boba"] },
  { id: 471, name: "Khao Tom Boworn", category: "Thai", rating: "4.6", address: "Boworn Niwet", menus: ["rice porridge", "congee", "stir fry", "thai comfort food"] },
  { id: 481, name: "Creamery Boutique", category: "Desserts", rating: "4.6", address: "Sukhumvit 49", menus: ["ice cream", "gelato", "sorbet", "sundae"] },
  { id: 482, name: "Guss Damn Good", category: "Desserts", rating: "4.5", address: "Thonglor", menus: ["ice cream", "gelato", "affogato", "waffle cone"] },
  { id: 483, name: "iberry", category: "Desserts", rating: "4.4", address: "Siam Square", menus: ["ice cream", "homemade gelato", "fruit sorbet"] },
];

const DEFAULT_LAT = 13.7420;
const DEFAULT_LNG = 100.5400;

const VIBE_TILES_MAIN = [
  { mode: "trending", label: "Trending", emoji: "🔥", bg: "hsl(45, 55%, 94%)" },
  { mode: "hot", label: "Spicy", emoji: "🌶️", bg: "hsl(15, 65%, 94%)" },
  { mode: "drinks", label: "Drinks", emoji: "🍸", bg: "hsl(280, 40%, 95%)" },
  { mode: "cheap", label: "Budget", emoji: "💰", bg: "hsl(160, 40%, 94%)" },
  { mode: "healthy", label: "Healthy", emoji: "🥗", bg: "hsl(130, 35%, 94%)" },
  { mode: "outdoor", label: "Outdoor", emoji: "⛱️", bg: "hsl(200, 40%, 94%)" },
  { mode: "partner", label: "Date Night", emoji: "💕", bg: "hsl(345, 50%, 95%)" },
];

const VIBE_TILES_EXTRA = [
  { mode: "delivery", label: "Delivery", emoji: "🛵", bg: "hsl(25, 55%, 94%)" },
  { mode: "late", label: "Late Night", emoji: "🌙", bg: "hsl(250, 40%, 94%)" },
  { mode: "sweet", label: "Sweets", emoji: "🍰", bg: "hsl(340, 45%, 95%)" },
  { mode: "brunch", label: "Brunch", emoji: "🥞", bg: "hsl(35, 50%, 94%)" },
  { mode: "streetfood", label: "Street Food", emoji: "🍜", bg: "hsl(20, 55%, 94%)" },
  { mode: "rooftop", label: "Rooftop", emoji: "🏙️", bg: "hsl(210, 40%, 94%)" },
  { mode: "family", label: "Family", emoji: "👨‍👩‍👧", bg: "hsl(150, 35%, 94%)" },
  { mode: "cafe", label: "Cafe", emoji: "☕", bg: "hsl(30, 40%, 94%)" },
];

const BANGKOK_LOCATIONS = [
  { name: "Sukhumvit", lat: 13.7420, lng: 100.5400 },
  { name: "Silom", lat: 13.7285, lng: 100.5310 },
  { name: "Siam", lat: 13.7454, lng: 100.5341 },
  { name: "Thonglor", lat: 13.7320, lng: 100.5783 },
  { name: "Ekkamai", lat: 13.7310, lng: 100.5690 },
  { name: "Ari", lat: 13.7710, lng: 100.5450 },
  { name: "Chinatown", lat: 13.7410, lng: 100.5100 },
  { name: "Old Town", lat: 13.7560, lng: 100.5018 },
  { name: "Sathorn", lat: 13.7220, lng: 100.5290 },
  { name: "Riverside", lat: 13.7230, lng: 100.5130 },
];

interface PersonalizedRec {
  id: number;
  name: string;
  category: string;
  rating: string;
  imageUrl: string;
  address: string;
  priceLevel: number;
  match: number;
}

const FALLBACK_RECOMMENDATIONS: PersonalizedRec[] = [
  { id: 5, name: "Pad Thai Plus", category: "Thai", rating: "4.8", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=300&auto=format&fit=crop&q=60", address: "Central World", priceLevel: 1, match: 72 },
  { id: 12, name: "Ramen Champ", category: "Japanese", rating: "4.6", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&auto=format&fit=crop&q=60", address: "Thonglor", priceLevel: 2, match: 65 },
  { id: 8, name: "Pizza Paradise", category: "Italian", rating: "4.6", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=60", address: "Silom", priceLevel: 2, match: 60 },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "what's for breakfast?";
  if (hour < 14) return "what's for lunch?";
  if (hour < 17) return "feeling hungry?";
  if (hour < 21) return "what's for dinner?";
  return "late night craving?";
}

function getContextLine(): string {
  const now = new Date();
  const day = now.toLocaleDateString("en", { weekday: "short" });
  const time = now.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} \u00b7 ${time} \u00b7 14 open near you`;
}

export default function Home() {
  const [, navigate] = useLocation();
  const { profile: tasteProfile, getSuggestionTitle, topPreference, getMoodSignal } = useTasteProfile();
  const { recordVibe } = useVibeFrequency();
  const { data: suggestions = [], isLoading: suggestionsLoading } = useSuggestions();
  const { data: nearbyRestaurants = [], isLoading: nearbyLoading } = useRestaurants("new");
  const { profile: userProfile } = useLineProfile();

  const [personalizedRecs, setPersonalizedRecs] = useState<PersonalizedRec[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);

  useEffect(() => {
    async function fetchPersonalized() {
      try {
        const now = new Date();
        const res = await fetch("/api/restaurants/personalized", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userProfile?.userId || null,
            tasteProfile: tasteProfile,
            hour: now.getHours(),
            dayOfWeek: now.getDay(),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setPersonalizedRecs(data);
          } else {
            setPersonalizedRecs(FALLBACK_RECOMMENDATIONS);
          }
        } else {
          setPersonalizedRecs(FALLBACK_RECOMMENDATIONS);
        }
      } catch {
        setPersonalizedRecs(FALLBACK_RECOMMENDATIONS);
      } finally {
        setRecsLoading(false);
      }
    }
    fetchPersonalized();
  }, [userProfile?.userId, topPreference.key]);

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [moreVibesOpen, setMoreVibesOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [currentLocationName, setCurrentLocationName] = useState("Sukhumvit");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeSort, setActiveSort] = useState("trending");
  const [activePrices, setActivePrices] = useState<string[]>([]);
  const [activeDietary, setActiveDietary] = useState<string[]>([]);
  const [activeDistance, setActiveDistance] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = (activePrices.length > 0 ? 1 : 0) + (activeDietary.length > 0 ? 1 : 0) + (activeDistance ? 1 : 0) + (activeSort !== "trending" ? 1 : 0);
  const togglePrice = (v: string) => setActivePrices(prev => prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]);
  const toggleDietary = (v: string) => setActiveDietary(prev => prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v]);
  const trackFilterChange = useCallback((name: string, value: unknown) => {
    trackEvent("filter", { metadata: { name, value } });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("search") === "1") {
      setSearchOpen(true);
      setTimeout(() => inputRef.current?.focus(), 300);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;
    const timer = setTimeout(() => {
      trackEvent("search", { metadata: { query } });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const nameMatches: typeof ALL_SEARCHABLE = [];
    const categoryMatches: typeof ALL_SEARCHABLE = [];
    const menuMatches: typeof ALL_SEARCHABLE = [];
    const seen = new Set<number>();
    for (const r of ALL_SEARCHABLE) { if (r.name.toLowerCase().includes(q)) { nameMatches.push(r); seen.add(r.id); } }
    for (const r of ALL_SEARCHABLE) { if (seen.has(r.id)) continue; if (r.category.toLowerCase().includes(q)) { categoryMatches.push(r); seen.add(r.id); } }
    for (const r of ALL_SEARCHABLE) { if (seen.has(r.id)) continue; if (r.menus.some(m => m.includes(q))) { menuMatches.push(r); seen.add(r.id); } }
    return [...nameMatches.slice(0, 5), ...categoryMatches.slice(0, 4), ...menuMatches.slice(0, 6)].slice(0, 10);
  }, [searchQuery]);

  const mapCenter = useMemo<[number, number]>(() => [userLocation.lat, userLocation.lng], [userLocation]);
  const mapPins = useMemo(() =>
    RESTAURANT_PINS.map(p => ({ id: p.id, name: p.name, emoji: p.emoji, category: p.category, price: p.price, lat: p.lat, lng: p.lng })),
  []);

  const MAP_CATEGORIES = useMemo(() => {
    const cats = Array.from(new Set(RESTAURANT_PINS.map(p => p.category)));
    const emojiMap: Record<string, string> = { Thai: "🇹🇭", Sushi: "🍣", Burgers: "🍔", Pizza: "🍕", Bars: "🍸", Cafe: "☕", Desserts: "🍰", Chinese: "🥟", Breakfast: "🍳", "Bubble Tea": "🧋", Bakery: "🥐" };
    return cats.map(c => ({ label: c, emoji: emojiMap[c] || "🍽️" }));
  }, []);

  const filteredMapCards = useMemo(() => {
    if (!selectedCategory) return RESTAURANT_PINS.slice(0, 6);
    return RESTAURANT_PINS.filter(p => p.category === selectedCategory);
  }, [selectedCategory]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleVibeClick = useCallback((mode: string) => {
    recordVibe(mode);
    trackEvent("filter", { metadata: { name: "vibe_mode", value: mode } });
    const p = new URLSearchParams();
    switch (mode) {
      case "cheap": p.set("budget", "Cheap"); break;
      case "nearby": p.set("locations", "Near BTS"); break;
      case "trending": p.set("interests", "Popular spots"); p.set("locations", "Trendy spots"); break;
      case "hot": p.set("interests", "Popular spots,Hot & spicy"); break;
      case "late": p.set("locations", "Late night"); break;
      case "outdoor": p.set("interests", "Outdoor dining"); p.set("locations", "Rooftops,By the river"); break;
      case "healthy": p.set("diet", "Vegetarian,Vegan"); p.set("interests", "Healthy"); break;
      case "drinks": p.set("interests", "Drinks"); break;
      case "partner": p.set("interests", "Fine dining,Romantic"); break;
      case "delivery": p.set("interests", "Delivery"); p.set("locations", "Delivery"); break;
      case "sweet": p.set("interests", "Desserts,Sweets"); break;
      case "brunch": p.set("interests", "Brunch,Breakfast"); break;
      case "streetfood": p.set("interests", "Street food"); break;
      case "rooftop": p.set("interests", "Rooftop dining"); p.set("locations", "Rooftops"); break;
      case "family": p.set("interests", "Family friendly"); break;
      case "cafe": p.set("interests", "Coffee,Cafe"); break;
    }
    const qs = p.toString();
    navigate(`/solo/results${qs ? `?${qs}` : ""}`);
  }, [navigate, recordVibe]);

  const topMatch = personalizedRecs.length > 0 ? personalizedRecs[0] : FALLBACK_RECOMMENDATIONS[0];

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden" data-testid="home-page">
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          pins={mapPins}
          center={mapCenter}
          zoom={14}
          selectedPinId={null}
          onPinSelect={(id) => {
            trackEvent("view_detail", { restaurantId: id, metadata: { source: "map_pin" } });
            navigate(`/restaurant/${id}`);
          }}
          filteredCategory={selectedCategory}
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-[60] safe-top" ref={locationRef}>
        <div className="px-4 pt-3 pb-2">
          <div
            className="w-full flex items-center gap-2.5 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 border border-gray-200/60"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <button
              onClick={() => {
                trackEvent("search", { metadata: { source: "home_search_open" } });
                setSearchOpen(true);
                setTimeout(() => inputRef.current?.focus(), 150);
              }}
              className="flex items-center gap-2.5 flex-1 min-w-0"
              data-testid="button-open-search"
            >
              <Search className="w-4.5 h-4.5 text-muted-foreground/50 flex-shrink-0" />
              <span className="text-sm text-muted-foreground text-left truncate">What are you craving?</span>
            </button>
            <button
              onClick={() => { setLocationPickerOpen(prev => !prev); setShowFilters(false); }}
              className="flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-full bg-gray-50 border border-gray-100"
              data-testid="button-map-location"
            >
              <MapPin className="w-3 h-3 text-[#FFCC02]" />
              <span className="text-[11px] font-medium text-foreground max-w-[70px] truncate">{currentLocationName}</span>
              <ChevronDown className={`w-2.5 h-2.5 text-muted-foreground transition-transform ${locationPickerOpen ? "rotate-180" : ""}`} />
            </button>
            <div ref={filterRef} className="relative flex-shrink-0">
              <button
                onClick={() => {
                  const next = !showFilters;
                  trackEvent("filter", { metadata: { action: "toggle_map_filters", open: next } });
                  setShowFilters(next);
                  setLocationPickerOpen(false);
                }}
                className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center relative active:scale-95 transition-transform"
                data-testid="button-filter-map"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/60" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground rounded-full text-[9px] text-white flex items-center justify-center font-bold">{activeFilterCount}</span>
                )}
              </button>
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
                    className="absolute top-11 right-0 w-[260px] bg-white rounded-2xl overflow-hidden border border-gray-100 z-[100]"
                    style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
                    data-testid="map-filter-dropdown"
                  >
                    <div className="p-4 space-y-4 max-h-[340px] overflow-y-auto">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Sort by</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.sortBy.map(o => (
                            <button key={o.value} onClick={() => { setActiveSort(o.value); trackFilterChange("sort", o.value); }} data-testid={`map-filter-sort-${o.value}`}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeSort === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{o.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Price range</p>
                        <div className="flex gap-1.5">
                          {FILTER_OPTIONS.priceRange.map(o => (
                            <button key={o.value} onClick={() => { togglePrice(o.value); trackFilterChange("price", o.value); }} data-testid={`map-filter-price-${o.value}`}
                              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${activePrices.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{o.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dietary</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.dietary.map(o => (
                            <button key={o.value} onClick={() => { toggleDietary(o.value); trackFilterChange("dietary", o.value); }} data-testid={`map-filter-dietary-${o.value}`}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDietary.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{o.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Distance</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.distance.map(o => (
                            <button key={o.value} onClick={() => { setActiveDistance(activeDistance === o.value ? null : o.value); trackFilterChange("distance", o.value); }} data-testid={`map-filter-distance-${o.value}`}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDistance === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{o.label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {locationPickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                className="mt-2 w-[200px] ml-auto bg-white rounded-2xl overflow-hidden border border-gray-100 z-[110]"
                style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)" }}
                data-testid="location-picker-dropdown"
              >
                <div className="py-2 max-h-[280px] overflow-y-auto">
                  <button
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            trackEvent("filter", { metadata: { name: "location", value: "current_location" } });
                            setCurrentLocationName("Current Location");
                            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setLocationPickerOpen(false);
                          },
                          () => { setLocationPickerOpen(false); }
                        );
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left ${
                      currentLocationName === "Current Location" ? "bg-gray-50" : ""
                    }`}
                    data-testid="location-option-current"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-3 h-3 text-blue-500" />
                    </div>
                    <span className={`text-sm font-medium ${currentLocationName === "Current Location" ? "text-foreground" : "text-blue-500"}`}>Current Location</span>
                    {currentLocationName === "Current Location" && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                  <div className="border-b border-gray-100 mx-4 my-1" />
                  <p className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Bangkok areas</p>
                  {BANGKOK_LOCATIONS.map(loc => (
                    <button
                      key={loc.name}
                      onClick={() => {
                        trackEvent("filter", { metadata: { name: "location", value: loc.name } });
                        setCurrentLocationName(loc.name);
                        setUserLocation({ lat: loc.lat, lng: loc.lng });
                        setLocationPickerOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left ${
                        currentLocationName === loc.name ? "bg-gray-50" : ""
                      }`}
                      data-testid={`location-option-${loc.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${currentLocationName === loc.name ? "text-[#FFCC02]" : "text-muted-foreground/40"}`} />
                      <span className={`text-sm font-medium ${currentLocationName === loc.name ? "text-foreground" : "text-muted-foreground"}`}>{loc.name}</span>
                      {currentLocationName === loc.name && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FFCC02]" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!drawerOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="px-4 pb-2"
            >
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" data-testid="map-category-chips">
                <button
                  onClick={() => { setSelectedCategory(null); trackFilterChange("map_category", "all"); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                    selectedCategory === null
                      ? "bg-foreground text-white shadow-md"
                      : "bg-white/90 backdrop-blur-sm text-foreground border border-gray-200/60"
                  }`}
                  style={selectedCategory === null ? {} : { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  data-testid="chip-category-all"
                >
                  All
                </button>
                {MAP_CATEGORIES.map(cat => (
                  <button
                    key={cat.label}
                    onClick={() => {
                      const next = selectedCategory === cat.label ? null : cat.label;
                      setSelectedCategory(next);
                      trackFilterChange("map_category", next ?? "all");
                    }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                      selectedCategory === cat.label
                        ? "bg-foreground text-white shadow-md"
                        : "bg-white/90 backdrop-blur-sm text-foreground border border-gray-200/60"
                    }`}
                    style={selectedCategory === cat.label ? {} : { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                    data-testid={`chip-category-${cat.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <FoodIconFromEmoji emoji={cat.emoji} size={18} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!drawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="absolute left-0 right-0 z-30"
            style={{ bottom: "210px" }}
            data-testid="map-restaurant-cards"
          >
            <div
              ref={scrollContainerRef}
              className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory px-4"
            >
              {filteredMapCards.map((pin) => (
                <motion.button
                  key={pin.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/restaurant/${pin.id}`)}
                  className="flex-shrink-0 w-[260px] snap-start bg-white rounded-2xl overflow-hidden border border-gray-100"
                  style={{ boxShadow: "0 6px 24px -4px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)" }}
                  data-testid={`map-card-${pin.id}`}
                >
                  <div className="relative h-[110px] w-full">
                    <img src={pin.imageUrl} alt={pin.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold text-foreground flex items-center gap-1">
                      <FoodIconFromEmoji emoji={pin.emoji} size={14} /> {pin.category}
                    </div>
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold text-foreground">
                      {pin.price}
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground truncate">{pin.name}</p>
                      <span className="text-xs font-semibold text-muted-foreground ml-2 flex-shrink-0">{pin.rating}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{pin.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ bottom: drawerOpen ? "0px" : "0px", height: drawerOpen ? "82%" : "200px" }}
        transition={{ type: "spring", damping: 26, stiffness: 240, mass: 1 }}
        className="absolute left-0 right-0 rounded-t-[28px] z-50 flex flex-col gpu-accelerated"
        style={{
          background: "#F5F5F5",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.08), 0 -2px 10px rgba(0,0,0,0.03)",
          bottom: 0,
          touchAction: "none",
        }}
      >
        <div
          className="w-full flex-shrink-0 cursor-grab active:cursor-grabbing"
          onClick={() => setDrawerOpen(prev => !prev)}
        >
          <div className="pt-3 pb-2 flex justify-center">
            <div className="w-10 h-[5px] bg-gray-300/60 rounded-full" />
          </div>

          <AnimatePresence>
            {!drawerOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-6 pt-1">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={toastLogoPath} alt="Toast" className="h-9 w-auto" data-testid="img-collapsed-logo" />
                    <div className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
                      className="text-xs font-medium text-muted-foreground"
                      data-testid="button-expand-drawer"
                    >
                      See more <ChevronDown className="w-3 h-3 inline rotate-180" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate("/solo/quiz"); }}
                      className="relative overflow-hidden bg-white rounded-xl px-4 py-3 border border-gray-100 text-left"
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                      data-testid="button-solo-collapsed"
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "#FFCC02" }} />
                      <span className="absolute top-0 right-2 text-[32px] font-bold select-none pointer-events-none" style={{ color: "rgba(0,0,0,0.04)" }}>1</span>
                      <p className="text-sm font-bold text-foreground leading-tight">Solo</p>
                      <p className="text-[10px] text-muted-foreground">Just you</p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate("/group/setup"); }}
                      className="relative overflow-hidden bg-white rounded-xl px-4 py-3 border border-gray-100 text-left"
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                      data-testid="button-group-collapsed"
                    >
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "#00B14F" }} />
                      <span className="absolute top-0 right-2 text-[32px] font-bold select-none pointer-events-none" style={{ color: "rgba(0,0,0,0.04)" }}>2+</span>
                      <p className="text-sm font-bold text-foreground leading-tight">Group</p>
                      <p className="text-[10px] text-muted-foreground">With others</p>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 relative" style={{ overscrollBehavior: "contain" }}>
          <div className="px-6 pt-1 pb-1 flex items-center justify-between">
            <img src={toastLogoPath} alt="Toast" className="h-9 w-auto" data-testid="img-home-logo" />
          </div>
          <div className="px-6 pt-1 pb-3">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2"
              data-testid="text-context-line"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {getContextLine()}
            </motion.p>
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1">
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 25 }}
                  className="text-[26px] font-bold text-foreground leading-[1.15] tracking-tight"
                  data-testid="text-greeting"
                >
                  Hey there,<br />{getGreeting()}
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-2 mt-3 flex-wrap"
                >
                  {topPreference.score > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-xs font-medium text-foreground border border-gray-100" data-testid="badge-taste">
                      {getMoodSignal.emoji} {topPreference.label} fan
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-xs font-medium text-foreground border border-gray-100" data-testid="badge-streak">
                    12-wk streak
                  </span>
                </motion.div>
              </div>
              <motion.img
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
                src={mascotPath}
                alt="Toast mascot"
                className="w-20 h-20 object-contain flex-shrink-0"
                data-testid="img-hero-mascot"
              />
            </div>
          </div>

          <div className="px-6 pt-2 pb-4">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[20px] font-bold text-foreground mb-4"
              data-testid="text-who-eating"
            >
              Who's joining you tonight?
            </motion.h2>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, type: "spring", stiffness: 300, damping: 22 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/solo/quiz")}
                data-testid="button-solo"
                className="relative overflow-hidden rounded-[20px] text-left bg-white border border-gray-100"
                style={{
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]" style={{ background: "linear-gradient(90deg, #FFCC02, hsl(40, 75%, 68%))" }} />
                <div className="relative pt-5 px-5 pb-5">
                  <span
                    className="absolute top-2 left-4 text-[72px] font-bold leading-none select-none pointer-events-none"
                    style={{ color: "rgba(0,0,0,0.04)" }}
                  >
                    1
                  </span>
                  <div className="relative z-10 pt-12">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 flex items-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFCC02]" /> Just you
                    </p>
                    <p
                      className="text-[24px] font-bold text-foreground leading-tight"
                    >
                      Solo
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-2 leading-snug">Two options face off until one wins</p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36, type: "spring", stiffness: 300, damping: 22 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/group/setup")}
                data-testid="button-group"
                className="relative overflow-hidden rounded-[20px] text-left bg-white border border-gray-100"
                style={{
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]" style={{ background: "linear-gradient(90deg, #00B14F, #00C300)" }} />
                <div className="relative pt-5 px-5 pb-5">
                  <span
                    className="absolute top-2 left-4 text-[72px] font-bold leading-none select-none pointer-events-none"
                    style={{ color: "rgba(0,0,0,0.04)" }}
                  >
                    2+
                  </span>
                  <div className="absolute top-4 right-4">
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 flex items-center gap-1 border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 4 live
                    </span>
                  </div>
                  <div className="relative z-10 pt-12">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 flex items-center gap-1.5 mb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> With others
                    </p>
                    <p
                      className="text-[24px] font-bold text-foreground leading-tight"
                    >
                      Group
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-2 leading-snug">Everyone swipes, the match wins</p>
                  </div>
                </div>
              </motion.button>
            </div>
          </div>

          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFCC02]" />
                <h2 className="text-[11px] font-bold text-foreground uppercase tracking-[0.12em]" data-testid="text-toast-decides">Toast Decides</h2>
              </div>
              <button onClick={() => navigate("/toast-picks")} className="text-xs font-medium text-muted-foreground" data-testid="link-why-this">
                Why this? <span className="text-muted-foreground/40">&#8250;</span>
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-[20px] p-5 overflow-hidden bg-white border border-gray-100 relative"
              style={{
                boxShadow: "0 6px 24px -6px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)",
              }}
              data-testid="card-toast-decides"
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #FFCC02, hsl(45, 90%, 65%))" }} />
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src={mascotPath} alt="" className="w-10 h-10 object-contain" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Just for you
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate("/toast-picks")}
                  className="w-8 h-8 rounded-full bg-[#FFCC02] flex items-center justify-center"
                  data-testid="button-toast-decides-go"
                >
                  <ArrowRight className="w-4 h-4 text-foreground" />
                </motion.button>
              </div>

              <p className="text-[18px] font-bold text-foreground leading-snug mb-1" data-testid="text-ai-quote">
                "{getSuggestionTitle}"
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Based on your recent activity and taste profile
              </p>

              <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-2">
                {recsLoading ? (
                  [0, 1, 2].map((i) => (
                    <div key={i} className="flex-shrink-0 w-[110px] animate-pulse">
                      <div className="w-full h-[80px] rounded-xl bg-gray-100 mb-1.5" />
                      <div className="h-3 bg-gray-100 rounded w-3/4 mb-1" />
                      <div className="h-2.5 bg-gray-50 rounded w-1/2" />
                    </div>
                  ))
                ) : (
                  personalizedRecs.map((rec, idx) => (
                    <motion.button
                      key={rec.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + idx * 0.08, type: "spring", stiffness: 280, damping: 22 }}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/restaurant/${rec.id}`)}
                      className="flex-shrink-0 w-[110px] group"
                      data-testid={`card-ai-rec-${rec.id}`}
                    >
                      <div className="relative w-full h-[80px] rounded-xl overflow-hidden mb-1.5 border border-gray-100">
                        <img src={rec.imageUrl} alt={rec.name} className="w-full h-full object-cover" />
                        <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                          {rec.match}%
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">{rec.name}</p>
                      <p className="text-[10px] text-muted-foreground">{rec.address} &middot; ★{rec.rating}</p>
                    </motion.button>
                  ))
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Match Confidence</span>
                  <span className="text-sm font-bold text-foreground">{topMatch.match}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${topMatch.match}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #FFCC02, hsl(45, 90%, 60%))" }}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold text-foreground uppercase tracking-[0.12em]" data-testid="text-pick-vibe">Pick a Vibe</h2>
              <span className="text-xs font-medium text-muted-foreground">Opens a world <span className="text-muted-foreground/40">&#8250;</span></span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {VIBE_TILES_MAIN.map((vibe, idx) => (
                  <motion.button
                    key={vibe.mode}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + idx * 0.04, type: "spring", stiffness: 320, damping: 22 }}
                    whileHover={{ scale: 1.06, y: -3 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleVibeClick(vibe.mode)}
                    className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border border-gray-100/80"
                    style={{ boxShadow: "0 2px 12px -3px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02)" }}
                    data-testid={`vibe-${vibe.mode}`}
                  >
                    <motion.div
                      className="flex items-center justify-center"
                      whileHover={{ rotate: 8, scale: 1.1 }}
                      whileTap={{ rotate: -12, scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <FoodIconFromEmoji emoji={vibe.emoji} size={38} />
                    </motion.div>
                    <span className="text-[11px] font-semibold text-foreground">{vibe.label}</span>
                  </motion.button>
              ))}
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + 7 * 0.04, type: "spring", stiffness: 320, damping: 22 }}
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setMoreVibesOpen(true)}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border border-gray-100/80"
                style={{ boxShadow: "0 2px 12px -3px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02)" }}
                data-testid="vibe-more"
              >
                <motion.div
                  className="flex items-center justify-center"
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  whileTap={{ rotate: -12, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Grid3X3 className="w-6 h-6 text-muted-foreground" />
                </motion.div>
                <span className="text-[11px] font-semibold text-foreground">More</span>
              </motion.button>
            </div>
          </div>

          <RestaurantRow
            title="Your Usuals"
            subtitle="Places you keep coming back to"
            restaurants={suggestions}
            isLoading={suggestionsLoading}
            size="default"
            category="Suggestions"
          />

          <RestaurantRow
            title="New near you"
            restaurants={nearbyRestaurants}
            isLoading={nearbyLoading}
            size="xl"
            category="New"
          />

          <div className="px-6 pt-5 pb-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl px-5 py-4 flex items-center gap-4 bg-white border border-gray-100"
              style={{ boxShadow: "0 2px 12px -3px rgba(0,0,0,0.05)" }}
              data-testid="card-streak"
            >
              <span className="text-3xl flex-shrink-0">🔥</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-foreground">12-week decision streak!</p>
                <p className="text-xs text-muted-foreground mt-0.5">You & your crew keep showing up -- keep it going</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/profile")}
                className="w-8 h-8 rounded-full bg-[#FFCC02] flex items-center justify-center flex-shrink-0"
                data-testid="button-streak-go"
              >
                <ArrowRight className="w-4 h-4 text-foreground" />
              </motion.button>
            </motion.div>
          </div>

          <div className="h-8" />
        </div>
      </motion.div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-[#FAF7F2]"
            data-testid="search-overlay"
          >
            <div className="safe-top px-4 pt-3 pb-2">
              <div
                className="bg-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 border border-gray-200"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              >
                <Search className="w-4 h-4 text-muted-foreground/50" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What are you craving?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-foreground font-medium w-full placeholder:text-muted-foreground text-sm"
                  data-testid="input-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
                    className="text-muted-foreground flex-shrink-0"
                    data-testid="button-clear-search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div ref={filterRef} className="relative">
                  <button
                    onClick={() => {
                      const next = !showFilters;
                      trackEvent("filter", { metadata: { action: "toggle_search_filters", open: next } });
                      setShowFilters(next);
                    }}
                    className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 relative active:scale-95 transition-transform"
                    data-testid="button-filter"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/70" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground rounded-full text-[9px] text-white flex items-center justify-center font-bold">{activeFilterCount}</span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
                        className="absolute top-11 right-0 w-[260px] bg-white rounded-2xl overflow-hidden border border-gray-100 z-[110]"
                        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
                      >
                        <div className="p-4 space-y-4 max-h-[340px] overflow-y-auto">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Sort by</p>
                            <div className="flex flex-wrap gap-1.5">
                              {FILTER_OPTIONS.sortBy.map(o => (
                                <button key={o.value} onClick={() => { setActiveSort(o.value); trackFilterChange("sort", o.value); }} data-testid={`filter-sort-${o.value}`}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeSort === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                                >{o.label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Price range</p>
                            <div className="flex gap-1.5">
                              {FILTER_OPTIONS.priceRange.map(o => (
                                <button key={o.value} onClick={() => { togglePrice(o.value); trackFilterChange("price", o.value); }} data-testid={`filter-price-${o.value}`}
                                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${activePrices.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                                >{o.label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dietary</p>
                            <div className="flex flex-wrap gap-1.5">
                              {FILTER_OPTIONS.dietary.map(o => (
                                <button key={o.value} onClick={() => { toggleDietary(o.value); trackFilterChange("dietary", o.value); }} data-testid={`filter-dietary-${o.value}`}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDietary.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                                >{o.label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Distance</p>
                            <div className="flex flex-wrap gap-1.5">
                              {FILTER_OPTIONS.distance.map(o => (
                                <button key={o.value} onClick={() => { setActiveDistance(activeDistance === o.value ? null : o.value); trackFilterChange("distance", o.value); }} data-testid={`filter-distance-${o.value}`}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDistance === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                                >{o.label}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); setShowFilters(false); }}
                  className="text-sm font-medium text-muted-foreground flex-shrink-0 ml-1"
                  data-testid="button-close-search"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-24">
              {searchQuery.trim() ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-foreground">
                      {searchResults.length > 0
                        ? `${searchResults.length} results for "${searchQuery}"`
                        : `No results for "${searchQuery}"`
                      }
                    </p>
                    <button
                      onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
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
                            onClick={() => {
                              trackEvent("view_detail", { restaurantId: r.id, metadata: { source: "search_results", query: searchQuery.trim() } });
                              setSearchOpen(false);
                              navigate(`/restaurant/${r.id}`);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100/80 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 text-left"
                            style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)" }}
                            data-testid={`drawer-search-result-${r.id}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                              {isNameMatch ? "📍" : "🏷️"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">★ {r.rating} · {r.category} · {r.address}</p>
                            </div>
                            {!isNameMatch && (
                              <span className="text-[9px] text-muted-foreground/60 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Similar</span>
                            )}
                            <span className="text-muted-foreground/40 text-xs">&#8250;</span>
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
              ) : (
                <div>
                  <p className="text-[22px] font-bold text-foreground tracking-tight leading-tight mb-1" data-testid="text-search-heading">
                    Let's find what you're craving
                  </p>
                  <p className="text-[13px] text-muted-foreground mb-5">
                    Start typing or pick a suggestion below
                  </p>
                  <div className="space-y-2">
                    {suggestions.slice(0, 6).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          trackEvent("view_detail", { restaurantId: r.id, metadata: { source: "search_suggestions" } });
                          setSearchOpen(false);
                          navigate(`/restaurant/${r.id}`);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100/80 hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 text-left"
                        style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.06)" }}
                        data-testid={`search-suggestion-${r.id}`}
                      >
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(40,50%,96%) 0%, hsl(35,40%,91%) 100%)" }}>
                          <FoodIconFromEmoji emoji={r.category?.includes("Thai") ? "🍜" : r.category?.includes("Japan") ? "🍣" : r.category?.includes("Korean") ? "🍜" : r.category?.includes("Italian") || r.category?.includes("Pizza") ? "🍕" : r.category?.includes("Burger") ? "🍔" : r.category?.includes("Ramen") || r.category?.includes("Noodle") ? "🍜" : r.category?.includes("Seafood") ? "🍽️" : "🍽️"} size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">★ {r.rating} · {r.category}</p>
                        </div>
                        <span className="text-muted-foreground/40 text-xs">&#8250;</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moreVibesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreVibesOpen(false)}
            data-testid="more-vibes-backdrop"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] max-h-[85vh] flex flex-col"
              style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }}
              onClick={(e) => e.stopPropagation()}
              data-testid="more-vibes-drawer"
            >
              <div className="pt-3 pb-2 flex justify-center flex-shrink-0">
                <div className="w-10 h-[5px] bg-gray-300/60 rounded-full" />
              </div>
              <div className="px-6 pb-2 flex-shrink-0">
                <h2 className="text-lg font-bold text-foreground">All Vibes</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Pick a mood, we will find the match</p>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0">
                <div className="px-6 pb-3">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">Popular</p>
                  <div className="grid grid-cols-4 gap-2">
                    {VIBE_TILES_MAIN.map((vibe) => (
                      <motion.button
                        key={vibe.mode}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setMoreVibesOpen(false); handleVibeClick(vibe.mode); }}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gray-50 border border-gray-100/80"
                        data-testid={`more-vibe-${vibe.mode}`}
                      >
                        <div className="flex items-center justify-center">
                          <FoodIconFromEmoji emoji={vibe.emoji} size={32} />
                        </div>
                        <span className="text-[10px] font-semibold text-foreground leading-tight">{vibe.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="px-6 pb-8">
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2">More Vibes</p>
                  <div className="grid grid-cols-4 gap-2">
                    {VIBE_TILES_EXTRA.map((vibe) => (
                      <motion.button
                        key={vibe.mode}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setMoreVibesOpen(false); handleVibeClick(vibe.mode); }}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gray-50 border border-gray-100/80"
                        data-testid={`more-vibe-${vibe.mode}`}
                      >
                        <div className="flex items-center justify-center">
                          <FoodIconFromEmoji emoji={vibe.emoji} size={32} />
                        </div>
                        <span className="text-[10px] font-semibold text-foreground leading-tight">{vibe.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SessionBar />
      <BottomNav showBack={false} hidden={searchOpen || moreVibesOpen} />
    </div>
  );
}
