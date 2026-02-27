import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Search, Flame, User, ArrowLeft } from "lucide-react";

interface BottomNavProps {
  showBack?: boolean;
  showHome?: boolean;
  showProfile?: boolean;
  onBack?: () => void;
  hidden?: boolean;
}

type TabKey = "explore" | "swipe" | "profile";

const tabs: { key: TabKey; label: string; icon: typeof Search; path: string }[] = [
  { key: "explore", label: "Explore", icon: Search, path: "/" },
  { key: "swipe", label: "Swipe", icon: Flame, path: "/swipe" },
  { key: "profile", label: "Profile", icon: User, path: "/profile" },
];

function getActiveTab(location: string): TabKey {
  if (location === "/") return "explore";
  if (location === "/restaurants" || location.startsWith("/restaurant/")) return "explore";
  if (location === "/swipe" || location.startsWith("/solo") || location.startsWith("/group")) return "swipe";
  if (location === "/profile" || location.startsWith("/toast-picks")) return "profile";
  return "explore";
}

export function BottomNav({ showBack = true, onBack, hidden = false }: BottomNavProps) {
  const [location, navigate] = useLocation();
  const activeTab = getActiveTab(location);
  const [scrollHidden, setScrollHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (delta > 4 && currentY > 50) {
        setScrollHidden(true);
      } else if (delta < 0) {
        setScrollHidden(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setScrollHidden(false);
    lastScrollY.current = window.scrollY;
  }, [location]);

  const isHidden = hidden || scrollHidden;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isHidden ? 0 : 1, y: isHidden ? 80 : 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
      className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-gray-950 border-t border-gray-200/60 dark:border-gray-800/60 safe-bottom"
      style={{ pointerEvents: isHidden ? "none" : "auto" }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-0.5">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1"
            style={{ color: "#9ca3af" }}
            data-testid="button-back"
          >
            <ArrowLeft className="w-[22px] h-[22px]" strokeWidth={1.5} />
            <span className="text-[10px] font-medium leading-tight">Back</span>
          </button>
        )}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors duration-150"
              style={isActive ? { color: "#FFCC02" } : { color: "#9ca3af" }}
              data-testid={`tab-${tab.key}`}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.5} />
              <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
