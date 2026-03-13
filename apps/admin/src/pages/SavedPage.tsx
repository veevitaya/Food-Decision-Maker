import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin, Trash2, Users, User, Star } from "lucide-react";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { BottomNav } from "@/components/BottomNav";
import type { Restaurant } from "@shared/schema";

type Tab = "mine" | "partner";

function SavedCard({
  restaurant,
  onUnsave,
  onNavigate,
}: {
  restaurant: Restaurant;
  onUnsave: () => void;
  onNavigate: () => void;
}) {
  const [removing, setRemoving] = useState(false);

  const handleUnsave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(onUnsave, 250);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: removing ? 0 : 1, x: removing ? 80 : 0, y: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onClick={onNavigate}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
    >
      <div className="flex">
        <div className="relative w-28 h-28 flex-shrink-0">
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          {restaurant.isNew && (
            <div className="absolute top-2 left-2 bg-white/95 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
              New
            </div>
          )}
        </div>
        <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-[15px] truncate">{restaurant.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{restaurant.category}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-medium flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {restaurant.rating}
              </span>
              <span className="text-xs text-muted-foreground">{"฿".repeat(restaurant.priceLevel)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {restaurant.address}
            </p>
          </div>
          <div className="flex justify-end mt-1">
            <button
              onClick={handleUnsave}
              className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors active:scale-90"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SavedPage() {
  const [, navigate] = useLocation();
  const { data, unsave } = useSavedRestaurants();
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [restaurants, setRestaurants] = useState<Record<number, Restaurant>>({});
  const [loading, setLoading] = useState(false);

  const allIds = [...new Set([...data.mine, ...data.partner])];

  // Fetch restaurant details for all saved IDs
  useEffect(() => {
    const missing = allIds.filter(id => !restaurants[id]);
    if (missing.length === 0) return;
    setLoading(true);
    Promise.all(
      missing.map(id =>
        fetch(`/api/restaurants/${id}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const map: Record<number, Restaurant> = { ...restaurants };
      results.forEach(r => {
        if (r && r.id) map[r.id] = r;
      });
      setRestaurants(map);
      setLoading(false);
    });
  }, [allIds.join(",")]);

  const tabIds = activeTab === "mine" ? data.mine : data.partner;
  const tabItems = tabIds.map(id => restaurants[id]).filter(Boolean) as Restaurant[];
  const totalSaved = data.mine.length + data.partner.length;

  return (
    <div className="w-full min-h-[100dvh] bg-[hsl(30,20%,97%)] flex flex-col pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">Saved</h1>
            <p className="text-xs text-muted-foreground">
              {totalSaved === 0 ? "Nothing saved yet" : `${totalSaved} place${totalSaved !== 1 ? "s" : ""} saved`}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("mine")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
              activeTab === "mine"
                ? "bg-foreground text-white"
                : "bg-gray-100 text-muted-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Mine {data.mine.length > 0 && `(${data.mine.length})`}
          </button>
          <button
            onClick={() => setActiveTab("partner")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
              activeTab === "partner"
                ? "bg-foreground text-white"
                : "bg-gray-100 text-muted-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Partner {data.partner.length > 0 && `(${data.partner.length})`}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-5">
        {loading && tabItems.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" />
          </div>
        ) : tabIds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <span className="text-5xl mb-4">{activeTab === "mine" ? "🍽️" : "💑"}</span>
            <h2 className="text-lg font-bold mb-2">
              {activeTab === "mine" ? "Nothing saved yet" : "No partner saves"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              {activeTab === "mine"
                ? "Swipe right on a restaurant and tap the bookmark to save it here."
                : "Restaurants saved to your partner bucket will appear here."}
            </p>
            <button
              onClick={() => navigate("/swipe")}
              className="px-6 py-3 rounded-2xl bg-[#FFCC02] text-[#2d2000] font-bold text-sm active:scale-[0.97] transition-transform"
              style={{ boxShadow: "0 4px 15px rgba(255,204,2,0.25)" }}
            >
              Start Swiping
            </button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {tabItems.map(r => (
                <SavedCard
                  key={r.id}
                  restaurant={r}
                  onUnsave={() => unsave(r.id)}
                  onNavigate={() => navigate(`/restaurant/${r.id}`)}
                />
              ))}
              {/* Loading placeholders for not-yet-fetched IDs */}
              {tabIds
                .filter(id => !restaurants[id])
                .map(id => (
                  <div
                    key={id}
                    className="bg-white rounded-2xl h-28 border border-gray-100 animate-pulse"
                  />
                ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
