import { useMemo, useState } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useLocation } from "wouter";
import { useTasteProfile } from "@/hooks/use-taste-profile";
import { useRestaurants } from "@/hooks/use-restaurants";
import { useUserLocation } from "@/hooks/use-user-location";
import { sendInvite, isLiffAvailable, initLiff } from "@/lib/liff";
import { BottomNav } from "@/components/BottomNav";
import type { RestaurantResponse } from "@shared/routes";

function SwipeCard({
  item,
  active,
  behind,
  onSwipe,
  onTap,
}: {
  item: RestaurantResponse;
  active: boolean;
  behind: boolean;
  onSwipe: (dir: "left" | "right" | "up") => void;
  onTap: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -100 && Math.abs(info.offset.x) < 80) onSwipe("up");
    else if (info.offset.x > 120) onSwipe("right");
    else if (info.offset.x < -120) onSwipe("left");
  };

  if (!active && !behind) return null;

  return (
    <motion.div
      style={{ x: active ? x : 0, y: active ? y : 0, rotate: active ? rotate : 0, zIndex: active ? 10 : 5 }}
      initial={behind ? { scale: 0.96, y: 8 } : { scale: 1, y: 0 }}
      animate={behind ? { scale: 0.96, y: 8, opacity: 0.7 } : { scale: 1, y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      drag={active}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      onClick={onTap}
      className="absolute inset-0 bg-white rounded-[28px] overflow-hidden select-none"
      data-testid={`swipe-card-${item.id}`}
    >
      <div className="relative w-full h-[70%]">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-4">
          <h2 className="text-white text-[28px] font-semibold mb-1 drop-shadow-lg">{item.name}</h2>
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <span>{item.category}</span>
            <span>�</span>
            <span>{"?".repeat(Math.max(1, item.priceLevel || 1))}</span>
            <span>�</span>
            <span>? {item.rating}</span>
          </div>
        </div>
      </div>

      <div className="p-5 pt-4 flex flex-col h-[30%]">
        <p className="text-foreground/60 text-sm leading-relaxed flex-1 line-clamp-3">{item.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">?? {item.address}</span>
          <p className="text-xs text-[#D4A800] font-semibold">Tap to view details ?</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function SwipePage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "all";
  const userLocation = useUserLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const { recordSwipe } = useTasteProfile();

  const { data: restaurants = [], isError } = useRestaurants({
    mode,
    lat: userLocation.lat,
    lng: userLocation.lng,
    radius: 5000,
    limit: 30,
    localOnly: true,
    sourcePreference: "osm-first",
  });
  const items = useMemo(() => restaurants.slice(0, 30), [restaurants]);

  const modeLabels: Record<string, string> = {
    all: "Swipe Mode",
    cheap: "Budget Eats",
    nearby: "Near You",
    trending: "Trending Now",
    hot: "Hot Right Now",
    late: "Late Night",
    outdoor: "Outdoor Dining",
    saved: "Your Saved",
    partner: "With Partner",
    healthy: "Healthy Eats",
    spicy: "Spicy Picks",
    sweets: "Sweet Tooth",
    coffee: "Cafe Vibes",
    fancy: "Fine Dining",
    delivery: "Delivery Mode",
  };

  const handleSwipe = (dir: "left" | "right" | "up") => {
    const item = items[currentIndex];
    if (!item) return;

    if (dir === "right") recordSwipe(item.name, "like");
    else if (dir === "up") recordSwipe(item.name, "superlike");
    else recordSwipe(item.name, "dislike");

    if (dir === "right" || dir === "up") setLikedCount((c) => c + 1);
    setTimeout(() => setCurrentIndex((i) => i + 1), 180);
  };

  return (
    <div className="w-full h-[100dvh] bg-[hsl(30,20%,97%)] flex flex-col overflow-hidden" data-testid="swipe-page">
      <div className="flex items-center justify-between px-6 pt-12 pb-3">
        <div className="text-left">
          <h1 className="font-semibold text-[15px]">{modeLabels[mode] || "Swipe Mode"}</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Live results</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const modeLabel = modeLabels[mode] || "food";
              const fallback = () => {
                const text = encodeURIComponent(`Join me on Toast!\n\nLet's decide what to eat together. I'm swiping ${modeLabel} right now!\n\n${window.location.origin}/swipe?mode=${mode}`);
                window.open(`https://line.me/R/msg/text/?${text}`, "_blank");
              };
              if (isLiffAvailable()) {
                await initLiff();
                const sent = await sendInvite(mode);
                if (!sent) fallback();
              } else {
                fallback();
              }
            }}
            className="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center text-white text-sm"
            data-testid="button-invite-line"
            aria-label="Invite via LINE"
          >
            LINE
          </button>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground">
            <span>{Math.min(currentIndex + 1, items.length)}</span>
            <span className="text-gray-300">/</span>
            <span>{items.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative px-5 pb-4">
        {isError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-semibold mb-2">Could not load items</h2>
            <p className="text-muted-foreground mb-6 text-sm">Please try again in a moment.</p>
            <button onClick={() => navigate("/")} className="px-6 py-3 rounded-full bg-foreground text-white font-bold text-sm">Home</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-semibold mb-2">No items yet</h2>
            <p className="text-muted-foreground mb-6 text-sm">Try another mode or location.</p>
            <button onClick={() => navigate("/")} className="px-6 py-3 rounded-full bg-foreground text-white font-bold text-sm">Home</button>
          </div>
        ) : currentIndex >= items.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-semibold mb-2">All done!</h2>
            <p className="text-muted-foreground mb-2 text-sm">You liked {likedCount} out of {items.length} options</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setCurrentIndex(0); setLikedCount(0); }} className="px-6 py-3.5 rounded-full bg-foreground text-white font-bold text-sm">Start Over</button>
              <button onClick={() => navigate("/")} className="px-6 py-3.5 rounded-full bg-white border-2 border-gray-200 font-bold text-sm">Home</button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full max-w-sm mx-auto">
            {items.map((item, idx) => {
              if (idx < currentIndex || idx > currentIndex + 1) return null;
              return (
                <SwipeCard
                  key={item.id}
                  item={item}
                  active={idx === currentIndex}
                  behind={idx === currentIndex + 1}
                  onSwipe={handleSwipe}
                  onTap={() => navigate(`/restaurant/${item.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 pb-3 flex flex-col gap-3">
        {currentIndex < items.length && items.length > 0 && (
          <div className="flex justify-center items-center gap-5">
            <button onClick={() => handleSwipe("left")} data-testid="button-nah" className="w-16 h-16 rounded-full bg-white border-2 border-gray-100">??</button>
            <button onClick={() => handleSwipe("up")} data-testid="button-superlike" className="w-12 h-12 rounded-full bg-white border-2 border-amber-200">?</button>
            <button onClick={() => handleSwipe("right")} data-testid="button-yum" className="w-16 h-16 rounded-full bg-white border-2 border-green-100">??</button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
