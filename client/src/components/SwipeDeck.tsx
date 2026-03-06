import { useState } from "react";
import { SwipeCard } from "./SwipeCard";
import type { RestaurantResponse } from "@shared/routes";
import { useRecordPreference } from "@/hooks/use-restaurants";
import { Loader2 } from "lucide-react";

interface SwipeDeckProps {
  restaurants: RestaurantResponse[];
  isLoading: boolean;
}

export function SwipeDeck({ restaurants, isLoading }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const recordPreference = useRecordPreference();

  const handleSwipe = (id: number, direction: 'left' | 'right') => {
    // Optimistically move to next card
    setCurrentIndex((prev) => prev + 1);
    
    // Record preference to backend
    recordPreference.mutate({
      userId: "user_123", // Mock user ID for MVP
      restaurantId: id,
      preference: direction === 'right' ? 'like' : 'dislike'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full text-primary">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (restaurants.length === 0 || currentIndex >= restaurants.length) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center p-8 bg-white/60 backdrop-blur-xl rounded-[32px] shadow-premium">
        <span className="text-6xl mb-4">🤷‍♂️</span>
        <h2 className="text-3xl font-display font-bold text-foreground">Out of options</h2>
        <p className="text-muted-foreground mt-2">Try changing your filters or searching another area.</p>
        <button 
          onClick={() => setCurrentIndex(0)}
          className="mt-6 px-6 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-colors font-semibold"
        >
          Restart Deck
        </button>
      </div>
    );
  }

  // Display only top 2-3 cards for performance and visual stacking effect
  return (
    <div className="relative w-full h-full max-w-sm mx-auto flex justify-center items-center perspective-[1000px]">
      {restaurants.map((restaurant, index) => {
        if (index < currentIndex || index > currentIndex + 2) return null;
        
        const isActive = index === currentIndex;
        const offset = index - currentIndex;
        const zIndex = 100 - index;
        
        return (
          <SwipeCard 
            key={restaurant.id}
            restaurant={restaurant}
            active={isActive}
            onSwipe={handleSwipe}
            zIndex={zIndex}
          />
        );
      }).reverse()} {/* Reverse to render last items first (bottom of stack) */}
    </div>
  );
}
