import { useState, useMemo, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence, useAnimate } from "framer-motion";
import { useLocation } from "wouter";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { sendInvite } from "@/lib/liff";
import { BottomNav } from "@/components/BottomNav";
import { MOCK_HOME_CAMPAIGNS, MOCK_RESTAURANT_CAMPAIGNS, getDealLabel as getCampaignDealLabel } from "@/components/CampaignBanner";
import { Share2 } from "lucide-react";
import drunkToastImg from "@assets/drunk_toast_nobg.png";

const SWIPE_MENUS = [
  { id: 101, name: "Pad Thai", category: "🇹🇭 Thai", tags: ["🍜 Noodles", "🌶️ Spicy", "🦐 Shrimp"], description: "Wok-fried rice noodles with tamarind sauce, crushed peanuts, and fresh lime", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&auto=format&fit=crop&q=60", priceLevel: 1, rating: "4.8", address: "All over Bangkok", isNew: true, sponsored: false },
  { id: 102, name: "Korean BBQ", category: "🇰🇷 Korean", tags: ["🥩 Grilled", "🍖 Meat", "👥 Group"], description: "Sizzling grilled meats at the table with banchan sides and ssamjang sauce", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.5", address: "Sukhumvit, Siam", isNew: false, sponsored: true },
  { id: 103, name: "Tonkotsu Ramen", category: "🇯🇵 Japanese", tags: ["🍜 Noodles", "🍖 Pork", "🍥 Rich"], description: "Rich 18-hour pork bone broth with thin noodles, chashu, and seasoned egg", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.6", address: "Thonglor, Silom", isNew: false, sponsored: false },
  { id: 104, name: "Margherita Pizza", category: "🍕 Italian", tags: ["🧀 Cheesy", "🍅 Tomato", "🌿 Basil"], description: "Wood-fired with San Marzano tomatoes, fresh mozzarella, and basil", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.7", address: "Ekkamai, Sukhumvit", isNew: true, sponsored: false },
  { id: 105, name: "Sushi Omakase", category: "🇯🇵 Japanese", tags: ["🐟 Fresh", "🍣 Raw", "✨ Premium"], description: "Chef's choice premium course — seasonal fish flown from Tsukiji market", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=60", priceLevel: 4, rating: "4.9", address: "Thonglor, Gaysorn", isNew: false, sponsored: true },
  { id: 106, name: "Green Curry", category: "🇹🇭 Thai", tags: ["🌶️ Spicy", "🥥 Coconut", "🍚 Rice"], description: "Aromatic coconut milk curry with Thai basil, eggplant, and chicken", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&auto=format&fit=crop&q=60", priceLevel: 1, rating: "4.7", address: "Old Town, Samsen", isNew: false, sponsored: false },
  { id: 107, name: "Smash Burger", category: "🍔 American", tags: ["🍔 Burger", "🧀 Cheesy", "🍟 Fries"], description: "Double smash patties with aged cheddar, caramelized onions, and secret sauce", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.4", address: "Ekkamai, Sukhumvit", isNew: true, sponsored: false },
  { id: 108, name: "Dim Sum", category: "🇨🇳 Chinese", tags: ["🥟 Dumpling", "🫖 Tea", "🌅 Brunch"], description: "Steamed dumplings, siu mai, and har gow served with jasmine tea", imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.6", address: "Chinatown, CentralWorld", isNew: false, sponsored: false },
  { id: 109, name: "Eggs Benedict", category: "🍳 Brunch", tags: ["🍳 Eggs", "🥓 Bacon", "🌅 Brunch"], description: "Poached eggs with hollandaise on toasted brioche — the perfect weekend brunch", imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.7", address: "Thonglor, Phrom Phong", isNew: true, sponsored: false },
  { id: 110, name: "Croissant & Coffee", category: "🥐 French", tags: ["🥐 Pastry", "🧈 Buttery", "☕ Coffee"], description: "Flaky, buttery croissant with perfectly pulled espresso", imageUrl: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=800&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.7", address: "Sukhumvit, Ekkamai", isNew: false, sponsored: true },
  { id: 111, name: "Smoothie Bowl", category: "🥣 Healthy", tags: ["🫐 Berry", "🌿 Healthy", "📸 Pretty"], description: "Vibrant açaí or pitaya base topped with granola, fresh fruit, and chia seeds", imageUrl: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.5", address: "Sukhumvit, Thonglor", isNew: true, sponsored: false },
  { id: 112, name: "Bubble Tea", category: "🧋 Taiwanese", tags: ["🧋 Boba", "🥤 Drink", "🫧 Tapioca"], description: "Chewy tapioca pearls in creamy milk tea — customize your sweetness and ice level", imageUrl: "https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=800&auto=format&fit=crop&q=60", priceLevel: 1, rating: "4.5", address: "Siam, CentralWorld", isNew: false, sponsored: false },
  { id: 113, name: "Thai Milk Tea", category: "🇹🇭 Thai", tags: ["🧋 Drink", "🍵 Tea", "🧡 Sweet"], description: "Strong brewed Ceylon tea with star anise, condensed milk, and crushed ice", imageUrl: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=800&auto=format&fit=crop&q=60", priceLevel: 1, rating: "4.6", address: "All over Bangkok", isNew: false, sponsored: false },
];

const DRINKS_SWIPE_MENUS = [
  { id: 601, name: "Tropic City", category: "🍹 Tiki · Cocktails", tags: ["🍹 Tiki", "🌴 Tropical", "🌙 Late night"], description: "Award-winning tiki bar with tropical cocktails, rum flights, and Pacific Island vibes on Charoen Krung.", imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.7", address: "Charoen Krung 28", isNew: true, sponsored: false },
  { id: 602, name: "Teens of Thailand", category: "🍸 Speakeasy · Gin", tags: ["🍸 Craft", "🚪 Hidden", "🌿 Botanical"], description: "Asia's 50 Best Bars. Tiny Chinatown speakeasy with gin-focused craft cocktails.", imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.8", address: "Soi Nana, Chinatown", isNew: false, sponsored: true },
  { id: 603, name: "Rabbit Hole", category: "🥃 Whisky · Lounge", tags: ["🥃 Whisky", "🎵 Jazz", "✨ Premium"], description: "Cozy Thonglor whisky bar with 200+ bottles, live jazz weekends, and leather armchairs.", imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.6", address: "Thonglor 7", isNew: false, sponsored: false },
  { id: 604, name: "Vesper", category: "🍸 Cocktail · Bar", tags: ["🏆 Award", "🍸 Mixology", "🌃 Upscale"], description: "Consistently on Asia's 50 Best. Elegant cocktails with Thai ingredients and impeccable service.", imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=60", priceLevel: 4, rating: "4.9", address: "Convent Rd, Silom", isNew: false, sponsored: false },
  { id: 605, name: "Craft Bangkok", category: "🍺 Craft Beer · Tap", tags: ["🍺 IPA", "🌾 Local", "🍕 Food"], description: "Bangkok's OG craft beer bar with 20 rotating taps, Thai-brewed IPAs, and wood-fired pizza.", imageUrl: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.5", address: "Sukhumvit 23", isNew: false, sponsored: false },
  { id: 606, name: "Sky Bar at Lebua", category: "🌅 Rooftop · Views", tags: ["🌃 Skyline", "🌅 Sunset", "✨ Iconic"], description: "The iconic open-air rooftop from The Hangover II. Stunning 360° Bangkok views from the 63rd floor.", imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&auto=format&fit=crop&q=60", priceLevel: 4, rating: "4.5", address: "State Tower, Silom", isNew: false, sponsored: true },
  { id: 607, name: "Tep Bar", category: "🇹🇭 Thai · Heritage", tags: ["🌾 Ya Dong", "🎵 Live", "🇹🇭 Culture"], description: "Old Town gem serving traditional Thai spirits (Ya Dong) with live Thai folk music and art.", imageUrl: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.6", address: "Soi Nana, Chinatown", isNew: true, sponsored: false },
  { id: 608, name: "Smalls", category: "🎵 Jazz · Speakeasy", tags: ["🎵 Live jazz", "🚪 Hidden", "🌙 Intimate"], description: "Intimate 30-seat jazz bar behind an unmarked door. World-class musicians, killer old fashioneds.", imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.7", address: "Soi Sukhumvit 12", isNew: false, sponsored: false },
  { id: 609, name: "Havana Social", category: "🍹 Rum · Cuban", tags: ["🍹 Mojito", "💃 Salsa", "🌴 Havana"], description: "Step through the phone booth into 1950s Havana. Cuban cocktails, salsa nights, and cigars.", imageUrl: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.6", address: "Sukhumvit 11", isNew: false, sponsored: false },
  { id: 610, name: "Wine Republic", category: "🍷 Wine · Bistro", tags: ["🍷 Natural", "🧀 Cheese", "🌿 Chill"], description: "Relaxed wine bar with 300+ labels, natural wine flights, and gorgeous cheese and charcuterie.", imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.4", address: "All Seasons Place", isNew: true, sponsored: false },
];

interface RestaurantCard {
  id: number;
  name: string;
  category: string;
  tags: string[];
  description: string;
  imageUrl: string;
  priceLevel: number;
  rating: string;
  address: string;
  isNew: boolean;
  matchChance: number;
}

const RESTAURANT_SWIPE_CARDS: RestaurantCard[] = [
  { id: 201, name: "Thipsamai", category: "🇹🇭 Thai · Street food", tags: ["🍜 Pad Thai", "🔥 Famous", "📸 Iconic"], description: "The legendary Pad Thai since 1966. Their signature wrapped-in-egg version is unbeatable.", imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=60", priceLevel: 1, rating: "4.9", address: "Maha Chai Rd", isNew: false, matchChance: 0 },
  { id: 244, name: "Jay Fai", category: "🇹🇭 Thai · Michelin", tags: ["⭐ Michelin", "🦀 Crab", "🔥 Legendary"], description: "Michelin-starred street food legend. Exquisite dishes from her legendary wok.", imageUrl: "https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.9", address: "Maha Chai Rd", isNew: false, matchChance: 0 },
  { id: 231, name: "Peppina", category: "🍕 Italian · Pizza", tags: ["🍕 Neapolitan", "🔥 Wood-fired", "🇮🇹 Authentic"], description: "Neapolitan pizza with San Marzano tomatoes, fired at 485°C for 90 seconds.", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.8", address: "Sukhumvit 33", isNew: false, matchChance: 0.5 },
  { id: 251, name: "Sushi Masato", category: "🇯🇵 Japanese · Omakase", tags: ["🍣 Sushi", "✨ Premium", "🎌 8-seat"], description: "Intimate 8-seat counter with fish flown directly from Tsukiji market.", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=60", priceLevel: 4, rating: "4.9", address: "Thonglor 13", isNew: false, matchChance: 0.7 },
  { id: 222, name: "Bankara Ramen", category: "🇯🇵 Japanese · Ramen", tags: ["🍜 Tonkotsu", "🍖 Rich", "🔥 Hot"], description: "Rich 18-hour pork bone broth with secret back-fat topping.", imageUrl: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.7", address: "Thonglor", isNew: false, matchChance: 0 },
  { id: 261, name: "Daniel Thaiger", category: "🍔 American · Burger", tags: ["🍔 Smash", "🚚 Food truck", "🤤 Juicy"], description: "Bangkok's OG food truck burger. Dry-aged Aussie beef with secret tiger sauce.", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.5", address: "Sukhumvit 36", isNew: false, matchChance: 0 },
  { id: 373, name: "Gaggan Anand", category: "🇮🇳 Indian · Fine dining", tags: ["✨ Asia's Best", "🍽️ 25 courses", "🌟 Progressive"], description: "Progressive Indian cuisine by the legendary Chef Gaggan. Asia's Best Restaurant.", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=60", priceLevel: 4, rating: "4.9", address: "Langsuan", isNew: false, matchChance: 1.0 },
  { id: 241, name: "Krua Apsorn", category: "🇹🇭 Thai · Royal", tags: ["👑 Royal recipe", "⭐ Bib Gourmand", "🌶️ Curry"], description: "Royal recipe green curry, awarded Michelin Bib Gourmand.", imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&auto=format&fit=crop&q=60", priceLevel: 1, rating: "4.8", address: "Samsen Rd", isNew: false, matchChance: 0 },
  { id: 212, name: "Mongkol Korean", category: "🇰🇷 Korean · BBQ", tags: ["🥩 Wagyu", "🔥 Premium", "🍖 BBQ"], description: "Premium Korean cuts with authentic banchan spread. Wagyu-grade from Korean farms.", imageUrl: "https://images.unsplash.com/photo-1583224964978-2257b960c3d3?w=600&auto=format&fit=crop&q=60", priceLevel: 3, rating: "4.6", address: "Sukhumvit 24", isNew: true, matchChance: 0.3 },
  { id: 341, name: "P'Aor Tom Yum", category: "🇹🇭 Thai · Soup", tags: ["🦐 Prawns", "🌶️ Spicy", "🔥 Cult"], description: "Legendary creamy tom yum goong with massive river prawns.", imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=60", priceLevel: 2, rating: "4.9", address: "Phetchaburi Rd", isNew: false, matchChance: 0.8 },
];

const CAMPAIGN_CARD_IDS = MOCK_HOME_CAMPAIGNS.map(c => c.id);

const CAMPAIGN_SWIPE_CARDS: RestaurantCard[] = MOCK_HOME_CAMPAIGNS.map((c, idx) => ({
  id: idx,
  name: c.restaurantName,
  category: `🏷️ ${c.title}`,
  tags: [
    c.dealType === "percentage" ? `💰 ${c.dealValue}% off` :
    c.dealType === "bogo" ? "🎁 Buy 1 Get 1" :
    c.dealType === "freeItem" ? `🎁 Free ${c.dealValue}` :
    `💰 ฿${c.dealValue} off`,
    "🏷️ Limited time",
    "⭐ Verified deal",
  ],
  description: c.description,
  imageUrl: c.restaurantImage,
  priceLevel: 2,
  rating: "4.7",
  address: "Bangkok",
  isNew: false,
  matchChance: 0,
}));

const RESTAURANT_MODES = new Set(["saved", "partner", "fancy", "spicy", "healthy", "campaigns", "restaurants"]);

function ConfettiExplosion() {
  const colors = ["#FF385C", "#FFD700", "#00A699", "#FC642D", "#7B61FF", "#00D1C1", "#FF6B6B", "#4ECDC4", "#FFE66D", "#A855F7"];
  const shapes = ["circle", "rect", "star", "strip"];
  const pieces = useMemo(() =>
    Array.from({ length: 120 }).map((_, i) => {
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const velocity = 200 + Math.random() * 500;
      return {
        id: i,
        tx: Math.cos(angle) * velocity,
        ty: Math.sin(angle) * velocity * -1,
        tyEnd: 300 + Math.random() * 400,
        spin: (Math.random() - 0.5) * 1080,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: 4 + Math.random() * 8,
        delay: Math.random() * 0.15,
        duration: 1.8 + Math.random() * 1.2,
      };
    }), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            top: "40%",
            left: "50%",
            width: p.shape === "strip" ? p.size * 0.3 : p.size,
            height: p.shape === "circle" ? p.size : p.size * (p.shape === "strip" ? 2.5 : 0.6),
            borderRadius: p.shape === "circle" ? "50%" : p.shape === "star" ? "2px" : "1px",
            backgroundColor: p.color,
            animation: `confetti-explode ${p.duration}s cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}s forwards`,
            ["--tx" as any]: `${p.tx}px`,
            ["--ty" as any]: `${p.ty}px`,
            ["--ty-end" as any]: `${p.tyEnd}px`,
            ["--spin" as any]: `${p.spin}deg`,
            clipPath: p.shape === "star" ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function useSwipeHint(active: boolean, showHint: boolean) {
  const [scope, animate] = useAnimate();
  const [hintDone, setHintDone] = useState(false);

  useEffect(() => {
    if (active && showHint && !hintDone && scope.current) {
      const runHint = async () => {
        await new Promise(r => setTimeout(r, 500));
        try {
          await animate(scope.current, { x: 35, rotate: 3 }, { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] });
          await animate(scope.current, { x: -28, rotate: -2.5 }, { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] });
          await animate(scope.current, { x: 0, rotate: 0 }, { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] });
        } catch {}
        setHintDone(true);
      };
      runHint();
    }
  }, [active, showHint, hintDone]);

  return scope;
}

function MenuSwipeCard({
  item,
  active,
  behind,
  onSwipe,
  onTap,
  showHint = false,
  drunk = false,
}: {
  item: typeof SWIPE_MENUS[0];
  active: boolean;
  behind: boolean;
  onSwipe: (dir: "left" | "right" | "up") => void;
  onTap: () => void;
  showHint?: boolean;
  drunk?: boolean;
}) {
  const hintRef = useSwipeHint(active, showHint);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const yumOpacity = useTransform(x, [0, 80], [0, 1]);
  const nahOpacity = useTransform(x, [0, -80], [0, 1]);
  const superOpacity = useTransform(y, [0, -80], [0, 1]);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<{ x: number; y: number } | null>(null);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const xThreshold = 120;
    const yThreshold = -100;

    if (info.offset.y < yThreshold && Math.abs(info.offset.x) < 80) {
      setExiting({ x: 0, y: -600 });
      onSwipe("up");
    } else if (info.offset.x > xThreshold) {
      setExiting({ x: 500, y: info.offset.y });
      onSwipe("right");
    } else if (info.offset.x < -xThreshold) {
      setExiting({ x: -500, y: info.offset.y });
      onSwipe("left");
    }
    setTimeout(() => setDragging(false), 50);
  };

  if (!active && !behind) return null;

  return (
    <motion.div
      ref={active ? hintRef : undefined}
      style={{
        x: active ? x : 0,
        y: active ? y : 0,
        rotate: active ? rotate : 0,
        zIndex: active ? 10 : 5,
        boxShadow: active
          ? "0 20px 60px -12px rgba(0,0,0,0.2), 0 4px 20px -4px rgba(0,0,0,0.08)"
          : "0 10px 30px -8px rgba(0,0,0,0.12)",
      }}
      initial={behind ? { scale: 0.95, y: 8 } : { scale: 1, y: 0 }}
      animate={
        exiting
          ? { x: exiting.x, y: exiting.y, opacity: 0, rotate: exiting.x > 0 ? 20 : exiting.x < 0 ? -20 : 0 }
          : behind
          ? { scale: 0.96, y: 8, opacity: 0.7 }
          : { scale: 1, y: 0, opacity: 1 }
      }
      transition={exiting ? { duration: 0.35, ease: [0.4, 0, 0.2, 1] } : { type: "spring", damping: 28, stiffness: 280 }}
      drag={active && !exiting ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={() => { if (!dragging && active) onTap(); }}
      className="absolute inset-0 bg-white rounded-[28px] overflow-hidden cursor-grab active:cursor-grabbing select-none gpu-accelerated"
      data-testid={`swipe-card-${item.id}`}
    >
      <div className="relative w-full h-[58%]">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/5" />

        {active && (
          <>
            <motion.div
              style={{ opacity: yumOpacity }}
              className="absolute top-8 left-6 z-20 gpu-accelerated"
            >
              <div className="bg-[hsl(160,60%,45%)] text-white text-xl font-black rounded-2xl px-5 py-2.5 -rotate-12 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(0,200,100,0.3)" }}
              >
                YUM <span className="text-2xl">😋</span>
              </div>
            </motion.div>
            <motion.div
              style={{ opacity: nahOpacity }}
              className="absolute top-8 right-6 z-20 gpu-accelerated"
            >
              <div className="bg-[hsl(348,83%,47%)] text-white text-xl font-black rounded-2xl px-5 py-2.5 rotate-12 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(220,38,38,0.3)" }}
              >
                NAH <span className="text-2xl">😒</span>
              </div>
            </motion.div>
            <motion.div
              style={{ opacity: superOpacity }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 gpu-accelerated"
            >
              <div className="bg-[hsl(45,95%,55%)] text-foreground text-xl font-black rounded-2xl px-5 py-2.5 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(234,179,8,0.3)" }}
              >
                SUPERLIKE <span className="text-2xl">⭐</span>
              </div>
            </motion.div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5 pb-4">
          <h2 className="text-white text-[26px] font-semibold mb-1 drop-shadow-lg truncate">{item.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-white/90 text-sm font-medium truncate flex-1 min-w-0">{item.category}</span>
            <span className="text-white/50 flex-shrink-0">·</span>
            <span className="text-white/90 text-sm flex-shrink-0">{"฿".repeat(item.priceLevel)}</span>
            <span className="text-white/50 flex-shrink-0">·</span>
            <span className="text-white/90 text-sm flex items-center gap-0.5 flex-shrink-0">★ {item.rating}</span>
          </div>
        </div>

        <div className="absolute top-5 left-5 flex gap-2">
          {item.isNew && (
            <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              New
            </div>
          )}
          {item.sponsored && (
            <div className="bg-amber-400/95 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground flex items-center gap-1"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              Sponsored
            </div>
          )}
        </div>
      </div>

      <div className="p-5 pt-3 flex flex-col h-[42%]">
        <div className="flex flex-wrap gap-1.5 mb-2 overflow-hidden max-h-[2.5rem]">
          {item.tags.map((tag) => (
            <span key={tag} className="text-[11px] bg-gray-100 rounded-full px-2.5 py-1 font-medium text-foreground/80">{tag}</span>
          ))}
        </div>

        <p className="text-foreground/60 text-sm leading-relaxed flex-1 min-h-0 line-clamp-2">{item.description}</p>

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate max-w-[50%]">{item.address}</span>
          <p className="text-xs text-[#D4A800] font-semibold flex-shrink-0">{drunk ? "Tap for bars →" : "Tap for restaurants →"}</p>
        </div>
      </div>
    </motion.div>
  );
}

function RestaurantSwipeCard({
  item,
  active,
  behind,
  onSwipe,
  onTap,
  showHint = false,
  drunk = false,
}: {
  item: RestaurantCard;
  active: boolean;
  behind: boolean;
  onSwipe: (dir: "left" | "right" | "up") => void;
  onTap: () => void;
  showHint?: boolean;
  drunk?: boolean;
}) {
  const hintRef = useSwipeHint(active, showHint);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const yumOpacity = useTransform(x, [0, 80], [0, 1]);
  const nahOpacity = useTransform(x, [0, -80], [0, 1]);
  const superOpacity = useTransform(y, [0, -80], [0, 1]);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<{ x: number; y: number } | null>(null);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const xThreshold = 120;
    const yThreshold = -100;

    if (info.offset.y < yThreshold && Math.abs(info.offset.x) < 80) {
      setExiting({ x: 0, y: -600 });
      onSwipe("up");
    } else if (info.offset.x > xThreshold) {
      setExiting({ x: 500, y: info.offset.y });
      onSwipe("right");
    } else if (info.offset.x < -xThreshold) {
      setExiting({ x: -500, y: info.offset.y });
      onSwipe("left");
    }
    setTimeout(() => setDragging(false), 50);
  };

  if (!active && !behind) return null;

  return (
    <motion.div
      ref={active ? hintRef : undefined}
      style={{
        x: active ? x : 0,
        y: active ? y : 0,
        rotate: active ? rotate : 0,
        zIndex: active ? 10 : 5,
        boxShadow: active
          ? "0 20px 60px -12px rgba(0,0,0,0.2), 0 4px 20px -4px rgba(0,0,0,0.08)"
          : "0 10px 30px -8px rgba(0,0,0,0.12)",
      }}
      initial={behind ? { scale: 0.95, y: 8 } : { scale: 1, y: 0 }}
      animate={
        exiting
          ? { x: exiting.x, y: exiting.y, opacity: 0, rotate: exiting.x > 0 ? 20 : exiting.x < 0 ? -20 : 0 }
          : behind
          ? { scale: 0.96, y: 8, opacity: 0.7 }
          : { scale: 1, y: 0, opacity: 1 }
      }
      transition={exiting ? { duration: 0.35, ease: [0.4, 0, 0.2, 1] } : { type: "spring", damping: 28, stiffness: 280 }}
      drag={active && !exiting ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={() => { if (!dragging && active) onTap(); }}
      className="absolute inset-0 bg-white rounded-[28px] overflow-hidden cursor-grab active:cursor-grabbing select-none gpu-accelerated"
      data-testid={`swipe-restaurant-${item.id}`}
    >
      <div className="relative w-full h-[55%]">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {active && (
          <>
            <motion.div style={{ opacity: yumOpacity }} className="absolute top-8 left-6 z-20 gpu-accelerated">
              <div className="bg-[hsl(160,60%,45%)] text-white text-xl font-black rounded-2xl px-5 py-2.5 -rotate-12 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(0,200,100,0.3)" }}
              >
                YUM <span className="text-2xl">😋</span>
              </div>
            </motion.div>
            <motion.div style={{ opacity: nahOpacity }} className="absolute top-8 right-6 z-20 gpu-accelerated">
              <div className="bg-[hsl(348,83%,47%)] text-white text-xl font-black rounded-2xl px-5 py-2.5 rotate-12 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(220,38,38,0.3)" }}
              >
                NAH <span className="text-2xl">😒</span>
              </div>
            </motion.div>
            <motion.div style={{ opacity: superOpacity }} className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 gpu-accelerated">
              <div className="bg-[hsl(45,95%,55%)] text-foreground text-xl font-black rounded-2xl px-5 py-2.5 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(234,179,8,0.3)" }}
              >
                SUPERLIKE <span className="text-2xl">⭐</span>
              </div>
            </motion.div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5 pb-4">
          <h2 className="text-white text-[28px] font-semibold mb-1 drop-shadow-lg truncate">{item.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-white/90 text-sm font-medium truncate flex-1 min-w-0">{item.category}</span>
            <span className="text-white/50 flex-shrink-0">·</span>
            <span className="text-white/90 text-sm flex-shrink-0">{"฿".repeat(item.priceLevel)}</span>
            <span className="text-white/50 flex-shrink-0">·</span>
            <span className="text-white/90 text-sm flex items-center gap-0.5 flex-shrink-0">★ {item.rating}</span>
          </div>
        </div>

        <div className="absolute top-5 left-5 flex gap-2">
          {item.isNew && (
            <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              New
            </div>
          )}
          {MOCK_RESTAURANT_CAMPAIGNS[item.id] && (
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 backdrop-blur-sm rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white flex items-center gap-1.5 deal-badge-glow"
              style={{ boxShadow: "0 2px 12px rgba(251,191,36,0.4)" }}
              data-testid={`badge-deal-${item.id}`}
            >
              <span className="text-xs animate-deal-bounce inline-block">🏷️</span>
              {getCampaignDealLabel(MOCK_RESTAURANT_CAMPAIGNS[item.id][0].dealType, MOCK_RESTAURANT_CAMPAIGNS[item.id][0].dealValue)}
            </div>
          )}
        </div>
      </div>

      <div className="p-5 pt-3 flex flex-col h-[45%]">
        <div className="flex flex-wrap gap-1.5 mb-2 overflow-hidden max-h-[2.5rem]">
          {item.tags.map((tag) => (
            <span key={tag} className="text-[11px] bg-gray-100 rounded-full px-2.5 py-1 font-medium text-foreground/80">{tag}</span>
          ))}
        </div>

        <p className="text-foreground/60 text-sm leading-relaxed flex-1 min-h-0 line-clamp-2">{item.description}</p>

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate max-w-[50%]">{item.address}</span>
          <p className="text-xs text-[#D4A800] font-semibold flex-shrink-0">{drunk ? "Tap for bars →" : "Tap to view details →"}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function SwipePage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "all";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [matchedRestaurant, setMatchedRestaurant] = useState<RestaurantCard | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const { recordSwipe } = useTasteProfile();

  const isCampaignMode = mode === "campaigns";
  const isDrinksMode = mode === "drinks";
  const isRestaurantMode = RESTAURANT_MODES.has(mode);
  const menuItems = isDrinksMode ? DRINKS_SWIPE_MENUS : SWIPE_MENUS;
  const restaurantItems = isCampaignMode ? CAMPAIGN_SWIPE_CARDS : RESTAURANT_SWIPE_CARDS;
  const items = isRestaurantMode ? restaurantItems : menuItems;

  const modeLabels: Record<string, string> = {
    all: "Swipe Mode",
    cheap: "Budget Eats",
    nearby: "Near BTS",
    trending: "Trending Now",
    hot: "Hot Right Now",
    late: "Late Night",
    outdoor: "Outdoor Dining",
    saved: "Your Saved",
    partner: "With Partner",
    healthy: "Healthy Eats",
    spicy: "Spicy Picks",
    sweets: "Sweet Tooth",
    coffee: "Café Vibes",
    fancy: "Fine Dining",
    drinks: "Drinks",
    delivery: "Delivery Mode",
    restaurants: "Restaurants",
    campaigns: "Deals & Offers",
  };

  const handleMenuSwipe = (dir: "left" | "right" | "up") => {
    const item = menuItems[currentIndex];
    if (item) {
      if (dir === "right") recordSwipe(item.name, "like");
      else if (dir === "up") recordSwipe(item.name, "superlike");
      else recordSwipe(item.name, "dislike");
    }

    if (dir === "right" || dir === "up") {
      setLikedCount((c) => c + 1);
    }
    setLastAction(dir === "right" ? "YUM!" : dir === "up" ? "SUPERLIKE!" : "Nah");
    setTimeout(() => setLastAction(null), 800);
    setTimeout(() => setCurrentIndex((i) => i + 1), 300);
  };

  const handleRestaurantSwipe = (dir: "left" | "right" | "up") => {
    const item = restaurantItems[currentIndex];
    if (!item) return;

    if (dir === "right") recordSwipe(item.name, "like");
    else if (dir === "up") recordSwipe(item.name, "superlike");
    else recordSwipe(item.name, "dislike");

    if (dir === "right" || dir === "up") {
      setLikedCount((c) => c + 1);

      if (item.matchChance === 1.0) {
        setTimeout(() => {
          setMatchedRestaurant(item);
          setShowConfetti(true);
          setShowMatch(true);
        }, 600);
      }
    }

    setLastAction(dir === "right" ? "YUM!" : dir === "up" ? "SUPERLIKE!" : "Nah");
    setTimeout(() => setLastAction(null), 800);
    setTimeout(() => setCurrentIndex((i) => i + 1), 300);
  };

  const handleTap = (item: any) => {
    if (isCampaignMode) {
      const campaignId = CAMPAIGN_CARD_IDS[item.id];
      if (campaignId) navigate(`/campaign/${campaignId}`);
    } else if (isRestaurantMode) {
      navigate(`/restaurant/${item.id}`);
    } else {
      navigate(`/restaurants?category=${encodeURIComponent(item.name)}`);
    }
  };

  if (showMatch && matchedRestaurant) {
    return (
      <div className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden" data-testid="solo-match-page">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[5%] w-48 h-48 bg-amber-50/50 rounded-full blur-3xl" />
          <div className="absolute bottom-[15%] right-[10%] w-56 h-56 bg-amber-50/50 rounded-full blur-3xl" />
          <div className="absolute top-[40%] right-[20%] w-32 h-32 bg-green-50/40 rounded-full blur-3xl" />
        </div>

        {showConfetti && <ConfettiExplosion />}

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="mb-3"
        >
          <div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center"
            style={{ boxShadow: "0 12px 40px -8px rgba(255,204,2,0.25)" }}
          >
            <span className="text-5xl inline-block animate-icon-wiggle gpu-accelerated">🎉</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="text-[32px] font-semibold text-center mb-2"
        >
          Perfect match!
        </motion.h1>
        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="text-muted-foreground text-center mb-6 text-[15px]"
        >
          You and your partner both loved {matchedRestaurant.name}!
        </motion.p>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="w-72 rounded-[24px] overflow-hidden mb-7"
          style={{ boxShadow: "0 20px 60px -15px rgba(0,0,0,0.18)" }}
        >
          <div className="relative">
            <img src={matchedRestaurant.imageUrl} alt={matchedRestaurant.name} className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
          <div className="p-5 bg-white">
            <h3 className="font-semibold text-lg">{matchedRestaurant.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{matchedRestaurant.category}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-medium">★ {matchedRestaurant.rating}</span>
              <span className="text-xs text-muted-foreground">{"฿".repeat(matchedRestaurant.priceLevel)}</span>
              <span className="text-xs text-muted-foreground">· {matchedRestaurant.address}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {matchedRestaurant.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] bg-gray-100 rounded-full px-2.5 py-1 font-medium">{tag}</span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.button
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          onClick={() => navigate(`/restaurant/${matchedRestaurant.id}`)}
          data-testid="button-view-restaurant"
          className="w-full max-w-xs py-4 rounded-full bg-[#FFCC02] text-[#2d2000] font-bold text-[15px] active:scale-[0.96] transition-transform duration-200"
          style={{ boxShadow: "var(--shadow-glow-primary)" }}
        >
          View Restaurant →
        </motion.button>

        <motion.button
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          onClick={() => navigate("/")}
          data-testid="button-home-match"
          className="mt-4 text-sm text-muted-foreground font-semibold hover:text-foreground transition-colors"
        >
          Back to home
        </motion.button>
      </div>
    );
  }

  return (
    <div className={`w-full h-[100dvh] flex flex-col overflow-hidden bg-[hsl(30,20%,97%)]`} style={{ touchAction: "none", overscrollBehavior: "none" }} data-testid="swipe-page">
      <div className="flex items-center justify-between px-6 pt-12 pb-3">
        <div className="text-left flex items-center gap-2">
          <div>
            <h1 className="font-bold text-[22px] tracking-tight">{modeLabels[mode] || "Swipe Mode"}</h1>
            {isDrinksMode ? (
              <p className="text-[11px] text-muted-foreground mt-0.5">What are we drinking?</p>
            ) : isRestaurantMode ? (
              <p className="text-[11px] text-muted-foreground mt-0.5">Swipe restaurants</p>
            ) : null}
          </div>
          {isDrinksMode && (
            <div className="relative h-9 w-12">
              <img
                src={drunkToastImg}
                alt=""
                className="h-[52px] w-[52px] object-contain absolute animate-drunk-stumble gpu-accelerated drop-shadow-sm"
                style={{ bottom: -8 }}
                data-testid="img-drunk-toast-mascot"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              await sendInvite(mode);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-200 bg-white text-foreground border border-gray-200/80"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            data-testid="button-invite-line"
            aria-label="Share via LINE"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-muted-foreground"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <span>{Math.min(currentIndex + 1, items.length)}</span>
            <span className="text-gray-300">/</span>
            <span>{items.length}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 gpu-accelerated"
          >
            <div className={`px-4 py-2 rounded-full text-sm font-bold text-white ${
              lastAction === "YUM!" ? "bg-[hsl(160,60%,45%)]" :
              lastAction === "SUPERLIKE!" ? "bg-[hsl(45,95%,55%)] !text-foreground" :
              "bg-gray-400"
            }`}
              style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.15)" }}
            >
              {lastAction}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative px-5 pb-4">
        {currentIndex >= items.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
            >
              <span className="text-6xl block">🎉</span>
              <span className="absolute -top-2 -right-3 text-2xl inline-block animate-icon-wiggle gpu-accelerated">✨</span>
            </motion.div>
            <h2 className="text-2xl font-semibold mb-2">All done!</h2>
            <p className="text-muted-foreground mb-2 text-sm">You liked {likedCount} out of {items.length} options</p>
            <p className="text-muted-foreground mb-8 text-xs">Tap below to explore or start over</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setCurrentIndex(0); setLikedCount(0); }}
                data-testid="button-restart"
                className="px-6 py-3.5 rounded-full bg-foreground text-white font-bold text-sm active:scale-[0.96] transition-transform duration-200"
                style={{ boxShadow: "0 8px 25px -5px rgba(0,0,0,0.25)" }}
              >
                Start Over
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3.5 rounded-full bg-white border-2 border-gray-200 font-bold text-sm active:scale-[0.96] transition-transform duration-200"
              >
                Home
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full max-w-sm mx-auto">
            {isRestaurantMode ? (
              restaurantItems.map((item, idx) => {
                if (idx < currentIndex || idx > currentIndex + 1) return null;
                return (
                  <RestaurantSwipeCard
                    key={item.id}
                    item={item}
                    active={idx === currentIndex}
                    behind={idx === currentIndex + 1}
                    onSwipe={handleRestaurantSwipe}
                    onTap={() => handleTap(item)}
                    showHint={idx === 0 && currentIndex === 0}
                    drunk={isDrinksMode}
                  />
                );
              })
            ) : (
              menuItems.map((item, idx) => {
                if (idx < currentIndex || idx > currentIndex + 1) return null;
                return (
                  <MenuSwipeCard
                    key={item.id}
                    item={item}
                    active={idx === currentIndex}
                    behind={idx === currentIndex + 1}
                    onSwipe={handleMenuSwipe}
                    onTap={() => handleTap(item)}
                    showHint={idx === 0 && currentIndex === 0}
                    drunk={isDrinksMode}
                  />
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-20 flex flex-col gap-3">
        {currentIndex < items.length && (
          <div className="flex justify-center items-center gap-5">
            <button
              onClick={() => isRestaurantMode ? handleRestaurantSwipe("left") : handleMenuSwipe("left")}
              data-testid="button-nah"
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-gray-100 active:scale-[0.8] active:-rotate-12 transition-transform duration-200 gpu-accelerated"
              style={{ boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)" }}
            >
              <span className="text-2xl">👎</span>
            </button>

            <button
              onClick={() => isRestaurantMode ? handleRestaurantSwipe("up") : handleMenuSwipe("up")}
              data-testid="button-superlike"
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-amber-200 active:scale-[0.8] active:-translate-y-2 transition-transform duration-200 gpu-accelerated"
              style={{ boxShadow: "0 4px 20px -4px rgba(234,179,8,0.15)" }}
            >
              <span className="text-lg">⭐</span>
            </button>

            <button
              onClick={() => isRestaurantMode ? handleRestaurantSwipe("right") : handleMenuSwipe("right")}
              data-testid="button-yum"
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-green-100 active:scale-[0.8] active:rotate-12 transition-transform duration-200 gpu-accelerated"
              style={{ boxShadow: "0 4px 20px -4px rgba(0,200,100,0.1)" }}
            >
              <span className="text-2xl">😋</span>
            </button>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
