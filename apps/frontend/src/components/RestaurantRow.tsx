import { useRef, useState } from "react";

import { useLocation } from "wouter";
import type { RestaurantResponse } from "@shared/routes";
import { LoadingMascot } from "./LoadingMascot";
import { SaveBucketPicker } from "./SaveBucketPicker";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";

interface RestaurantRowProps {
  title: string;
  subtitle?: string;
  restaurants: RestaurantResponse[];
  isLoading: boolean;
  size?: "default" | "large" | "xl";
  category?: string;
}

function HeartButton({ restaurantId, restaurantName }: { restaurantId: number; restaurantName: string }) {
  const { isSaved, getBucket } = useSavedRestaurants();
  const [showPicker, setShowPicker] = useState(false);
  const saved = isSaved(restaurantId);
  const bucket = getBucket(restaurantId);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPicker(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className="absolute top-2.5 right-2.5 text-lg drop-shadow-md active:scale-[0.85] transition-transform duration-150"
        onClick={toggle}
        data-testid={`button-save-${restaurantId}`}
        aria-label={saved ? "Unsave restaurant" : "Save restaurant"}
      >
        <span className={saved ? (bucket === "partner" ? "text-pink-400" : "text-red-500") : "text-white/80"}>
          {saved ? (bucket === "partner" ? "💕" : "♥") : "♡"}
        </span>
      </button>
      <SaveBucketPicker
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        open={showPicker}
        onClose={() => setShowPicker(false)}
        anchorRef={buttonRef}
      />
    </>
  );
}

export function RestaurantRow({ title, subtitle, restaurants, isLoading, size = "default", category }: RestaurantRowProps) {
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="w-full h-48 flex justify-center items-center">
        <LoadingMascot size="sm" />
      </div>
    );
  }

  if (restaurants.length === 0) return null;

  const cardWidth = size === "xl" ? "w-64" : size === "large" ? "w-56" : "w-40";
  const imageHeight = size === "xl" ? "h-52" : size === "large" ? "h-44" : "h-32";

  const handleShowAll = () => {
    const cat = category || title;
    navigate(`/restaurants?category=${encodeURIComponent(cat)}`);
  };

  return (
    <div className="mt-7 mb-2" data-testid={`restaurant-row-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="px-6 mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-[17px] font-bold text-foreground tracking-tight">{title}</h3>
          {subtitle && <p className="text-muted-foreground text-xs mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={handleShowAll}
          className="text-muted-foreground text-sm font-medium hover:text-foreground active:scale-95 transition-all duration-150"
          data-testid={`button-show-all-${title.toLowerCase().replace(/\s/g, '-')}`}
        >
          Show all
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3.5 pb-4 snap-x snap-mandatory hide-scrollbar"
        data-testid={`scroll-row-${title.toLowerCase().replace(/\s/g, '-')}`}
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollPaddingLeft: "24px",
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 w-[10px]" aria-hidden="true" />
        {restaurants.map((rest, idx) => (
          <div
            key={rest.id}
            className={`flex-shrink-0 ${cardWidth} snap-start group cursor-pointer gpu-accelerated`}
            onClick={() => navigate(`/restaurant/${rest.id}`)}
            data-testid={`card-restaurant-${rest.id}`}
          >
            <div
              className={`w-full ${imageHeight} rounded-2xl overflow-hidden relative active:scale-[0.97] transition-transform duration-200`}
            >
              <img
                src={rest.imageUrl}
                alt={rest.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              {rest.isNew && (
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                >
                  New
                </div>
              )}
              <HeartButton restaurantId={rest.id} restaurantName={rest.name} />
            </div>
            <div className="mt-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm truncate flex-1">{rest.name}</h4>
                <div className="flex items-center gap-0.5 ml-2">
                  <span className="text-[10px]">★</span>
                  <span className="text-xs font-medium">{rest.rating}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{rest.category}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{"฿".repeat(rest.priceLevel)} · {rest.address}</p>
            </div>
          </div>
        ))}
        <div className="flex-shrink-0 w-[2px]" aria-hidden="true" />
      </div>
    </div>
  );
}
