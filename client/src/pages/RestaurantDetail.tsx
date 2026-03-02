import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RestaurantResponse } from "@shared/routes";
import { LoadingMascot } from "@/components/LoadingMascot";
import { BottomNav } from "@/components/BottomNav";
import { SaveBucketPicker } from "@/components/SaveBucketPicker";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";

export default function RestaurantDetail() {
  const [, params] = useRoute("/restaurant/:id");
  const id = params?.id ? parseInt(params.id, 10) : null;
  const [activePhoto, setActivePhoto] = useState(0);
  const [showHours, setShowHours] = useState(false);
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { isSaved, getBucket } = useSavedRestaurants();
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const { data: restaurant, isLoading, isError } = useQuery<RestaurantResponse>({
    queryKey: ["/api/restaurants", id],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  const allPhotos = useMemo(() => {
    if (!restaurant) return [];
    if (restaurant.photos && restaurant.photos.length > 0) return restaurant.photos;
    return [restaurant.imageUrl];
  }, [restaurant]);

  const openingHours = restaurant?.openingHours ?? [];
  const reviews = restaurant?.reviews ?? [];

  if (isLoading) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-white">
        <LoadingMascot size="lg" />
      </div>
    );
  }

  if (!restaurant || isError) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-white gap-4">
        <span className="text-4xl">Not found</span>
        <p className="text-muted-foreground">Restaurant not found</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 rounded-full bg-foreground text-white font-bold text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-white pb-40" data-testid="restaurant-detail-page">
      <div className="relative w-full h-72 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          onScroll={() => {
            if (!scrollRef.current) return;
            const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
            if (idx !== activePhoto) setActivePhoto(idx);
          }}
        >
          {allPhotos.map((photo, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center">
              <img src={photo} alt={`${restaurant.name} ${idx + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center z-10"
          data-testid="button-back-hero"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div className="absolute top-4 right-4 flex items-center gap-2.5 z-10">
          <div className="bg-black/40 rounded-full px-2.5 py-1">
            <span className="text-white text-[10px] font-semibold">{activePhoto + 1}/{allPhotos.length}</span>
          </div>
          <button
            ref={saveButtonRef}
            onClick={() => setShowSavePicker(true)}
            className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-sm"
            data-testid="button-save"
          >
            {isSaved(restaurant.id) ? (getBucket(restaurant.id) === "partner" ? "saved+" : "saved") : "save"}
          </button>
        </div>
      </div>

      <div className="px-6 pt-5">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-bold" data-testid="text-restaurant-name">{restaurant.name}</h1>
          <div className="flex items-center gap-1 bg-white border border-gray-100 px-3 py-1.5 rounded-full">
            <span className="text-xs">*</span>
            <span className="font-bold text-sm">{restaurant.rating}</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-3">{restaurant.category}</p>

        <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
          <span>{restaurant.address}</span>
          <span>{"$".repeat(Math.max(1, restaurant.priceLevel || 1))}</span>
          {restaurant.source && <span className="uppercase text-xs">{restaurant.source}</span>}
        </div>

        <div className="mb-6" data-testid="text-description">
          <p className={`text-sm leading-relaxed text-foreground/80 ${!showFullDescription ? "line-clamp-3" : ""}`}>
            {restaurant.description}
          </p>
          {restaurant.description && restaurant.description.length > 120 && !showFullDescription && (
            <button onClick={() => setShowFullDescription(true)} className="text-sm font-semibold text-foreground mt-1 underline underline-offset-2">
              Show more
            </button>
          )}
        </div>

        <div className="border-t border-gray-100/80 pt-5 mb-5">
          <button onClick={() => setShowHours(!showHours)} className="w-full flex items-center justify-between py-2" data-testid="button-toggle-hours">
            <div className="text-left">
              <p className="font-bold text-sm">Opening Hours</p>
              <p className="text-xs text-muted-foreground font-medium">{openingHours.length > 0 ? "Available" : "Not available yet"}</p>
            </div>
            <span className={`text-muted-foreground text-xs transition-transform duration-300 inline-block ${showHours ? "rotate-180" : ""}`}>v</span>
          </button>

          <AnimatePresence>
            {showHours && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                {openingHours.length > 0 ? (
                  <div className="py-2 space-y-2">
                    {openingHours.map((h) => (
                      <div key={`${h.day}-${h.hours}`} className="flex justify-between text-sm text-muted-foreground">
                        <span>{h.day}</span>
                        <span>{h.hours}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-2 text-sm text-muted-foreground">Opening hour data is not provided by the current place API response.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-gray-100/80 pt-5 mb-6">
          <h2 className="font-bold text-lg mb-2">Phone</h2>
          <p className="text-sm text-muted-foreground">{restaurant.phone || "Not available"}</p>
        </div>

        <div className="border-t border-gray-100/80 pt-5 mb-6">
          <h2 className="font-bold text-lg mb-4">Reviews</h2>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review, idx) => (
                <div key={`${review.author}-${idx}`} className="rounded-xl border border-gray-100 p-3" data-testid={`review-${idx}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{review.author}</p>
                    <p className="text-xs text-muted-foreground">{review.timeAgo || ""}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Rating: {review.rating}/5</p>
                  <p className="text-sm text-muted-foreground mt-2">{review.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Review data is not provided by the current place API response.</p>
          )}
        </div>
      </div>

      <div className="fixed left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100/80 px-6 py-3 z-50 flex gap-3" style={{ bottom: "calc(52px + max(env(safe-area-inset-bottom, 0px), 16px))" }}>
        <button
          onClick={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;
            window.open(url, "_blank");
          }}
          data-testid="button-directions"
          className="flex-1 py-3.5 rounded-full bg-gray-100 font-bold text-sm"
        >
          Maps Directions
        </button>
      </div>

      <BottomNav />

      <SaveBucketPicker
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        open={showSavePicker}
        onClose={() => setShowSavePicker(false)}
        anchorRef={saveButtonRef}
      />
    </div>
  );
}
