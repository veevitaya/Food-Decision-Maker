import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";

type RestaurantEntry = {
  id: number;
  name: string;
  imageUrl: string;
  address: string;
  rating: string;
  priceLevel: number;
  distanceMeters: number | null;
};

type MenuRestaurantsResponse = {
  menuItemId: number;
  menuName: string;
  menuImageUrl: string | null;
  restaurants: RestaurantEntry[];
};

export default function GroupMenuRestaurants() {
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionCode = (params.get("session") || "").toUpperCase();
  const menuItemId = Number(params.get("menuItem") || "");

  const { data, isLoading } = useQuery<MenuRestaurantsResponse>({
    queryKey: ["/api/group/menu-restaurants", sessionCode, menuItemId],
    enabled: Boolean(sessionCode) && Number.isFinite(menuItemId),
    queryFn: async () => {
      const BANGKOK = { lat: 13.7563, lng: 100.5018 };
      const coords = await new Promise<{ lat: number; lng: number }>((resolve) => {
        if (!navigator.geolocation) return resolve(BANGKOK);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(BANGKOK),
          { timeout: 2000 },
        );
      });

      const res = await fetch(
        `/api/group/${sessionCode}/menu/${menuItemId}/restaurants?lat=${coords.lat}&lng=${coords.lng}&radius=5000`,
      );
      if (!res.ok) throw new Error("Failed to load restaurants for menu");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="w-full h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" /></div>;
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[hsl(30,20%,97%)] pb-24 px-6 pt-12" data-testid="group-menu-restaurants-page">
      <h1 className="text-[26px] font-bold tracking-tight">{data?.menuName || "Dish Matches"}</h1>
      <p className="text-sm text-muted-foreground mt-1">Restaurants nearby serving this dish</p>

      <div className="mt-5 space-y-3">
        {(data?.restaurants ?? []).map((entry) => (
          <button
            key={entry.id}
            onClick={() => navigate(`/restaurant/${entry.id}`)}
            className="w-full rounded-2xl bg-white border border-gray-100 p-3 flex gap-3 text-left"
            data-testid={`menu-restaurant-${entry.id}`}
          >
            <img src={entry.imageUrl || ""} alt={entry.name} className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{entry.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.address}</p>
              <p className="text-xs mt-1">
                {entry.distanceMeters != null ? `${Math.round(entry.distanceMeters)}m` : ""}
                {entry.distanceMeters != null ? " • " : ""}
                {"฿".repeat(entry.priceLevel || 2)}
                {" • "}
                {entry.rating}
              </p>
            </div>
          </button>
        ))}
      </div>

      {(data?.restaurants ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground mt-6">No nearby restaurants found for this dish yet.</p>
      ) : null}

      <BottomNav />
    </div>
  );
}
