import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSavedRestaurants, type SaveBucket } from "@/hooks/use-saved-restaurants";

interface SaveBucketPickerProps {
  restaurantId: number;
  restaurantName: string;
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function SaveBucketPicker({ restaurantId, restaurantName, open, onClose, anchorRef }: SaveBucketPickerProps) {
  const { isSaved, getBucket, saveToMine, saveToPartner, unsave } = useSavedRestaurants();
  const currentBucket = getBucket(restaurantId);
  const alreadySaved = isSaved(restaurantId);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  const handleSelect = (bucket: SaveBucket) => {
    if (currentBucket === bucket) {
      unsave(restaurantId);
    } else if (bucket === "mine") {
      saveToMine(restaurantId);
    } else {
      saveToPartner(restaurantId);
    }
    onClose();
  };

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          transition={{ type: "spring", damping: 26, stiffness: 260, mass: 0.8 }}
          className="w-[220px] bg-white rounded-2xl overflow-hidden border border-gray-100"
          style={{
            boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            position: anchorRef ? "fixed" : "absolute",
            top: anchorRef && position ? position.top : undefined,
            right: anchorRef && position ? position.right : 0,
            ...(anchorRef ? {} : { top: "100%", marginTop: 8 }),
            zIndex: 9999,
          }}
        >
          <div className="px-3.5 pt-3 pb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-0.5">Save to</p>
            <p className="text-[12px] font-semibold tracking-tight truncate">{restaurantName}</p>
          </div>

          <div className="px-2.5 pb-2.5 space-y-1.5">
            <button
              onClick={() => handleSelect("mine")}
              data-testid="button-save-mine"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] ${
                currentBucket === "mine"
                  ? "bg-red-50/80"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <span className="text-base">❤️</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-[12px]">My Saves</p>
                <p className="text-[9px] text-muted-foreground">Personal favorites</p>
              </div>
              {currentBucket === "mine" && (
                <div className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">✓</span>
                </div>
              )}
            </button>

            <button
              onClick={() => handleSelect("partner")}
              data-testid="button-save-partner"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] ${
                currentBucket === "partner"
                  ? "bg-pink-50/80"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <span className="text-base">💕</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-[12px]">With Partner</p>
                <p className="text-[9px] text-muted-foreground">Shared date night picks</p>
              </div>
              {currentBucket === "partner" && (
                <div className="w-4 h-4 rounded-full bg-pink-400 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">✓</span>
                </div>
              )}
            </button>

            {alreadySaved && (
              <button
                onClick={() => { unsave(restaurantId); onClose(); }}
                data-testid="button-unsave"
                className="w-full py-1.5 text-center text-[10px] font-semibold text-muted-foreground/50 active:text-red-400 transition-colors"
              >
                Remove from saves
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (anchorRef) {
    return createPortal(content, document.body);
  }

  return content;
}
