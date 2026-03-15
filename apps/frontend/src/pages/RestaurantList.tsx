import { useLocation } from "wouter";
import { useRestaurants } from "@/hooks/use-restaurants";
import { LoadingMascot } from "@/components/LoadingMascot";
import { BottomNav } from "@/components/BottomNav";
import drunkToastImg from "@assets/drunk_toast_nobg.png";


export default function RestaurantList() {
  const [, navigate] = useLocation();
  const { data: apiRestaurants = [], isLoading } = useRestaurants();

  const params = new URLSearchParams(window.location.search);
  const category = params.get("category") || "Restaurants";
  const isBars = category === "Bars";

  // Filter API restaurants by category keyword only.
  const apiFiltered = category === "Restaurants"
    ? apiRestaurants
    : apiRestaurants.filter((r) =>
        r.category?.toLowerCase().includes(category.toLowerCase()) ||
        r.name?.toLowerCase().includes(category.toLowerCase()) ||
        r.description?.toLowerCase().includes(category.toLowerCase()),
      );

  const restaurants = apiFiltered;
  const loading = isLoading;

  return (
    <div className="w-full min-h-[100dvh] bg-white" data-testid="restaurant-list-page">
      <div className="flex items-center gap-3 px-6 pt-14 pb-4 border-b border-gray-100/80">
        {isBars ? (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">🍸 Bars</h1>
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
            <h1 className="text-[28px] font-bold tracking-tight flex-1">{category}</h1>
            <span className="text-xs text-muted-foreground font-medium">{restaurants.length} places</span>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingMascot size="md" />
        </div>
      ) : (
        <div className="px-6 py-5 pb-24 space-y-4">
          {restaurants.length > 0 ? (
            restaurants.map((r: any, idx: number) => (
              <div
                key={r.id}
                className={`flex gap-4 bg-white rounded-2xl cursor-pointer active:scale-[0.98] transition-transform p-1 relative ${isBars ? "animate-drunk-sway" : ""}`}
                style={{
                  boxShadow: r.sponsored ? "0 2px 16px -3px rgba(234,179,8,0.15)" : "0 2px 12px -3px rgba(0,0,0,0.06)",
                  ...(isBars ? { animationDelay: `${idx * -0.8}s` } : {}),
                }}
                onClick={() => navigate(`/restaurant/${r.id}`)}
                data-testid={`card-restaurant-${r.id}`}
              >
                {r.sponsored && (
                  <div className="absolute -top-2 left-4 bg-amber-400 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1 z-10"
                    style={{ boxShadow: "0 2px 8px rgba(234,179,8,0.25)" }}
                  >
                    <span className="text-[8px]">⭐</span> Sponsored
                  </div>
                )}
                <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 relative">
                  <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 py-2 pr-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-bold text-base truncate">{r.name}</h3>
                    <div className="flex items-center gap-0.5 ml-2">
                      <span className="text-[10px]">★</span>
                      <span className="text-sm font-semibold">{r.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.category}</p>
                  <div className="flex items-center gap-2 mt-2.5 text-xs text-muted-foreground">
                    <span className="font-medium">{"฿".repeat(r.priceLevel)}</span>
                    <span>·</span>
                    <span>📍 {r.address}</span>
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{r.description}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground py-12 text-center">
              No restaurants found for this category yet.
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
