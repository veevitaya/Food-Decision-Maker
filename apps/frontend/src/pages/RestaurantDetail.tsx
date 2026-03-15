import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RestaurantResponse } from "@shared/routes";
import type { Menu } from "@shared/schema";
import { LoadingMascot } from "@/components/LoadingMascot";
import { trackEvent } from "@/lib/analytics";
import { BottomNav } from "@/components/BottomNav";
import { SaveBucketPicker } from "@/components/SaveBucketPicker";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";
import { RestaurantCampaignBanner } from "@/components/CampaignBanner";
import { PublicBannerSlot } from "@/components/PublicBannerSlot";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import noodsPhoto1 from "@assets/IMG_9279_1772025468067.jpeg";
import noodsPhoto2 from "@assets/IMG_9280_1772025468067.jpeg";
import noodsPhoto3 from "@assets/IMG_9281_1772025468067.jpeg";

const RESTAURANT_PHOTOS: Record<number, string[]> = {
  224: [noodsPhoto1, noodsPhoto2, noodsPhoto3],
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-xs ${star <= rating ? "text-foreground" : "text-gray-200"}`}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function RestaurantDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/restaurant/:id");
  const id = params?.id ? parseInt(params.id) : null;
  const searchParams = new URLSearchParams(window.location.search);
  const recommendationSource = searchParams.get("recSource") ?? "unknown";
  const recommendationVariant = searchParams.get("recVariant") ?? "unknown";
  const recommendationExperimentKey = searchParams.get("recExp") ?? "unknown";
  const [activePhoto, setActivePhoto] = useState(0);
  const [showHours, setShowHours] = useState(false);
  const [showSavePicker, setShowSavePicker] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showDeliveryDrawer, setShowDeliveryDrawer] = useState(false);
  const { isSaved, getBucket } = useSavedRestaurants();
  const { isEnabled } = useFeatureFlags();
  const goBack = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  }, [navigate]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (id) trackEvent("view_detail", { restaurantId: id });
  }, [id]);

  const { data: apiRestaurant, isLoading, isError } = useQuery<RestaurantResponse>({
    queryKey: ["/api/restaurants", id],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  const { data: menuItems = [] } = useQuery<Menu[]>({
    queryKey: ["/api/restaurants", id, "menus"],
    queryFn: async () => {
      const res = await fetch(`/api/restaurants/${id}/menus`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!menuItems.length || !id) return;
    for (const item of menuItems.filter((m) => m.isActive)) {
      trackEvent("view_menu_item", { restaurantId: id, menuItemId: item.id, metadata: { name: item.name } });
    }
  }, [menuItems, id]);

  const restaurant = apiRestaurant;

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
        <span className="text-4xl">😕</span>
        <p className="text-muted-foreground">Restaurant not found</p>
        <button
          onClick={goBack}
          className="px-6 py-3 rounded-full bg-foreground text-white font-bold text-sm active:scale-[0.95] transition-transform duration-200"
        >
          Go back
        </button>
      </div>
    );
  }

  const customPhotos = RESTAURANT_PHOTOS[restaurant.id];
  const extraApiPhotos = restaurant.photos?.filter((photo) => photo && photo !== restaurant.imageUrl) ?? [];
  const allPhotos = customPhotos
    ? [customPhotos[0], ...customPhotos.slice(1)]
    : [restaurant.imageUrl, ...extraApiPhotos].filter(Boolean);
  const openingHours = restaurant.openingHours?.length ? restaurant.openingHours : [];
  const reviews = restaurant.reviews?.length
    ? restaurant.reviews.map((review) => ({
        ...review,
        avatar: review.author.charAt(0).toUpperCase() || "•",
      }))
    : [];
  const phone = restaurant.phone || "Not provided";

  const DELIVERY_APPS = [
    { id: "grab", name: "Grab", emoji: "🟢", color: "#00B14F", deepLink: (name: string) => `grab://food/search?q=${encodeURIComponent(name)}`, fallback: (name: string) => `https://food.grab.com/th/en/restaurants?search=${encodeURIComponent(name)}` },
    { id: "lineman", name: "LINE MAN", emoji: "🟩", color: "#00C300", deepLink: (name: string) => `lineman://food/search?q=${encodeURIComponent(name)}`, fallback: (name: string) => `https://lineman.line.me/restaurant/search?q=${encodeURIComponent(name)}` },
    { id: "robinhood", name: "Robinhood", emoji: "🟣", color: "#6C2BD9", deepLink: (name: string) => `robinhood://food/search?q=${encodeURIComponent(name)}`, fallback: (name: string) => `https://robfrnd.app/food?search=${encodeURIComponent(name)}` },
  ];

  const handleDeliverySelect = (platform: typeof DELIVERY_APPS[0]) => {
    trackEvent("delivery_click", {
      restaurantId: restaurant.id,
      metadata: {
        platform: platform.id,
        restaurantName: restaurant.name,
        recommendation_source: recommendationSource,
        recommendation_variant: recommendationVariant,
        recommendation_experiment_key: recommendationExperimentKey,
      },
    });

    const deepLink = platform.deepLink(restaurant.name);
    const fallback = platform.fallback(restaurant.name);

    const newWindow = window.open("", "_blank");

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = deepLink;
    document.body.appendChild(iframe);

    setTimeout(() => {
      document.body.removeChild(iframe);
      if (newWindow && !newWindow.closed) {
        newWindow.location.href = fallback;
      }
    }, 1500);

    setShowDeliveryDrawer(false);
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayHours = openingHours.find((h) => h.day === today);

  return (
    <div className="w-full min-h-[100dvh] bg-white pb-40" data-testid="restaurant-detail-page">
      <div className="relative w-full h-72 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          onScroll={() => {
            if (scrollRef.current) {
              const scrollLeft = scrollRef.current.scrollLeft;
              const width = scrollRef.current.clientWidth;
              const idx = Math.round(scrollLeft / width);
              if (idx !== activePhoto) setActivePhoto(idx);
            }
          }}
        >
          {allPhotos.map((photo, idx) => (
            <div key={idx} className="w-full h-full flex-shrink-0 snap-center">
              <img
                src={photo}
                alt={`${restaurant.name} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />

        <button
          onClick={goBack}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center z-10 active:scale-[0.90] transition-transform duration-150"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
          data-testid="button-back-hero"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div className="absolute top-4 right-4 flex items-center gap-2.5 z-10">
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-white text-[10px] font-semibold">{activePhoto + 1}/{allPhotos.length}</span>
          </div>

          <button
            onClick={async () => {
              const url = window.location.href;
              if (navigator.share) {
                try {
                  await navigator.share({ title: restaurant.name, url });
                } catch {}
              } else {
                await navigator.clipboard.writeText(url);
              }
            }}
            className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-sm active:scale-[0.85] transition-transform duration-150"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            data-testid="button-share"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>

          <button
            ref={saveButtonRef}
            onClick={() => setShowSavePicker(true)}
            className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-sm active:scale-[0.85] transition-transform duration-150"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            data-testid="button-save"
          >
            <span className={restaurant && isSaved(restaurant.id) ? "inline-block" : ""}>
              {restaurant && isSaved(restaurant.id)
                ? (getBucket(restaurant.id) === "partner" ? "💕" : "❤️")
                : "🤍"}
            </span>
          </button>
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
          {allPhotos.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === activePhoto ? "bg-white w-5" : "bg-white/50 w-1.5"}`}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pt-5">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-bold" data-testid="text-restaurant-name">{restaurant.name}</h1>
          <div className="flex items-center gap-1 bg-white border border-gray-100 px-3 py-1.5 rounded-full" style={{ boxShadow: "var(--shadow-sm)" }}>
            <span className="text-xs">★</span>
            <span className="font-bold text-sm">{restaurant.rating}</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm mb-3">{restaurant.category}</p>

        <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
          <span>📍 {restaurant.address}</span>
          <span>{"฿".repeat(restaurant.priceLevel)}</span>
        </div>

        <div className="mb-6" data-testid="text-description">
          <p className={`text-sm leading-relaxed text-foreground/80 ${!showFullDescription ? "line-clamp-3" : ""}`}>
            {restaurant.description}
          </p>
          {restaurant.description && restaurant.description.length > 120 && !showFullDescription && (
            <button
              onClick={() => setShowFullDescription(true)}
              className="text-sm font-semibold text-foreground mt-1 underline underline-offset-2"
              data-testid="button-show-more"
            >
              Show more
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-4 hide-scrollbar -mx-6 px-6">
          {allPhotos.slice(1).map((photo, idx) => (
            <div
              key={idx}
              onClick={() => setActivePhoto(idx + 1)}
              className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer active:scale-[0.95] transition-transform duration-200"
              data-testid={`photo-thumb-${idx}`}
            >
              <img src={photo} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <RestaurantCampaignBanner restaurantId={restaurant.id} />
        <PublicBannerSlot position="detail_bottom" className="mb-6" />

        <div className="border-t border-gray-100/80 pt-5 mb-5">
          <button
            onClick={() => setShowHours(!showHours)}
            className="w-full flex items-center justify-between py-2"
            data-testid="button-toggle-hours"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🕐</span>
              <div className="text-left">
                <p className="font-bold text-sm">Opening Hours</p>
                <p className="text-xs text-green-600 font-medium">
                  Open now · {todayHours?.hours || "Hours unavailable"}
                </p>
              </div>
            </div>
            <span className={`text-muted-foreground text-xs transition-transform duration-300 inline-block ${showHours ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          <AnimatePresence>
            {showHours && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
                className="overflow-hidden"
              >
                <div className="py-2 space-y-2">
                  {openingHours.length > 0 ? (
                    openingHours.map((h) => (
                      <div key={h.day} className={`flex justify-between text-sm px-9 ${h.day === today ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                        <span>{h.day}</span>
                        <span>{h.hours}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground px-9">No opening hours available.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 py-3 border-t border-gray-100/80 mb-5">
          <span className="text-lg">📞</span>
          <div>
            <p className="font-bold text-sm">Phone</p>
            <p className="text-sm text-muted-foreground">{phone}</p>
          </div>
        </div>

        {menuItems.filter((m) => m.isActive).length > 0 && (
          <div className="border-t border-gray-100/80 pt-5 mb-6">
            <h2 className="font-bold text-lg mb-4">Menu</h2>
            <div className="space-y-3">
              {menuItems.filter((m) => m.isActive).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    trackEvent("click_menu_item", { restaurantId: restaurant.id, menuItemId: item.id, metadata: { name: item.name } });
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-left transition-colors"
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>}
                    {item.priceApprox && <p className="text-xs font-medium text-foreground/70 mt-1">~฿{item.priceApprox}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100/80 pt-5 mb-6">
          <h2 className="font-bold text-lg mb-4">Reviews</h2>
          <div className="space-y-5">
            {reviews.length > 0 ? (
              reviews.map((review, idx) => (
                <div
                  key={idx}
                  className="flex gap-3"
                  data-testid={`review-${idx}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center text-lg flex-shrink-0">
                    {review.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{review.author}</span>
                      <span className="text-xs text-muted-foreground">{review.timeAgo}</span>
                    </div>
                    <StarRating rating={review.rating} />
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{review.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No reviews available yet.</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100/80 pt-5 mb-6">
          <h2 className="font-bold text-lg mb-3">Location</h2>
          <div className="w-full h-40 rounded-2xl overflow-hidden border border-gray-100">
            <iframe
              title="Restaurant location"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(restaurant.lng) - 0.005}%2C${Number(restaurant.lat) - 0.003}%2C${Number(restaurant.lng) + 0.005}%2C${Number(restaurant.lat) + 0.003}&layer=mapnik&marker=${restaurant.lat}%2C${restaurant.lng}`}
              loading="lazy"
              className="w-full h-full border-0"
              style={{ filter: "saturate(0.9) contrast(0.92) brightness(1.05)" }}
            />
          </div>
        </div>
      </div>

      <div className="fixed left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100/80 px-6 py-3 z-50 flex gap-3" style={{ bottom: "calc(52px + max(env(safe-area-inset-bottom, 0px), 16px))" }}>
        {isEnabled("delivery_links") && (
          <button
            onClick={() => setShowDeliveryDrawer(true)}
            data-testid="button-order-delivery"
            className="flex-1 py-3.5 rounded-full bg-foreground text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-200"
            style={{ boxShadow: "0 4px 15px -3px rgba(0,0,0,0.2)" }}
          >
            🛵 Order Delivery
          </button>
        )}
        <button
          onClick={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`;
            window.open(url, "_blank");
          }}
          data-testid="button-directions"
          className="py-3.5 px-6 rounded-full bg-gray-100 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-200"
        >
          🗺️ Go
        </button>
      </div>

      <AnimatePresence>
        {showDeliveryDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 z-[60]"
              onClick={() => setShowDeliveryDrawer(false)}
              data-testid="delivery-drawer-overlay"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 right-0 bottom-0 z-[61] bg-white rounded-t-3xl px-6 pt-5 pb-8"
              style={{ boxShadow: "0 -8px 30px rgba(0,0,0,0.12)" }}
              data-testid="delivery-drawer"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <p className="text-base font-bold text-foreground mb-1">Order Delivery</p>
              <p className="text-xs text-muted-foreground mb-5">Choose your preferred delivery app</p>
              <div className="space-y-2.5">
                {DELIVERY_APPS.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleDeliverySelect(app)}
                    data-testid={`button-delivery-${app.id}`}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 active:scale-[0.98] transition-all duration-150 hover:bg-gray-50"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${app.color}15` }}>
                      {app.emoji}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-foreground">{app.name}</p>
                      <p className="text-[11px] text-muted-foreground">Open in {app.name} app</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />

      {restaurant && (
        <SaveBucketPicker
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          open={showSavePicker}
          onClose={() => setShowSavePicker(false)}
          anchorRef={saveButtonRef}
        />
      )}
    </div>
  );
}
