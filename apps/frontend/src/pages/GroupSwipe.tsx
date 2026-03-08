import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo, useAnimate } from "framer-motion";
import { useLocation } from "wouter";
import { addSession, updateSession } from "@/lib/sessionStore";
import { BottomNav } from "@/components/BottomNav";
import { trackEvent } from "@/lib/analytics";
import { useLineProfile } from "@/lib/useLineProfile";
import { Square, X } from "lucide-react";

interface MenuItem {
  id: number;
  name: string;
  category: string;
  tags: string[];
  description: string;
  priceLevel: number;
  rating: string;
  address: string;
  imageUrl: string;
  isNew?: boolean;
}

interface SessionMember {
  id: number;
  sessionCode: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  joinedAt: string;
}

interface MatchInfo {
  menuItemId: number;
  voters: string[];
}

function ConfettiExplosion() {
  const colors = ["#FF385C", "#FFD700", "#00A699", "#FC642D", "#7B61FF", "#00D1C1", "#FF6B6B", "#4ECDC4", "#FFE66D", "#A855F7"];
  const shapes = ["circle", "rect", "star", "strip"];
  const pieces = useMemo(() =>
    Array.from({ length: 120 }).map((_, i) => {
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const velocity = 200 + Math.random() * 500;
      return {
        id: i,
        tx: Math.cos(angle) * velocity,
        ty: Math.sin(angle) * velocity * -1,
        tyEnd: 300 + Math.random() * 400,
        spin: (Math.random() - 0.5) * 1080,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: 4 + Math.random() * 8,
        delay: Math.random() * 0.15,
        duration: 1.8 + Math.random() * 1.2,
      };
    }), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            top: "40%",
            left: "50%",
            width: p.shape === "strip" ? p.size * 0.3 : p.size,
            height: p.shape === "circle" ? p.size : p.size * (p.shape === "strip" ? 2.5 : 0.6),
            borderRadius: p.shape === "circle" ? "50%" : p.shape === "star" ? "2px" : "1px",
            backgroundColor: p.color,
            animation: `confetti-explode ${p.duration}s cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay}s forwards`,
            ["--tx" as any]: `${p.tx}px`,
            ["--ty" as any]: `${p.ty}px`,
            ["--ty-end" as any]: `${p.tyEnd}px`,
            ["--spin" as any]: `${p.spin}deg`,
            clipPath: p.shape === "star" ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function useSwipeHintGroup(active: boolean, showHint: boolean) {
  const [scope, animate] = useAnimate();
  const [hintDone, setHintDone] = useState(false);

  useEffect(() => {
    if (active && showHint && !hintDone && scope.current) {
      const runHint = async () => {
        await new Promise(r => setTimeout(r, 500));
        try {
          await animate(scope.current, { x: 35, rotate: 3 }, { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] });
          await animate(scope.current, { x: -28, rotate: -2.5 }, { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] });
          await animate(scope.current, { x: 0, rotate: 0 }, { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] });
        } catch {}
        setHintDone(true);
      };
      runHint();
    }
  }, [active, showHint, hintDone]);

  return scope;
}

function SwipeCardGroup({ item, active, behind, onSwipe, onTap, showHint = false, members }: { item: MenuItem; active: boolean; behind: boolean; onSwipe: (id: number, dir: "left" | "right" | "super") => void; onTap: () => void; showHint?: boolean; members: SessionMember[] }) {
  const hintRef = useSwipeHintGroup(active, showHint);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const yumOpacity = useTransform(x, [0, 80], [0, 1]);
  const nahOpacity = useTransform(x, [0, -80], [0, 1]);
  const superOpacity = useTransform(y, [0, -80], [0, 1]);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<{ x: number; y: number } | null>(null);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const xThreshold = 120;
    const yThreshold = -100;

    if (info.offset.y < yThreshold && Math.abs(info.offset.x) < 80) {
      setExiting({ x: 0, y: -600 });
      onSwipe(item.id, "super");
    } else if (info.offset.x > xThreshold) {
      setExiting({ x: 500, y: info.offset.y });
      onSwipe(item.id, "right");
    } else if (info.offset.x < -xThreshold) {
      setExiting({ x: -500, y: info.offset.y });
      onSwipe(item.id, "left");
    }
    setTimeout(() => setDragging(false), 50);
  };

  if (!active && !behind) return null;

  return (
    <motion.div
      ref={active ? hintRef : undefined}
      style={{
        x: active ? x : 0,
        y: active ? y : 0,
        rotate: active ? rotate : 0,
        zIndex: active ? 10 : 5,
        boxShadow: active
          ? "0 20px 60px -12px rgba(0,0,0,0.2), 0 4px 20px -4px rgba(0,0,0,0.08)"
          : "0 10px 30px -8px rgba(0,0,0,0.12)",
      }}
      initial={behind ? { scale: 0.95, y: 8 } : { scale: 1, y: 0 }}
      animate={
        exiting
          ? { x: exiting.x, y: exiting.y, opacity: 0, rotate: exiting.x > 0 ? 20 : exiting.x < 0 ? -20 : 0 }
          : behind
          ? { scale: 0.96, y: 8, opacity: 0.7 }
          : { scale: 1, y: 0, opacity: 1 }
      }
      transition={exiting ? { duration: 0.35, ease: [0.4, 0, 0.2, 1] } : { type: "spring", damping: 28, stiffness: 280 }}
      drag={active && !exiting ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      onClick={() => { if (!dragging && active) onTap(); }}
      className="absolute inset-0 bg-white rounded-[28px] overflow-hidden cursor-grab active:cursor-grabbing select-none gpu-accelerated"
      data-testid={`swipe-card-${item.id}`}
    >
      <div className="relative w-full h-[58%]">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/5" />

        {active && (
          <>
            <motion.div
              style={{ opacity: yumOpacity }}
              className="absolute top-8 left-6 z-20 gpu-accelerated"
            >
              <div className="bg-[hsl(160,60%,45%)] text-white text-xl font-black rounded-2xl px-5 py-2.5 -rotate-12 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(0,200,100,0.3)" }}
              >
                YUM
              </div>
            </motion.div>
            <motion.div
              style={{ opacity: nahOpacity }}
              className="absolute top-8 right-6 z-20 gpu-accelerated"
            >
              <div className="bg-[hsl(348,83%,47%)] text-white text-xl font-black rounded-2xl px-5 py-2.5 rotate-12 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(220,38,38,0.3)" }}
              >
                NAH
              </div>
            </motion.div>
            <motion.div
              style={{ opacity: superOpacity }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 gpu-accelerated"
            >
              <div className="bg-[hsl(45,95%,55%)] text-foreground text-xl font-black rounded-2xl px-5 py-2.5 border-[3px] border-white/50 flex items-center gap-2"
                style={{ boxShadow: "0 4px 20px rgba(234,179,8,0.3)" }}
              >
                SUPERLIKE
              </div>
            </motion.div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5 pb-4">
          <h2 className="text-white text-[26px] font-semibold mb-1 drop-shadow-lg truncate">{item.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-white/90 text-sm font-medium truncate flex-1 min-w-0">{item.category}</span>
            <span className="text-white/50 flex-shrink-0">·</span>
            <span className="text-white/90 text-sm flex-shrink-0">{"฿".repeat(item.priceLevel)}</span>
            <span className="text-white/50 flex-shrink-0">·</span>
            <span className="text-white/90 text-sm flex items-center gap-0.5 flex-shrink-0">★ {item.rating}</span>
          </div>
        </div>

        <div className="absolute top-5 left-5 flex gap-2">
          {item.isNew && (
            <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              New
            </div>
          )}
        </div>
      </div>

      <div className="p-5 pt-3 flex flex-col h-[42%]">
        <div className="flex flex-wrap gap-1.5 mb-2 overflow-hidden max-h-[2.5rem]">
          {item.tags.map((tag) => (
            <span key={tag} className="text-[11px] bg-gray-100 rounded-full px-2.5 py-1 font-medium text-foreground/80">{tag}</span>
          ))}
        </div>

        <p className="text-foreground/60 text-sm leading-relaxed flex-1 min-h-0 line-clamp-2">{item.description}</p>

        <div className="mt-auto pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {members.map((m) => (
                m.pictureUrl ? (
                  <img key={m.lineUserId} src={m.pictureUrl} alt={m.displayName} className="w-5 h-5 rounded-full border-[1.5px] border-white object-cover" />
                ) : (
                  <div key={m.lineUserId} className="w-5 h-5 rounded-full border-[1.5px] border-white bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-amber-600">{m.displayName.charAt(0)}</span>
                  </div>
                )
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">{members.length} swiping</span>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[40%]">{item.address}</span>
        </div>
      </div>
    </motion.div>
  );
}

function buildTagsFromCategory(category: string): string[] {
  const tags: string[] = [];
  const parts = category.split("•").map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    tags.push(part);
  }
  return tags;
}

export default function GroupSwipe() {
  const [, navigate] = useLocation();
  const { profile } = useLineProfile();
  const sessionCode = new URLSearchParams(window.location.search).get("session") || "";
  const [members, setMembers] = useState<SessionMember[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchNotification, setMatchNotification] = useState<string | null>(null);
  const [fullMatch, setFullMatch] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [matchedItem, setMatchedItem] = useState<MenuItem | null>(null);
  const [superLiked, setSuperLiked] = useState<Set<number>>(new Set());
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [matchCount, setMatchCount] = useState(0);
  const [allMatches, setAllMatches] = useState<MenuItem[]>([]);
  const [likedCount, setLikedCount] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [notifiedPartials, setNotifiedPartials] = useState<Set<number>>(new Set());
  const [isHost, setIsHost] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const res = await fetch("/api/restaurants");
        if (res.ok) {
          const data = await res.json();
          const items: MenuItem[] = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            category: r.category || "Restaurant",
            tags: buildTagsFromCategory(r.category || ""),
            description: r.description || "",
            priceLevel: r.priceLevel || 2,
            rating: r.rating || "4.0",
            address: r.address || "Bangkok",
            imageUrl: r.imageUrl || "",
            isNew: r.isNew || false,
          }));
          const shuffled = items.sort(() => Math.random() - 0.5);
          setMenuItems(shuffled);
        }
      } catch (err) {
        console.error("Failed to load restaurants:", err);
      } finally {
        setLoading(false);
      }
    };
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (!sessionCode) return;
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/group/sessions/${sessionCode}`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members);
          if (profile && data.session?.hostLineUserId === profile.userId) {
            setIsHost(true);
          }
          if (data.session?.status === "completed" && !sessionEnded) {
            const matchRes = await fetch(`/api/group/sessions/${sessionCode}/matches`);
            if (matchRes.ok) {
              const matchData = await matchRes.json();
              if (matchData.matches && menuItems.length > 0) {
                const matchedItems = matchData.matches
                  .filter((m: MatchInfo) => m.voters.length >= data.members.length)
                  .map((m: MatchInfo) => menuItems.find(item => item.id === m.menuItemId))
                  .filter(Boolean) as MenuItem[];
                if (matchedItems.length > 0) {
                  setAllMatches(prev => {
                    const existing = new Set(prev.map(p => p.id));
                    const newItems = matchedItems.filter((i: MenuItem) => !existing.has(i.id));
                    return [...prev, ...newItems];
                  });
                }
              }
            }
            setSessionEnded(true);
          }
        }
      } catch {}
    };
    fetchSession();
    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [sessionCode, profile, sessionEnded, menuItems]);

  useEffect(() => {
    addSession({
      id: sessionCode || "group-1",
      type: "group",
      label: "Group Session",
      route: `/group/swipe${sessionCode ? `?session=${sessionCode}` : ""}`,
      memberCount: members.length,
      matchCount: 0,
      startedAt: Date.now(),
    });
  }, [sessionCode, members.length]);

  const recordSwipe = useCallback(async (menuItemId: number, direction: "left" | "right" | "super") => {
    if (!sessionCode || !profile) return null;
    try {
      const res = await fetch(`/api/group/sessions/${sessionCode}/swipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: profile.userId,
          menuItemId,
          direction,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Failed to record swipe:", err);
    }
    return null;
  }, [sessionCode, profile]);

  const handleSwipe = useCallback((id: number, dir: "left" | "right" | "super") => {
    const item = menuItems.find((m) => m.id === id);
    if (!item) return;

    trackEvent(dir === "left" ? "swipe_left" : "swipe_right", {
      restaurantId: id,
      metadata: { category: item.category || "" },
    });

    if (dir === "right" || dir === "super") {
      setLiked((prev) => new Set([...prev, id]));
      setLikedCount((c) => c + 1);
      if (dir === "super") setSuperLiked((prev) => new Set([...prev, id]));
    }

    setLastAction(dir === "right" ? "YUM!" : dir === "super" ? "SUPERLIKE!" : "Nah");
    setTimeout(() => setLastAction(null), 800);

    recordSwipe(id, dir).then((result) => {
      if (!result) return;

      const { matches, memberCount } = result;

      if (matches && matches.length > 0) {
        for (const match of matches) {
          const matchedMenuItem = menuItems.find(m => m.id === match.menuItemId);
          if (matchedMenuItem && match.voters.length >= memberCount) {
            if (!allMatches.find(am => am.id === matchedMenuItem.id)) {
              setAllMatches(prev => [...prev, matchedMenuItem]);
            }
            setMatchedItem(matchedMenuItem);
            setConfetti(true);
            setFullMatch(true);
            setMatchCount(c => {
              const newCount = c + 1;
              updateSession(sessionCode || "group-1", { matchCount: newCount });
              return newCount;
            });
            return;
          }
        }
      }

      if (dir === "right" || dir === "super") {
        checkPartialMatches(id);
      }
    });

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 300);
  }, [recordSwipe, sessionCode, members, menuItems, allMatches]);

  const checkPartialMatches = useCallback(async (menuItemId: number) => {
    if (!sessionCode || notifiedPartials.has(menuItemId)) return;
    try {
      const res = await fetch(`/api/group/sessions/${sessionCode}/swipes`);
      if (!res.ok) return;
      const data = await res.json();

      const positiveSwipes = data.swipes.filter((s: any) => s.direction === "right" || s.direction === "super");
      const votersForItem = new Set<string>();
      for (const s of positiveSwipes) {
        if (s.menuItemId === menuItemId) {
          votersForItem.add(s.lineUserId);
        }
      }

      if (votersForItem.size > 1 && votersForItem.size < data.members.length) {
        const voterNames = data.members
          .filter((m: SessionMember) => votersForItem.has(m.lineUserId) && m.lineUserId !== profile?.userId)
          .map((m: SessionMember) => m.displayName);

        if (voterNames.length > 0) {
          setNotifiedPartials(prev => new Set(prev).add(menuItemId));
          const item = menuItems.find(m => m.id === menuItemId);
          if (item) {
            const nameStr = voterNames.join(" and ");
            setMatchNotification(`You and ${nameStr} both liked ${item.name}!`);
            setTimeout(() => setMatchNotification(null), 3000);
          }
        }
      }
    } catch {}
  }, [sessionCode, profile, notifiedPartials, menuItems]);

  const handleButtonSwipe = (dir: "left" | "right" | "super") => {
    if (currentIndex < menuItems.length) {
      handleSwipe(menuItems[currentIndex].id, dir);
    }
  };

  const handleTap = (item: MenuItem) => {
    navigate(`/restaurants?category=${encodeURIComponent(item.name)}`);
  };

  const handleEndSession = async () => {
    if (!sessionCode || !profile) return;
    try {
      await fetch(`/api/group/sessions/${sessionCode}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", lineUserId: profile.userId }),
      });
      setSessionEnded(true);
      setShowEndConfirm(false);
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  const handleContinueSwiping = () => {
    setFullMatch(false);
    setConfetti(false);
    setMatchedItem(null);
  };

  if (loading) {
    return (
      <div className="w-full h-[100dvh] bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="w-full h-[100dvh] bg-white flex flex-col overflow-hidden" data-testid="group-summary-page">
        <div className="flex-shrink-0 px-6 pt-12 pb-4 border-b border-gray-100">
          <h1 className="text-[22px] font-bold" data-testid="text-summary-title">Session Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} people swiped · {allMatches.length} match{allMatches.length !== 1 ? "es" : ""}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {members.map((m) => (
              <div key={m.lineUserId} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1.5">
                {m.pictureUrl ? (
                  <img src={m.pictureUrl} alt={m.displayName} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-amber-600">{m.displayName.charAt(0)}</span>
                  </div>
                )}
                <span className="text-xs font-semibold">{m.lineUserId === profile?.userId ? "You" : m.displayName}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {allMatches.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Group Matches</h2>
              {allMatches.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                  data-testid={`match-card-${item.id}`}
                >
                  <div className="flex">
                    <img src={item.imageUrl} alt={item.name} className="w-28 h-28 object-cover flex-shrink-0" />
                    <div className="p-3 flex-1 min-w-0">
                      <h3 className="font-bold text-[15px] truncate">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium">★ {item.rating}</span>
                        <span className="text-xs text-muted-foreground">{"฿".repeat(item.priceLevel)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">{item.address}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-5xl mb-4">🤔</span>
              <h2 className="text-lg font-semibold mb-2">No matches yet</h2>
              <p className="text-sm text-muted-foreground">Your group didn't agree on any restaurants this time. Try again with different preferences!</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-4 pb-6 border-t border-gray-100 safe-bottom">
          <button
            onClick={() => navigate("/")}
            data-testid="button-home-summary"
            className="w-full py-4 rounded-2xl bg-foreground text-white font-bold text-[15px] active:scale-[0.97] transition-transform"
            style={{ boxShadow: "0 8px 25px -5px rgba(0,0,0,0.25)" }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (fullMatch && matchedItem) {
    return (
      <div className="w-full h-[100dvh] bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden" data-testid="group-match-page">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[5%] w-48 h-48 bg-amber-50/50 rounded-full blur-3xl" />
          <div className="absolute bottom-[15%] right-[10%] w-56 h-56 bg-amber-50/50 rounded-full blur-3xl" />
          <div className="absolute top-[40%] right-[20%] w-32 h-32 bg-green-50/40 rounded-full blur-3xl" />
        </div>

        {confetti && <ConfettiExplosion />}

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="mb-3"
        >
          <div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center"
            style={{ boxShadow: "0 12px 40px -8px rgba(255,204,2,0.25)" }}
          >
            <span className="text-5xl inline-block animate-icon-wiggle gpu-accelerated">🎉</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="text-[32px] font-semibold text-center mb-2"
        >
          It's a match!
        </motion.h1>
        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="text-muted-foreground text-center mb-4 text-[15px]"
        >
          Everyone agreed on {matchedItem.name}!
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="flex flex-wrap justify-center gap-2.5 mb-7"
        >
          {members.map((m, i) => (
            <motion.div
              key={m.lineUserId}
              initial={{ scale: 0, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, type: "spring", damping: 18, stiffness: 250 }}
              className="flex items-center gap-2 bg-green-50/80 rounded-full px-4 py-2 border border-green-200/50"
              style={{ boxShadow: "0 2px 10px rgba(0,200,100,0.08)" }}
            >
              {m.pictureUrl ? (
                <img src={m.pictureUrl} alt={m.displayName} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-amber-600">{m.displayName.charAt(0)}</span>
                </div>
              )}
              <span className="text-[hsl(160,60%,40%)] text-[11px] font-bold">✓</span>
              <span className="text-xs font-bold">{m.lineUserId === profile?.userId ? "You" : m.displayName}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="w-72 rounded-[24px] overflow-hidden mb-7"
          style={{ boxShadow: "0 20px 60px -15px rgba(0,0,0,0.18)" }}
        >
          <div className="relative">
            <img src={matchedItem.imageUrl} alt={matchedItem.name} className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </div>
          <div className="p-5 bg-white">
            <h3 className="font-semibold text-lg">{matchedItem.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{matchedItem.category}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-medium">★ {matchedItem.rating}</span>
              <span className="text-xs text-muted-foreground">{"฿".repeat(matchedItem.priceLevel)}</span>
              <span className="text-xs text-muted-foreground">· {matchedItem.address}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {matchedItem.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] bg-gray-100 rounded-full px-2.5 py-1 font-medium">{tag}</span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <motion.button
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={handleContinueSwiping}
            data-testid="button-keep-swiping"
            className="w-full py-4 rounded-full bg-[#FFCC02] text-[#2d2000] font-bold text-[15px] active:scale-[0.96] transition-transform duration-200"
            style={{ boxShadow: "var(--shadow-glow-primary)" }}
          >
            Keep Swiping
          </motion.button>

          {isHost && (
            <motion.button
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.95, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              onClick={handleEndSession}
              data-testid="button-end-session-match"
              className="text-sm text-muted-foreground font-semibold hover:text-foreground transition-colors"
            >
              End Session ({allMatches.length} match{allMatches.length !== 1 ? "es" : ""})
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] bg-[hsl(30,20%,97%)] flex flex-col overflow-hidden" style={{ touchAction: "none", overscrollBehavior: "none" }} data-testid="group-swipe-page">
      <div className="flex items-center justify-between px-6 pt-12 pb-3">
        <div className="text-left flex items-center gap-2">
          <div>
            <h1 className="font-bold text-[22px] tracking-tight" data-testid="text-group-title">Group Swipe</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {members.map(m => m.lineUserId === profile?.userId ? "You" : m.displayName).join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center -space-x-1.5">
            {members.map((m) => (
              m.pictureUrl ? (
                <img key={m.lineUserId} src={m.pictureUrl} alt={m.displayName} className="w-7 h-7 rounded-full border-[2px] border-white object-cover" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} />
              ) : (
                <div key={m.lineUserId} className="w-7 h-7 rounded-full border-[2px] border-white bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                  <span className="text-[10px] font-bold text-amber-600">{m.displayName.charAt(0)}</span>
                </div>
              )
            ))}
          </div>
          {matchCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFCC02]/15 text-[#2d2000]">
              {matchCount} match{matchCount !== 1 ? "es" : ""}
            </div>
          )}
          {isHost && (
            <button
              onClick={() => setShowEndConfirm(true)}
              data-testid="button-end-session"
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-200 active:scale-90 transition-transform"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              <Square className="w-3.5 h-3.5 text-red-500" fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 gpu-accelerated"
          >
            <div className={`px-4 py-2 rounded-full text-sm font-bold text-white ${
              lastAction === "YUM!" ? "bg-[hsl(160,60%,45%)]" :
              lastAction === "SUPERLIKE!" ? "bg-[hsl(45,95%,55%)] !text-foreground" :
              "bg-gray-400"
            }`}
              style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.15)" }}
            >
              {lastAction}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative px-5 pb-4">
        {currentIndex >= menuItems.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
            >
              <span className="text-6xl block">🎉</span>
              <span className="absolute -top-2 -right-3 text-2xl inline-block animate-icon-wiggle gpu-accelerated">✨</span>
            </motion.div>
            <h2 className="text-2xl font-semibold mb-2" data-testid="text-all-done">All done!</h2>
            <p className="text-muted-foreground mb-2 text-sm">Your group liked {likedCount} out of {menuItems.length} options</p>
            <p className="text-muted-foreground mb-4 text-xs">{allMatches.length} group match{allMatches.length !== 1 ? "es" : ""} found</p>
            {isHost ? (
              <button
                onClick={handleEndSession}
                data-testid="button-end-done"
                className="px-8 py-3.5 rounded-full bg-[#FFCC02] text-[#2d2000] font-bold text-sm active:scale-[0.96] transition-transform duration-200"
                style={{ boxShadow: "var(--shadow-glow-primary)" }}
              >
                See Results ({allMatches.length} match{allMatches.length !== 1 ? "es" : ""})
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for the host to end the session...</p>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full max-w-sm mx-auto">
            {menuItems.map((item, idx) => {
              if (idx < currentIndex || idx > currentIndex + 1) return null;
              return (
                <SwipeCardGroup
                  key={item.id}
                  item={item}
                  active={idx === currentIndex}
                  behind={idx === currentIndex + 1}
                  onSwipe={handleSwipe}
                  onTap={() => handleTap(item)}
                  showHint={idx === 0 && currentIndex === 0}
                  members={members}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 pb-20 flex flex-col gap-3">
        {currentIndex < menuItems.length && (
          <div className="flex justify-center items-center gap-5">
            <button
              onClick={() => handleButtonSwipe("left")}
              data-testid="button-nah"
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-gray-100 active:scale-[0.8] active:-rotate-12 transition-transform duration-200 gpu-accelerated"
              style={{ boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)" }}
            >
              <span className="text-2xl">👎</span>
            </button>

            <button
              onClick={() => handleButtonSwipe("super")}
              data-testid="button-superlike"
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-amber-200 active:scale-[0.8] active:-translate-y-2 transition-transform duration-200 gpu-accelerated"
              style={{ boxShadow: "0 4px 20px -4px rgba(234,179,8,0.15)" }}
            >
              <span className="text-lg">⭐</span>
            </button>

            <button
              onClick={() => handleButtonSwipe("right")}
              data-testid="button-yum"
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-green-100 active:scale-[0.8] active:rotate-12 transition-transform duration-200 gpu-accelerated"
              style={{ boxShadow: "0 4px 20px -4px rgba(0,200,100,0.1)" }}
            >
              <span className="text-2xl">😋</span>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {matchNotification && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-36 left-6 right-6 bg-white rounded-2xl px-5 py-4 flex items-center gap-3 z-50 border border-gray-100 gpu-accelerated"
            style={{ boxShadow: "0 12px 40px -8px rgba(0,0,0,0.12)" }}
            data-testid="match-notification"
          >
            <span className="text-2xl inline-block animate-icon-wiggle gpu-accelerated">
              🎯
            </span>
            <div>
              <p className="font-bold text-sm">{matchNotification}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Keep swiping for a full group match!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[100] flex items-end justify-center"
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-md px-6 py-6 pb-8 safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
              <h3 className="text-lg font-bold mb-2">End Session?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This will end the swiping for everyone and show the results.
                {allMatches.length > 0
                  ? ` You have ${allMatches.length} match${allMatches.length !== 1 ? "es" : ""} so far.`
                  : " No matches yet."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-gray-100 font-bold text-sm active:scale-[0.97] transition-transform"
                  data-testid="button-cancel-end"
                >
                  Keep Swiping
                </button>
                <button
                  onClick={handleEndSession}
                  className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm active:scale-[0.97] transition-transform"
                  style={{ boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}
                  data-testid="button-confirm-end"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
