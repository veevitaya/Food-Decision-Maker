import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { SlidersHorizontal, X, Heart } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import { BottomNav } from "@/components/BottomNav";
import { SessionBar } from "@/components/SessionBar";
import { InteractiveMap } from "@/components/InteractiveMap";
import { useSessions } from "@/lib/sessionStore";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { SaveBucketPicker } from "@/components/SaveBucketPicker";

const FILTER_OPTIONS = {
  sortBy: [
    { value: "rating", label: "Top Rated" },
    { value: "distance", label: "Nearest" },
    { value: "price_low", label: "Price: Low → High" },
    { value: "price_high", label: "Price: High → Low" },
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

const MAP_CATEGORIES = [
  { emoji: "🍜", label: "Thai" },
  { emoji: "🍣", label: "Sushi" },
  { emoji: "🍕", label: "Pizza" },
  { emoji: "☕", label: "Cafe" },
  { emoji: "🍔", label: "Burgers" },
  { emoji: "🍳", label: "Breakfast" },
  { emoji: "🧋", label: "Bubble Tea" },
  { emoji: "🍸", label: "Bars" },
  { emoji: "🍰", label: "Desserts" },
  { emoji: "🥐", label: "Bakery" },
];

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
  { id: 461, name: "KOI Thé", emoji: "🧋", category: "Bubble Tea", lat: 13.7454, lng: 100.5340, rating: "4.5", price: "฿", imageUrl: "https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=600&auto=format&fit=crop&q=60", description: "Taiwan's golden bubble milk tea" },
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
  { id: 461, name: "KOI Thé", category: "Bubble Tea", rating: "4.5", address: "Siam Paragon", menus: ["bubble tea", "boba", "milk tea", "pearl tea"] },
  { id: 462, name: "Tiger Sugar", category: "Bubble Tea", rating: "4.6", address: "CentralWorld", menus: ["brown sugar boba", "bubble tea", "tiger milk tea"] },
  { id: 463, name: "Gong Cha", category: "Bubble Tea", rating: "4.3", address: "Siam Square", menus: ["bubble tea", "milk tea", "taro", "boba"] },
  { id: 471, name: "Khao Tom Boworn", category: "Thai", rating: "4.6", address: "Boworn Niwet", menus: ["rice porridge", "congee", "stir fry", "thai comfort food"] },
  { id: 481, name: "Creamery Boutique", category: "Desserts", rating: "4.6", address: "Sukhumvit 49", menus: ["ice cream", "gelato", "sorbet", "sundae"] },
  { id: 482, name: "Guss Damn Good", category: "Desserts", rating: "4.5", address: "Thonglor", menus: ["ice cream", "gelato", "affogato", "waffle cone"] },
  { id: 483, name: "iberry", category: "Desserts", rating: "4.4", address: "Siam Square", menus: ["ice cream", "homemade gelato", "fruit sorbet"] },
];

const DEFAULT_LAT = 13.7420;
const DEFAULT_LNG = 100.5400;

function PinCardCarousel({ selectedPin, carouselPins, onNavigate, onClose, onPinChange }: {
  selectedPin: typeof RESTAURANT_PINS[0];
  carouselPins: typeof RESTAURANT_PINS;
  onNavigate: (id: number) => void;
  onClose: () => void;
  onPinChange: (id: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isSaved, getBucket } = useSavedRestaurants();
  const [savingId, setSavingId] = useState<number | null>(null);
  const initialIndex = carouselPins.findIndex(p => p.id === selectedPin.id);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex));
  const prevPinIdRef = useRef(selectedPin.id);

  useEffect(() => {
    if (scrollRef.current) {
      const idx = carouselPins.findIndex(p => p.id === selectedPin.id);
      if (idx >= 0) {
        const cardWidth = scrollRef.current.clientWidth * 0.78 + 12;
        const isNewPin = prevPinIdRef.current !== selectedPin.id;
        if (isNewPin) {
          scrollRef.current.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
        } else {
          scrollRef.current.scrollLeft = idx * cardWidth;
        }
        setActiveIndex(idx);
        prevPinIdRef.current = selectedPin.id;
      }
    }
  }, [selectedPin.id, carouselPins]);

  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const cardWidth = scrollRef.current.clientWidth * 0.78 + 12;
      const idx = Math.round(scrollRef.current.scrollLeft / cardWidth);
      if (idx !== activeIndex && idx >= 0 && idx < carouselPins.length) {
        setActiveIndex(idx);
        onPinChange(carouselPins[idx].id);
      }
    }, 80);
  }, [activeIndex, carouselPins, onPinChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
      className="absolute left-0 right-0 z-[45] gpu-accelerated"
      style={{ bottom: "22%" }}
    >
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-[11%]"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", touchAction: "pan-x", willChange: "scroll-position" }}
        onScroll={handleScroll}
      >
        {carouselPins.map((pin) => {
          const saved = isSaved(pin.id);
          const bucket = getBucket(pin.id);
          return (
            <div
              key={pin.id}
              className="flex-shrink-0 snap-center"
              style={{ width: "78%" }}
            >
              <div
                className="bg-white rounded-[16px] overflow-hidden active:scale-[0.98] transition-transform duration-150"
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}
                data-testid={`card-pin-${pin.id}`}
              >
                <div className="relative" onClick={() => onNavigate(pin.id)}>
                  <img
                    src={pin.imageUrl}
                    alt={pin.name}
                    className="w-full h-[140px] object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setSavingId(pin.id); }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center active:scale-[0.85] transition-transform duration-150"
                    style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}
                    data-testid={`button-save-pin-${pin.id}`}
                  >
                    {saved ? (
                      <Heart className={`w-4 h-4 fill-current ${bucket === "partner" ? "text-pink-400" : "text-red-500"}`} />
                    ) : (
                      <Heart className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
                <div className="px-3.5 py-3" onClick={() => onNavigate(pin.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[14px] text-foreground truncate">{pin.name}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{pin.description}</p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <span className="text-[11px]">★</span>
                      <span className="text-[13px] font-semibold">{pin.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] text-muted-foreground">{pin.category}</span>
                    <span className="text-muted-foreground/30 text-[8px]">·</span>
                    <span className="text-[11px] text-muted-foreground">{pin.price}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-1 mt-2.5">
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center mr-2 active:scale-90 transition-transform"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
          data-testid="button-close-carousel"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
        {carouselPins.map((pin, idx) => (
          <div
            key={pin.id}
            className={`h-1 rounded-full transition-all duration-200 ${idx === activeIndex ? "bg-foreground w-4" : "bg-foreground/20 w-1"}`}
          />
        ))}
      </div>

      {savingId !== null && (
        <SaveBucketPicker
          restaurantId={savingId}
          restaurantName={carouselPins.find(p => p.id === savingId)?.name || ""}
          open={true}
          onClose={() => setSavingId(null)}
        />
      )}
    </motion.div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const activeSessions = useSessions();
  const { getSuggestionTitle } = useTasteProfile();
  const [activeMode, setActiveMode] = useState<string>("trending");
  const [isGroup, setIsGroup] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [forceDrawerOpen, setForceDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPinId, setSelectedPinId] = useState<number | null>(null);
  const [highlightedPinId, setHighlightedPinId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeSort, setActiveSort] = useState("trending");
  const [activePrices, setActivePrices] = useState<string[]>([]);
  const [activeDietary, setActiveDietary] = useState<string[]>([]);
  const [activeDistance, setActiveDistance] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const showCategories = !drawerOpen;

  const activeFilterCount = (activePrices.length > 0 ? 1 : 0) + (activeDietary.length > 0 ? 1 : 0) + (activeDistance ? 1 : 0) + (activeSort !== "trending" ? 1 : 0);

  const togglePrice = (v: string) => setActivePrices(prev => prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]);
  const toggleDietary = (v: string) => setActiveDietary(prev => prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v]);

  const selectedPin = selectedPinId ? RESTAURANT_PINS.find(p => p.id === selectedPinId) : null;
  const activePinId = highlightedPinId ?? selectedPinId;

  const carouselPins = useMemo(() => {
    if (!selectedPin) return [];
    const sameCat = RESTAURANT_PINS.filter(p => p.category === selectedPin.category && p.id !== selectedPin.id);
    const others = RESTAURANT_PINS.filter(p => p.category !== selectedPin.category && p.id !== selectedPin.id);
    return [selectedPin, ...sameCat, ...others];
  }, [selectedPinId]);

  const handleCategoryClick = useCallback((label: string) => {
    navigate(`/restaurants?category=${encodeURIComponent(label)}`);
  }, [navigate]);

  const handlePinSelect = useCallback((id: number) => {
    setSelectedPinId(prev => {
      if (prev === id) {
        setHighlightedPinId(null);
        return null;
      }
      setHighlightedPinId(null);
      return id;
    });
  }, []);

  const handleCarouselPinChange = useCallback((id: number) => {
    setHighlightedPinId(id);
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const nameMatches: typeof ALL_SEARCHABLE = [];
    const categoryMatches: typeof ALL_SEARCHABLE = [];
    const menuMatches: typeof ALL_SEARCHABLE = [];
    const seen = new Set<number>();

    for (const r of ALL_SEARCHABLE) {
      if (r.name.toLowerCase().includes(q)) {
        nameMatches.push(r);
        seen.add(r.id);
      }
    }

    for (const r of ALL_SEARCHABLE) {
      if (seen.has(r.id)) continue;
      if (r.category.toLowerCase().includes(q)) {
        categoryMatches.push(r);
        seen.add(r.id);
      }
    }

    for (const r of ALL_SEARCHABLE) {
      if (seen.has(r.id)) continue;
      if (r.menus.some(m => m.includes(q))) {
        menuMatches.push(r);
        seen.add(r.id);
      }
    }

    const results = [
      ...nameMatches.slice(0, 5),
      ...categoryMatches.slice(0, 4),
      ...menuMatches.slice(0, 6),
    ];
    return results.slice(0, 10);
  }, [searchQuery]);

  const mapCenter = useMemo<[number, number]>(() => [userLocation.lat, userLocation.lng], [userLocation]);

  const mapPins = useMemo(() =>
    RESTAURANT_PINS.map(p => ({ id: p.id, name: p.name, emoji: p.emoji, category: p.category, price: p.price, lat: p.lat, lng: p.lng })),
  []);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#F0EDE8]" data-testid="home-page">
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          pins={mapPins}
          center={mapCenter}
          zoom={13}
          selectedPinId={activePinId}
          onPinSelect={handlePinSelect}
          filteredCategory={activeCategory}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/40 pointer-events-none" />
      </div>

      <AnimatePresence>
        {selectedPin && carouselPins.length > 0 && (
          <PinCardCarousel
            selectedPin={selectedPin}
            carouselPins={carouselPins}
            onNavigate={(id) => navigate(`/restaurant/${id}`)}
            onClose={() => { setSelectedPinId(null); setHighlightedPinId(null); }}
            onPinChange={handleCarouselPinChange}
          />
        )}
      </AnimatePresence>

      <div className="absolute left-0 right-0 z-[55]" style={{ top: "0" }}>
        <div className="bg-white/80 backdrop-blur-lg safe-top pb-2 px-4">
          <div
            className="bg-white px-4 py-2.5 rounded-2xl flex items-center gap-2.5 border border-gray-400"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            <span className="text-base">🔍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="What are you craving?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setForceDrawerOpen(true)}
              onBlur={() => setTimeout(() => setForceDrawerOpen(false), 200)}
              className="bg-transparent border-none outline-none text-foreground font-medium w-full placeholder:text-muted-foreground text-sm"
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); inputRef.current?.focus(); }}
                className="text-muted-foreground text-sm flex-shrink-0"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div ref={filterRef} className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
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
                    className="absolute top-11 right-0 w-[260px] bg-white rounded-2xl overflow-hidden border border-gray-100"
                    style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
                  >
                    <div className="p-4 space-y-4 max-h-[340px] overflow-y-auto">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Sort by</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.sortBy.map(o => (
                            <button key={o.value} onClick={() => setActiveSort(o.value)} data-testid={`filter-sort-${o.value}`}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeSort === o.value ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{o.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Price range</p>
                        <div className="flex gap-1.5">
                          {FILTER_OPTIONS.priceRange.map(o => (
                            <button key={o.value} onClick={() => togglePrice(o.value)} data-testid={`filter-price-${o.value}`}
                              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${activePrices.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{o.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dietary</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.dietary.map(o => (
                            <button key={o.value} onClick={() => toggleDietary(o.value)} data-testid={`filter-dietary-${o.value}`}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeDietary.includes(o.value) ? "bg-foreground text-white" : "bg-gray-100 text-foreground/70"}`}
                            >{o.label}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Distance</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FILTER_OPTIONS.distance.map(o => (
                            <button key={o.value} onClick={() => setActiveDistance(activeDistance === o.value ? null : o.value)} data-testid={`filter-distance-${o.value}`}
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
            {showCategories && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
                className="overflow-hidden"
              >
                <div
                  ref={categoryScrollRef}
                  className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {MAP_CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => handleCategoryClick(cat.label)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-[12px] font-semibold transition-all duration-200 flex-shrink-0 active:scale-95 ${
                        activeCategory === cat.label
                          ? "bg-foreground text-white"
                          : "bg-white text-foreground/70 border border-gray-200/80"
                      }`}
                      style={activeCategory === cat.label ? { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" } : {}}
                      data-testid={`category-${cat.label.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <span className="text-sm">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomSheet
        activeMode={activeMode}
        onModeChange={setActiveMode}
        isGroup={isGroup}
        onToggleGroup={() => setIsGroup(!isGroup)}
        onDrawerStateChange={setDrawerOpen}
        forceOpen={forceDrawerOpen}
        isSearchFocused={forceDrawerOpen}
        searchResults={searchResults}
        searchQuery={searchQuery}
        onClearSearch={() => { setSearchQuery(""); inputRef.current?.blur(); }}
        suggestionTitle={getSuggestionTitle}
        suggestionSubtitle="Places you might love"
      />

      <SessionBar />
      <BottomNav showBack={false} hidden={!drawerOpen || forceDrawerOpen} />
    </div>
  );
}
