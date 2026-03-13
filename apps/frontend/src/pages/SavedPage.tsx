import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Heart, MapPin } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";

type RestaurantCard = {
  id: number;
  name: string;
  imageUrl: string;
  category: string;
  rating: string;
  address: string;
  priceLevel: number;
};

export default function SavedPage() {
  const [, navigate] = useLocation();
  const { data } = useSavedRestaurants();

  const savedIds = useMemo(() => [...new Set([...data.mine, ...data.partner])], [data.mine, data.partner]);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["/api/saved/restaurants", savedIds],
    enabled: savedIds.length > 0,
    queryFn: async () => {
      const items = await Promise.all(
        savedIds.map(async (id) => {
          const res = await fetch(`/api/restaurants/${id}`, { credentials: "include" });
          if (!res.ok) return null;
          return (await res.json()) as RestaurantCard;
        }),
      );
      return items.filter(Boolean) as RestaurantCard[];
    },
  });

  return (
    <div className="w-full min-h-[100dvh] bg-[hsl(30,20%,97%)] pb-24" data-testid="saved-page">
      <div className="px-6 pt-12 pb-4">
        <h1 className="text-[26px] font-bold tracking-tight">Saved</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {savedIds.length} restaurant{savedIds.length !== 1 ? "s" : ""} in your list
        </p>
      </div>

      <div className="px-6 space-y-3">
        {isLoading && (
          <div className="rounded-2xl bg-white border border-gray-100 p-5 text-sm text-muted-foreground">Loading saved places...</div>
        )}

        {!isLoading && restaurants.length === 0 && (
          <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center">
            <Heart className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-semibold">No saved places yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tap the heart on any restaurant to save it for later.</p>
          </div>
        )}

        {restaurants.map((restaurant) => (
          <button
            key={restaurant.id}
            onClick={() => navigate(`/restaurant/${restaurant.id}`)}
            className="w-full text-left rounded-2xl overflow-hidden bg-white border border-gray-100"
            style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}
            data-testid={`saved-card-${restaurant.id}`}
          >
            <div className="flex">
              <img src={restaurant.imageUrl} alt={restaurant.name} className="w-24 h-24 object-cover" />
              <div className="p-3 min-w-0 flex-1">
                <p className="font-semibold truncate">{restaurant.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{restaurant.category}</p>
                <p className="text-xs mt-1">{"฿".repeat(restaurant.priceLevel)} · ★ {restaurant.rating}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {restaurant.address}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
