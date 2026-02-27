import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { useState } from "react";
import type { RestaurantResponse } from "@shared/routes";
import { MapPin, Star } from "lucide-react";

interface SwipeCardProps {
  restaurant: RestaurantResponse;
  active: boolean;
  onSwipe: (id: number, direction: 'left' | 'right') => void;
  zIndex: number;
}

export function SwipeCard({ restaurant, active, onSwipe, zIndex }: SwipeCardProps) {
  const [exitX, setExitX] = useState<number>(0);
  const x = useMotionValue(0);
  const scale = useTransform(x, [-150, 0, 150], [0.95, 1, 0.95]);
  const rotate = useTransform(x, [-150, 0, 150], [-8, 0, 8]);
  
  // Opacity for the LIKE / NOPE stamps
  const opacityRight = useTransform(x, [0, 100], [0, 1]);
  const opacityLeft = useTransform(x, [0, -100], [0, 1]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      setExitX(300);
      onSwipe(restaurant.id, 'right');
    } else if (info.offset.x < -threshold) {
      setExitX(-300);
      onSwipe(restaurant.id, 'left');
    }
  };

  return (
    <motion.div
      style={{
        x,
        scale: active ? scale : 0.95,
        rotate: active ? rotate : 0,
        zIndex,
      }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX, opacity: 0 } : { x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`absolute inset-0 w-full h-[65vh] max-h-[600px] bg-card rounded-[32px] overflow-hidden shadow-premium ${!active && 'pointer-events-none'}`}
    >
      {/* Restaurant Image */}
      <div className="relative w-full h-2/3">
        <img 
          src={restaurant.imageUrl} 
          alt={restaurant.name}
          className="w-full h-full object-cover pointer-events-none"
        />
        {/* Subtle dark gradient at bottom of image for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Like Stamp */}
        <motion.div 
          style={{ opacity: opacityRight }}
          className="absolute top-8 left-8 border-4 border-success text-success text-4xl font-black rounded-xl px-4 py-2 rotate-[-15deg] uppercase pointer-events-none z-10 bg-white/20 backdrop-blur-sm"
        >
          YUM
        </motion.div>
        
        {/* Nope Stamp */}
        <motion.div 
          style={{ opacity: opacityLeft }}
          className="absolute top-8 right-8 border-4 border-destructive text-destructive text-4xl font-black rounded-xl px-4 py-2 rotate-[15deg] uppercase pointer-events-none z-10 bg-white/20 backdrop-blur-sm"
        >
          PASS
        </motion.div>
      </div>

      {/* Info Section */}
      <div className="p-6 h-1/3 flex flex-col justify-between bg-card">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-3xl font-display font-bold text-foreground truncate">{restaurant.name}</h2>
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-sm">{restaurant.rating}</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 truncate">
            <MapPin className="w-4 h-4" /> {restaurant.category} • {"$".repeat(restaurant.priceLevel)} • {restaurant.address}
          </p>
        </div>
        
        <div className="mt-4 text-sm text-foreground/80 line-clamp-2">
          {restaurant.description}
        </div>
      </div>
    </motion.div>
  );
}
