import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, PanInfo } from "framer-motion";
import { useLocation } from "wouter";
import { Heart, Bookmark, Share2, MapPin, Star, TrendingUp, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { shareMessage, sendGroupInvite } from "@/lib/liff";
import { useLineProfile } from "@/lib/useLineProfile";
import { useToast } from "@/hooks/use-toast";
import { useSavedRestaurants } from "@/hooks/use-saved-restaurants";

async function apiToggleLiked(lineUserId: string, restaurantId: number): Promise<void> {
  await fetch("/api/user/liked/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineUserId, restaurantId }),
  });
}

interface TrendingPost {
  id: number;
  restaurantId: number;
  restaurantName: string;
  category: string;
  description: string;
  rating: string;
  priceLevel: number;
  address: string;
  distance: string;
  mediaItems: { type: "image" | "video"; url: string; poster?: string }[];
  tags: string[];
  trendingRank?: number;
  reviewCount: number;
  isNew?: boolean;
}


const LIKE_KEY = "toast_liked_posts";

function getLikedPosts(): number[] {
  try {
    return JSON.parse(localStorage.getItem(LIKE_KEY) || "[]");
  } catch { return []; }
}

function toggleLikedPost(id: number): boolean {
  const liked = getLikedPosts();
  const idx = liked.indexOf(id);
  if (idx >= 0) {
    liked.splice(idx, 1);
    localStorage.setItem(LIKE_KEY, JSON.stringify(liked));
    return false;
  } else {
    liked.push(id);
    localStorage.setItem(LIKE_KEY, JSON.stringify(liked));
    return true;
  }
}

function PriceIndicator({ level, isDark }: { level: number; isDark: boolean }) {
  return (
    <span className="text-[13px]">
      <span className={isDark ? "text-white" : "text-gray-900"}>{"฿".repeat(level)}</span>
      <span className={isDark ? "text-white/40" : "text-gray-400"}>{"฿".repeat(4 - level)}</span>
    </span>
  );
}

function analyzeImageBrightness(
  url: string,
  region: "top" | "bottom",
  callback: (isDark: boolean) => void
) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const sy = region === "top" ? 0 : img.height * 0.6;
      const sh = region === "top" ? img.height * 0.15 : img.height * 0.4;
      ctx.drawImage(img, 0, sy, img.width, sh, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let totalLum = 0;
      let darkPixels = 0;
      const pixelCount = size * size;
      for (let i = 0; i < data.length; i += 4) {
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        totalLum += lum;
        if (lum < 128) darkPixels++;
      }
      const avgLum = totalLum / pixelCount;
      const darkRatio = darkPixels / pixelCount;
      const isDark = avgLum < 160 || darkRatio > 0.4;
      callback(isDark);
    } catch {}
  };
  img.src = url;
}

function useImageBrightness(url: string) {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => { analyzeImageBrightness(url, "bottom", setIsDark); }, [url]);
  return isDark;
}

function useImageTopBrightness(url: string) {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => { analyzeImageBrightness(url, "top", setIsDark); }, [url]);
  return isDark;
}

function FullScreenSlide({
  post,
  isSaved,
  isLiked,
  onSave,
  onLike,
  onShare,
  onNavigate,
  onInviteSwipe,
  onHeaderBrightness,
}: {
  post: TrendingPost;
  isSaved: boolean;
  isLiked: boolean;
  onSave: () => void;
  onLike: () => void;
  onShare: () => void;
  onNavigate: () => void;
  onInviteSwipe: () => void;
  onHeaderBrightness?: (isDark: boolean) => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const isDragging = useRef(false);
  const dragX = useMotionValue(0);
  const isDark = useImageBrightness(post.mediaItems[currentIdx].url);
  const isTopDark = useImageTopBrightness(post.mediaItems[currentIdx].url);
  const onHeaderBrightnessRef = useRef(onHeaderBrightness);
  onHeaderBrightnessRef.current = onHeaderBrightness;
  useEffect(() => { onHeaderBrightnessRef.current?.(isTopDark); }, [isTopDark]);

  const txt = isDark ? "text-white" : "text-gray-900";
  const txtSub = isDark ? "text-white/90" : "text-gray-700";
  const txtMuted = isDark ? "text-white/60" : "text-gray-500";
  const txtFaint = isDark ? "text-white/50" : "text-gray-400";
  const txtDot = isDark ? "text-white/40" : "text-gray-300";
  const btnBg = isDark ? "bg-black/30 backdrop-blur-md" : "bg-white/50 backdrop-blur-md";
  const btnIcon = isDark ? "text-white" : "text-gray-900";
  const btnLabel = isDark ? "text-white" : "text-gray-700";
  const tagStyle = isDark
    ? "text-white/90 bg-white/15 backdrop-blur-sm"
    : "text-gray-800 bg-black/10 backdrop-blur-sm";
  const dotActive = isDark ? "bg-white" : "bg-gray-900";
  const dotInactive = isDark ? "bg-white/35" : "bg-gray-900/30";
  const badgeBg = isDark ? "bg-black/30 backdrop-blur-md border border-white/15" : "bg-white/70 backdrop-blur-md border border-black/10";
  const badgeTxt = isDark ? "text-white" : "text-gray-900";
  const gradient = isDark
    ? "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0) 100%)"
    : "linear-gradient(to top, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0) 100%)";

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && currentIdx < post.mediaItems.length - 1) {
      setDirection(1);
      setCurrentIdx(currentIdx + 1);
    } else if (info.offset.x > threshold && currentIdx > 0) {
      setDirection(-1);
      setCurrentIdx(currentIdx - 1);
    }
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      className="relative w-full flex-shrink-0 snap-start snap-always overflow-hidden"
      style={{ height: "calc(100dvh - 52px)", touchAction: "pan-y" }}
      data-testid={`feed-card-${post.id}`}
    >
      <div className="absolute inset-0 bg-gray-900">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.img
            key={currentIdx}
            src={post.mediaItems[currentIdx].url}
            alt={post.restaurantName}
            className="absolute inset-0 w-full h-full object-cover"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            drag={post.mediaItems.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onTap={() => { if (!isDragging.current) onNavigate(); }}
            style={{ x: dragX, touchAction: "pan-y" }}
          />
        </AnimatePresence>
      </div>

      {post.mediaItems.length > 1 && (
        <div className="absolute left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top, 0px) + 56px)" }}>
          {post.mediaItems.map((_, idx) => (
            <div
              key={idx}
              className={`rounded-full transition-all duration-300 w-6 h-[3px] ${idx === currentIdx ? dotActive : dotInactive}`}
              data-testid={`media-dot-${idx}`}
            />
          ))}
        </div>
      )}

      <div className="absolute left-4 z-20 flex items-center gap-1.5" style={{ top: "calc(env(safe-area-inset-top, 0px) + 56px)" }}>
        {post.trendingRank && post.trendingRank <= 5 && (
          <div className={`flex items-center gap-1 ${badgeBg} ${badgeTxt} px-2.5 py-1 rounded-full`} data-testid={`badge-trending-rank-${post.id}`}>
            <TrendingUp className="w-3 h-3" />
            <span className="text-[11px] font-semibold">#{post.trendingRank}</span>
          </div>
        )}
        {post.isNew && (
          <div className="bg-[#FFCC02] text-gray-900 px-2.5 py-1 rounded-full" data-testid={`badge-new-${post.id}`}>
            <span className="text-[11px] font-bold">New</span>
          </div>
        )}
      </div>

      <div className="absolute right-3 z-20 flex flex-col items-center gap-4" style={{ bottom: "210px" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className="flex flex-col items-center gap-0.5"
          aria-label={isLiked ? "Unlike" : "Like"}
          data-testid={`button-like-${post.id}`}
        >
          <div className={`w-11 h-11 rounded-full ${btnBg} flex items-center justify-center`}>
            <Heart className={`w-[22px] h-[22px] ${isLiked ? "text-red-500 fill-red-500" : btnIcon}`} />
          </div>
          <span className={`${btnLabel} text-[10px] font-medium drop-shadow-md`}>{isLiked ? "Liked" : "Like"}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className="flex flex-col items-center gap-0.5"
          aria-label={isSaved ? "Remove from saved" : "Save"}
          data-testid={`button-save-${post.id}`}
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${btnBg}`}>
            <Bookmark className={`w-[22px] h-[22px] ${isSaved ? "text-[#FFCC02] fill-[#FFCC02]" : btnIcon}`} />
          </div>
          <span className={`${btnLabel} text-[10px] font-medium drop-shadow-md`}>{isSaved ? "Saved" : "Save"}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          className="flex flex-col items-center gap-0.5"
          aria-label="Share"
          data-testid={`button-share-${post.id}`}
        >
          <div className={`w-11 h-11 rounded-full ${btnBg} flex items-center justify-center`}>
            <Share2 className={`w-[22px] h-[22px] ${btnIcon}`} />
          </div>
          <span className={`${btnLabel} text-[10px] font-medium drop-shadow-md`}>Share</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onInviteSwipe(); }}
          className="flex flex-col items-center gap-0.5"
          aria-label="Invite friends to swipe"
          data-testid={`button-invite-swipe-${post.id}`}
        >
          <div className={`w-11 h-11 rounded-full ${btnBg} flex items-center justify-center`}>
            <Layers className={`w-[22px] h-[22px] ${btnIcon}`} />
          </div>
          <span className={`${btnLabel} text-[10px] font-medium drop-shadow-md`}>Swipe</span>
        </button>
      </div>

      <div className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none" style={{ height: "50%" }}>
        <div className="w-full h-full" style={{ background: gradient }} />
      </div>

      <button
        onClick={onNavigate}
        className="absolute left-0 right-16 z-20 text-left px-5 cursor-pointer"
        style={{ bottom: "56px" }}
        data-testid={`link-restaurant-${post.id}`}
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {post.tags.map((tag, idx) => (
            <span key={tag} className={`text-[11px] ${tagStyle} px-2.5 py-0.5 rounded-full font-medium`} data-testid={`tag-${post.id}-${idx}`}>
              {tag}
            </span>
          ))}
        </div>

        <h3 className={`text-[24px] font-bold ${txt} leading-tight tracking-tight mb-1`} data-testid={`text-restaurant-name-${post.id}`}>
          {post.restaurantName}
        </h3>

        <div className="flex items-center gap-2 mb-1">
          <span className={`${txtSub} text-[13px] font-medium`} data-testid={`text-category-${post.id}`}>{post.category}</span>
          <span className={txtDot}>·</span>
          <PriceIndicator level={post.priceLevel} isDark={isDark} />
          <span className={txtDot}>·</span>
          <div className="flex items-center gap-0.5" data-testid={`text-rating-${post.id}`}>
            <Star className="w-3.5 h-3.5 text-[#FFCC02] fill-[#FFCC02]" />
            <span className={`${txt} text-[13px] font-semibold`}>{post.rating}</span>
            <span className={`${txtFaint} text-[12px]`}>({post.reviewCount.toLocaleString()})</span>
          </div>
        </div>

        <div className={`flex items-center gap-1 ${txtMuted} text-[12px]`} data-testid={`text-location-${post.id}`}>
          <MapPin className="w-3 h-3" />
          <span>{post.address}</span>
          <span>·</span>
          <span>{post.distance}</span>
        </div>
      </button>
    </div>
  );
}

export default function TrendingFeed() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { profile } = useLineProfile();
  const { isSaved: isRestaurantSaved, saveToMine, unsave } = useSavedRestaurants();
  const containerRef = useRef<HTMLDivElement>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set(getLikedPosts()));
  const [creatingSession, setCreatingSession] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [headerBrightness, setHeaderBrightness] = useState<Record<number, boolean>>({});
  const headerIsDark = headerBrightness[activeIndex] ?? true;

  const { data: feedData, isLoading, isError } = useQuery<{ posts: TrendingPost[]; builtAt: string | null; cached: boolean }>({
    queryKey: ["/api/trending/feed"],
    staleTime: 10 * 60 * 1000,
  });

  const posts = feedData?.posts ?? [];


  const deepLinkId = new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (deepLinkId && containerRef.current) {
      const targetEl = document.querySelector(`[data-testid="feed-card-${deepLinkId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "instant" });
      }
    }
  }, [deepLinkId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const idx = Math.round(container.scrollTop / container.clientHeight);
      setActiveIndex(idx);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const activeDistrict = useMemo(() => {
    const post = posts[activeIndex];
    if (!post) return "Bangkok";
    const addr = post.address.toLowerCase();
    if (addr.includes("samran rat") || addr.includes("maha chai")) return "Phra Nakhon";
    if (addr.includes("langsuan")) return "Pathum Wan";
    if (addr.includes("thonglor") || addr.includes("sukhumvit 55")) return "Thonglor";
    if (addr.includes("phrom phong")) return "Phrom Phong";
    if (addr.includes("ekkamai")) return "Ekkamai";
    if (addr.includes("sukhumvit")) return "Sukhumvit";
    if (addr.includes("silom") || addr.includes("convent")) return "Silom";
    if (addr.includes("charoen krung")) return "Charoen Krung";
    if (addr.includes("chinatown") || addr.includes("nana")) return "Chinatown";
    if (addr.includes("samsen")) return "Dusit";
    if (addr.includes("phetchaburi")) return "Ratchathewi";
    if (addr.includes("ari")) return "Ari";
    return "Bangkok";
  }, [activeIndex, posts]);

  const handleSave = useCallback((post: TrendingPost) => {
    const nowSaved = !isRestaurantSaved(post.restaurantId);
    if (nowSaved) saveToMine(post.restaurantId);
    else unsave(post.restaurantId);
    toast({
      title: nowSaved ? "Saved for later!" : "Removed from saved",
      description: nowSaved ? "You can find this in your saved items" : "",
    });
  }, [isRestaurantSaved, saveToMine, unsave, toast]);

  const handleLike = useCallback((post: TrendingPost) => {
    const nowLiked = toggleLikedPost(post.restaurantId);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (nowLiked) next.add(post.restaurantId);
      else next.delete(post.restaurantId);
      return next;
    });
    if (profile?.userId) {
      apiToggleLiked(profile.userId, post.restaurantId).catch(() => {});
    }
  }, [profile?.userId]);


  const handleShare = useCallback(async (post: TrendingPost) => {
    const appUrl = window.location.origin;
    const shareUrl = `${appUrl}/trending?id=${post.id}`;
    const message = `Trending on Toast!\n\n${post.restaurantName} — ${post.category}\n${post.rating} · ${post.address}\n\n"${post.description.slice(0, 100)}..."\n\nCheck it out:\n${shareUrl}`;
    try {
      await shareMessage(message);
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied!", description: "Share this link with your friends" });
      } catch {
        toast({ title: "Share link", description: shareUrl });
      }
    }
  }, [toast]);

  const handleNavigate = useCallback((post: TrendingPost) => {
    navigate(`/restaurant/${post.restaurantId}`);
  }, [navigate]);

  const handleInviteSwipe = useCallback(async (post: TrendingPost) => {
    if (creatingSession) return;
    setCreatingSession(true);

    try {
      const sessionCode = `t${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;

      const userId = profile?.userId || `guest_${Math.random().toString(36).substring(2, 8)}`;
      const displayName = profile?.displayName || "Guest";
      const pictureUrl = profile?.pictureUrl || "";

      let latitude: string | undefined;
      let longitude: string | undefined;
      if (navigator.geolocation) {
        try {
          const pos = await Promise.race([
            new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, maximumAge: 60000 });
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3500)),
          ]);
          latitude = pos.coords.latitude.toString();
          longitude = pos.coords.longitude.toString();
        } catch {}
      }

      const sourceData = JSON.stringify({
        source: "trending",
        restaurantId: post.restaurantId,
        restaurantName: post.restaurantName,
      });

      const createRes = await fetch("/api/group/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionCode,
          hostLineUserId: userId,
          hostDisplayName: displayName,
          hostPictureUrl: pictureUrl,
          sessionType: "trending",
          sourceData,
          latitude,
          longitude,
        }),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create session");
      }

      try {
        const shareResult = await sendGroupInvite(sessionCode);
        toast({
          title: "Session created!",
          description: shareResult.shared ? "Invite sent — heading to waiting room" : "Heading to waiting room",
        });
      } catch {
        toast({
          title: "Session created!",
          description: "Heading to waiting room",
        });
      }

      navigate(`/group/waiting?session=${sessionCode}`);
    } catch (err) {
      toast({
        title: "Couldn't create session",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setCreatingSession(false);
    }
  }, [toast, navigate, profile, creatingSession]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 bg-black flex flex-col"
      data-testid="trending-feed-page"
    >
      <div className={`absolute top-0 left-0 right-0 z-30 backdrop-blur-md pt-[env(safe-area-inset-top)] border-b transition-colors duration-300 ${headerIsDark ? "bg-white/20 border-white/15" : "bg-black/10 border-black/10"}`}>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 text-[#FFCC02] ${headerIsDark ? "drop-shadow-md" : ""}`} />
            <h1 className={`text-[20px] font-bold leading-tight transition-colors duration-300 ${headerIsDark ? "text-white drop-shadow-md" : "text-gray-900"}`}>Trending</h1>
          </div>
          <div className={`flex items-center gap-1.5 backdrop-blur-md rounded-full px-2.5 py-1 transition-colors duration-300 ${headerIsDark ? "bg-white/15" : "bg-black/8"}`}>
            <MapPin className="w-3 h-3 text-[#E53935]" />
            <span className={`text-[12px] font-medium transition-colors duration-300 ${headerIsDark ? "text-white/90" : "text-gray-800"}`}>{activeDistrict}</span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-y-auto snap-y snap-mandatory hide-scrollbar"
        style={{ scrollBehavior: "smooth", height: "calc(100dvh - 52px)", overscrollBehavior: "contain" }}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 text-white" style={{ height: "calc(100dvh - 52px)" }}>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <TrendingUp className="w-10 h-10 text-[#FFCC02]" />
            </motion.div>
            <p className="text-white/70 text-sm">Loading trending spots…</p>
          </div>
        )}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 text-white" style={{ height: "calc(100dvh - 52px)" }}>
            <TrendingUp className="w-10 h-10 text-white/30" />
            <p className="text-white/60 text-sm">Couldn't load trending feed</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 rounded-full bg-white/15 text-white text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 text-white" style={{ height: "calc(100dvh - 52px)" }}>
            <TrendingUp className="w-10 h-10 text-white/30" />
            <p className="text-white/60 text-sm">No trending spots right now</p>
          </div>
        )}
        {posts.map((post, index) => (
          <FullScreenSlide
            key={post.id}
            post={post}
            isSaved={isRestaurantSaved(post.restaurantId)}
            isLiked={likedPosts.has(post.restaurantId)}
            onSave={() => handleSave(post)}
            onLike={() => handleLike(post)}
            onShare={() => handleShare(post)}
            onNavigate={() => handleNavigate(post)}
            onInviteSwipe={() => handleInviteSwipe(post)}
            onHeaderBrightness={(dark) => setHeaderBrightness(prev => prev[index] === dark ? prev : { ...prev, [index]: dark })}
          />
        ))}
      </div>

      <BottomNav />
    </motion.div>
  );
}
