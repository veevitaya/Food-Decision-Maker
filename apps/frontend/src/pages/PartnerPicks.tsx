import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLineProfile } from "@/hooks/use-line-profile";
import { BottomNav } from "@/components/BottomNav";
import { trackEvent } from "@/lib/analytics";

interface MemberScore {
  memberId: number;
  name: string;
  avatarUrl: string | null;
  matchPct: number;
}

interface CompatibilityScore {
  overall: number;
  cuisineOverlap: number;
  priceAlignment: number;
  explanation: string[];
}

interface PartnerRestaurant {
  id: number;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  priceLevel: number;
  rating: string;
  address: string;
  isNew?: boolean;
  groupScore: number;
  memberScores: MemberScore[];
}

interface PartnerRecsResponse {
  source: string;
  linked: boolean;
  compatibilityScore: CompatibilityScore | null;
  memberCount: number;
  membersWithData: number;
  partnerDisplayName?: string;
  partnerPictureUrl?: string | null;
  items: PartnerRestaurant[];
}

function CompatibilityCard({ score, userAvatarUrl, userName, partnerAvatarUrl, partnerName }: {
  score: CompatibilityScore;
  userAvatarUrl?: string;
  userName: string;
  partnerAvatarUrl?: string | null;
  partnerName: string;
}) {
  const ringColor = score.overall >= 70 ? "#4ade80" : score.overall >= 40 ? "#facc15" : "#d1d5db";
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference * (1 - score.overall / 100);

  return (
    <div className="mx-4 mb-4 bg-gradient-to-br from-rose-50 to-amber-50 rounded-3xl p-4"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center gap-4">
        {/* Circular gauge */}
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none" stroke="#f3f4f6" strokeWidth="7" />
            <circle
              cx="44" cy="44" r="36" fill="none"
              stroke={ringColor} strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 44 44)"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-foreground">{score.overall}%</span>
            <span className="text-[9px] text-muted-foreground font-medium leading-none">match</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Avatars */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex -space-x-2">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} className="w-6 h-6 rounded-full border-2 border-white object-cover" alt={userName} />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-amber-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-amber-600">{userName.charAt(0)}</span>
                </div>
              )}
              {partnerAvatarUrl ? (
                <img src={partnerAvatarUrl} className="w-6 h-6 rounded-full border-2 border-white object-cover" alt={partnerName} />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-rose-100 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-rose-600">{partnerName.charAt(0)}</span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium truncate">
              {userName} & {partnerName}
            </span>
          </div>

          {/* Sub-bars */}
          <div className="flex flex-col gap-1.5">
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                <span>Cuisine overlap</span><span>{score.cuisineOverlap}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-400 transition-all duration-700"
                  style={{ width: `${score.cuisineOverlap}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                <span>Budget alignment</span><span>{score.priceAlignment}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-700"
                  style={{ width: `${score.priceAlignment}%` }} />
              </div>
            </div>
          </div>

          {/* Explanation */}
          {score.explanation.length > 0 && (
            <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-relaxed line-clamp-2">
              {score.explanation.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantCard({ item, onNavigate }: { item: PartnerRestaurant; onNavigate: (id: number) => void }) {
  return (
    <div
      className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
      onClick={() => onNavigate(item.id)}
    >
      <div className="relative h-36">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {item.isNew && (
          <div className="absolute top-3 left-3 bg-white/95 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">New</div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-semibold text-base truncate">{item.name}</h3>
          <div className="flex items-center gap-1.5 text-white/80 text-xs">
            <span className="truncate">{item.category}</span>
            <span>·</span>
            <span>{"฿".repeat(item.priceLevel)}</span>
            <span>·</span>
            <span>★ {item.rating}</span>
          </div>
        </div>
      </div>

      <div className="px-3 pt-2.5 pb-3">
        <p className="text-foreground/60 text-xs leading-relaxed line-clamp-2 mb-2">{item.description}</p>

        {/* Per-member match scores */}
        {item.memberScores && item.memberScores.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.memberScores.map((ms) => (
              <div key={ms.memberId} className="flex items-center gap-1">
                <div className={`rounded-full border-2 ${
                  ms.matchPct >= 70 ? "border-green-400" :
                  ms.matchPct >= 40 ? "border-yellow-400" : "border-gray-300"
                }`}>
                  {ms.avatarUrl ? (
                    <img src={ms.avatarUrl} className="w-5 h-5 rounded-full object-cover" alt={ms.name} />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-amber-600">{ms.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <span
                  className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                  style={{
                    background: ms.matchPct >= 70 ? "hsl(160,60%,92%)" : ms.matchPct >= 40 ? "hsl(45,95%,90%)" : "hsl(0,0%,94%)",
                    color: ms.matchPct >= 70 ? "hsl(160,60%,35%)" : ms.matchPct >= 40 ? "hsl(45,80%,35%)" : "hsl(0,0%,45%)",
                  }}
                >
                  {ms.matchPct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PartnerPicks() {
  const [, navigate] = useLocation();
  const { profile } = useLineProfile();
  const [data, setData] = useState<PartnerRecsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const BANGKOK = { lat: 13.7563, lng: 100.5018 };

  useEffect(() => {
    const getCoords = (): Promise<{ lat: number; lng: number }> => {
      const fallback = new Promise<typeof BANGKOK>((resolve) => setTimeout(() => resolve(BANGKOK), 3000));
      const geo = new Promise<typeof BANGKOK>((resolve) => {
        if (!navigator.geolocation) { resolve(BANGKOK); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(BANGKOK),
          { timeout: 2500 },
        );
      });
      return Promise.race([geo, fallback]);
    };
    getCoords().then(setUserLocation);
  }, []);

  useEffect(() => {
    if (!profile?.userId || !userLocation) return;
    const { lat, lng } = userLocation;
    const now = new Date();
    fetch(
      `/api/recommendations/partner?userId=${profile.userId}&lat=${lat}&lng=${lng}&hour=${now.getHours()}&day=${now.getDay()}&limit=20`,
    )
      .then((res) => res.ok ? res.json() : null)
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile?.userId, userLocation]);

  const handleRestaurantClick = (id: number) => {
    trackEvent("view_restaurant", { restaurantId: id, metadata: { source: "partner_picks" } });
    navigate(`/restaurant/${id}`);
  };

  if (loading) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not linked — show empty state
  if (!data?.linked) {
    return (
      <div className="w-full min-h-[100dvh] bg-white flex flex-col">
        <div className="px-6 pt-14 pb-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground text-sm mb-6 inline-block">← Back</button>
          <h1 className="text-2xl font-bold text-foreground">Date Night Picks</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4 pb-24">
          <div className="text-5xl">💕</div>
          <h2 className="text-lg font-semibold text-foreground">Link your partner first</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Go to your Profile, send an invite to your partner, and get blended recommendations based on both your tastes.
          </p>
          <button
            onClick={() => navigate("/profile")}
            className="mt-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, hsl(348,83%,55%) 0%, hsl(20,90%,60%) 100%)", boxShadow: "0 4px 20px rgba(220,38,38,0.2)" }}
          >
            Go to Profile
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const partnerName = data.partnerDisplayName ?? "Partner";
  const partnerPictureUrl = data.partnerPictureUrl;

  return (
    <div className="w-full min-h-[100dvh] bg-gray-50 flex flex-col pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-4 bg-white">
        <button onClick={() => navigate("/")} className="text-muted-foreground text-sm mb-3 inline-block">← Back</button>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            {profile?.pictureUrl ? (
              <img src={profile.pictureUrl} className="w-9 h-9 rounded-full border-2 border-white object-cover z-10" alt="You" />
            ) : (
              <div className="w-9 h-9 rounded-full border-2 border-white bg-amber-100 flex items-center justify-center z-10">
                <span className="text-xs font-bold text-amber-600">{(profile?.displayName ?? "Y").charAt(0)}</span>
              </div>
            )}
            {partnerPictureUrl ? (
              <img src={partnerPictureUrl} className="w-9 h-9 rounded-full border-2 border-white object-cover" alt={partnerName} />
            ) : (
              <div className="w-9 h-9 rounded-full border-2 border-white bg-rose-100 flex items-center justify-center">
                <span className="text-xs font-bold text-rose-600">{partnerName.charAt(0)}</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">With {partnerName}</h1>
            <p className="text-[11px] text-muted-foreground">
              {data.membersWithData === 2
                ? "Blended for both of you"
                : data.membersWithData === 1
                ? "Partial data — needs more swipes"
                : "Trending picks — swipe more to personalize"}
            </p>
          </div>
        </div>
      </div>

      {/* Compatibility card */}
      {data.compatibilityScore && (
        <div className="pt-4">
          <CompatibilityCard
            score={data.compatibilityScore}
            userAvatarUrl={profile?.pictureUrl}
            userName={profile?.displayName ?? "You"}
            partnerAvatarUrl={partnerPictureUrl}
            partnerName={partnerName}
          />
        </div>
      )}

      {/* Swipe together CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={() => navigate("/group/setup")}
          className="w-full py-3 rounded-2xl font-semibold text-sm text-white active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, hsl(348,83%,55%) 0%, hsl(20,90%,60%) 100%)",
            boxShadow: "0 4px 16px rgba(220,38,38,0.2)",
          }}
        >
          💕 Swipe Together
        </button>
      </div>

      {/* Restaurant list */}
      <div className="flex-1">
        {data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-8">
            <span className="text-4xl">🍽️</span>
            <p className="text-muted-foreground text-sm">No restaurants found. Try again later.</p>
          </div>
        ) : (
          data.items.map((item) => (
            <RestaurantCard key={item.id} item={item} onNavigate={handleRestaurantClick} />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
