import { useMemo } from "react";
import { useLocation } from "wouter";
import { useRestaurants } from "@/hooks/use-restaurants";
import { LoadingMascot } from "@/components/LoadingMascot";
import { BottomNav } from "@/components/BottomNav";
import drunkToastImg from "@assets/drunk_toast_nobg.png";

export default function RestaurantList() {
  const [, navigate] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const category = params.get("category") || "Restaurants";
  const isBars = category === "Bars";
  const query = category === "Restaurants" ? undefined : category;

  const { data: restaurants = [], isLoading } = useRestaurants({ query });

  const title = useMemo(() => category, [category]);

  return (
    <div className="w-full min-h-[100dvh] bg-white" data-testid="restaurant-list-page">
      <div className="flex items-center gap-3 px-6 pt-14 pb-4 border-b border-gray-100/80">
        {isBars ? (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">Bars</h1>
            <div className="flex-1 relative h-7">
              <img
                src={drunkToastImg}
                alt="Drunk Toast mascot"
                className="h-[72px] w-[72px] object-contain absolute animate-drunk-stumble gpu-accelerated drop-shadow-sm"
                style={{ bottom: -6 }}
                data-testid="img-drunk-toast"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{restaurants.length} places</span>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-bold tracking-tight flex-1">{title}</h1>
            <span className="text-xs text-muted-foreground font-medium">{restaurants.length} places</span>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingMascot size="md" />
        </div>
      ) : (
        <div className="px-6 py-5 space-y-4">
          {restaurants.map((r, idx) => (
            <div
              key={r.id}
              className={`flex gap-4 bg-white rounded-2xl cursor-pointer active:scale-[0.98] transition-transform p-1 relative ${isBars ? "animate-drunk-sway" : ""}`}
              style={{
                boxShadow: "0 2px 12px -3px rgba(0,0,0,0.06)",
                ...(isBars ? { animationDelay: `${idx * -0.8}s` } : {}),
              }}
              onClick={() => navigate(`/restaurant/${r.id}`)}
              data-testid={`card-restaurant-${r.id}`}
            >
              {r.source && (
                <div
                  className="absolute -top-2 left-4 bg-gray-100 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground z-10"
                >
                  {r.source}
                </div>
              )}
              <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 relative">
                <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 py-2 pr-2">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-base truncate">{r.name}</h3>
                  <div className="flex items-center gap-0.5 ml-2">
                    <span className="text-[10px]">?</span>
                    <span className="text-sm font-semibold">{r.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">{r.category}</p>
                <div className="flex items-center gap-2 mt-2.5 text-xs text-muted-foreground">
                  <span className="font-medium">{"?".repeat(Math.max(1, r.priceLevel || 1))}</span>
                  <span>·</span>
                  <span className="truncate">?? {r.address}</span>
                </div>
                {r.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{r.description}</p>
                )}
              </div>
            </div>
          ))}
          {restaurants.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10">No restaurants found.</div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}