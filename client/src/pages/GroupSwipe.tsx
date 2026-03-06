import { useEffect, useMemo, useState } from "react";
import { motion, animate, useMotionValue } from "framer-motion";
import { useLocation } from "wouter";
import { useUserLocation } from "@/hooks/use-user-location";

type DeckItem = {
  id: number;
  name: string;
  category: string;
  rating: string;
  priceLevel: number;
  address: string;
  imageUrl: string;
};

type Member = {
  id: number;
  name: string;
  avatarUrl?: string | null;
};

export default function GroupSwipe() {
  const [, navigate] = useLocation();
  const userLocation = useUserLocation();
  const [sessionCode, setSessionCode] = useState("");
  const [deck, setDeck] = useState<DeckItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<number>(0);
  const [done, setDone] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get("session") || "").trim().toUpperCase();
    if (!code) return;
    setSessionCode(code);

    const load = async () => {
      const deckUrl = `/api/group/sessions/${encodeURIComponent(code)}/deck?lat=${encodeURIComponent(
        String(userLocation.lat),
      )}&lng=${encodeURIComponent(String(userLocation.lng))}&radius=5000`;
      const [sessionRes, deckRes] = await Promise.all([
        fetch(`/api/group/sessions/${encodeURIComponent(code)}`, { credentials: "include" }),
        fetch(deckUrl, { credentials: "include" }),
      ]);
      if (sessionRes.ok) {
        const payload = await sessionRes.json();
        setMembers((payload.members || []).map((m: any) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl })));
      }
      if (deckRes.ok) {
        const data = await deckRes.json();
        setDeck((data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          rating: r.rating,
          priceLevel: Number(r.priceLevel || 1),
          address: r.address,
          imageUrl: r.imageUrl,
        })));
      }
    };

    void load();
  }, [userLocation.lat, userLocation.lng]);

  const current = useMemo(() => deck[index], [deck, index]);

  const onSwipe = (dir: "left" | "right" | "super") => {
    if (!current) return;
    if (dir === "right" || dir === "super") setLiked((n) => n + 1);
    const next = index + 1;
    if (next >= deck.length) {
      setDone(true);
      return;
    }
    setIndex(next);
    x.set(0);
    y.set(0);
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    const dx = info.offset.x;
    const dy = info.offset.y;
    const vx = info.velocity.x;
    const vy = info.velocity.y;

    if (dx > 110 || vx > 600) {
      onSwipe("right");
      return;
    }
    if (dx < -110 || vx < -600) {
      onSwipe("left");
      return;
    }
    if (dy < -120 || vy < -650) {
      onSwipe("super");
      return;
    }

    animate(x, 0, { type: "spring", damping: 20, stiffness: 220 });
    animate(y, 0, { type: "spring", damping: 20, stiffness: 220 });
  };

  if (done) {
    return (
      <div className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center px-6" data-testid="group-swipe-done">
        <h1 className="text-3xl font-bold mb-2">Session Complete</h1>
        <p className="text-muted-foreground mb-6">Liked {liked} of {deck.length}</p>
        <button
          onClick={() => navigate("/restaurants")}
          className="px-6 py-3 rounded-full bg-foreground text-white font-semibold"
        >
          View Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-white px-4 pt-4 pb-40" data-testid="group-swipe-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Group Swipe</h1>
        <span className="text-xs text-muted-foreground">{sessionCode || "-"}</span>
      </div>

      <div className="flex items-center gap-2 mb-5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2 py-1">
            {m.avatarUrl ? (
              <img src={m.avatarUrl} alt={m.name} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 text-[10px] flex items-center justify-center">{m.name.slice(0, 1)}</div>
            )}
            <span className="text-xs">{m.name}</span>
          </div>
        ))}
      </div>

      {!current ? (
        <div className="text-sm text-muted-foreground">Loading deck...</div>
      ) : (
        <motion.div
          key={current.id}
          drag
          dragElastic={0.12}
          dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
          style={{ x, y }}
          onDragEnd={handleDragEnd}
          className="bg-white rounded-3xl overflow-hidden border touch-pan-y"
          data-testid="group-swipe-card"
          whileTap={{ scale: 0.995 }}
          whileDrag={{ scale: 1.01 }}
          transition={{ type: "spring", damping: 22, stiffness: 220 }}
        >
          <img src={current.imageUrl} alt={current.name} className="w-full h-72 object-cover" />
          <div className="p-5">
            <h2 className="text-2xl font-bold">{current.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{current.category}</p>
            <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
              <span>Rating: {current.rating}</span>
              <span>|</span>
              <span>{"$".repeat(Math.max(1, current.priceLevel || 1))}</span>
            </div>
            <p className="text-sm mt-2">{current.address}</p>
            <p className="text-[11px] text-muted-foreground mt-3">Swipe left = No, right = Yes, up = Super</p>
          </div>
        </motion.div>
      )}

      <div className="fixed left-0 right-0 bottom-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3 safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button onClick={() => onSwipe("left")} className="py-3 rounded-full bg-gray-100 font-semibold" data-testid="btn-swipe-left">No</button>
          <button onClick={() => onSwipe("super")} className="py-3 rounded-full bg-yellow-100 font-semibold" data-testid="btn-swipe-super">Super</button>
          <button onClick={() => onSwipe("right")} className="py-3 rounded-full bg-green-100 font-semibold" data-testid="btn-swipe-right">Yes</button>
        </div>
      </div>
    </div>
  );
}
