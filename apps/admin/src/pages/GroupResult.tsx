import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { MapPin, Share2, RotateCcw, Trophy, Users, ChevronRight, RefreshCw } from "lucide-react";
import { shareMessage } from "@/lib/liff";
import { useLineProfile } from "@/lib/useLineProfile";
import { trackEvent } from "@/lib/analytics";

interface ResultItem {
  menuItemId: number;
  score: number;
  agreeCount: number;
  item: {
    id: number;
    name: string;
    imageUrl: string;
    address: string;
    rating: string;
    priceLevel: number;
  } | null;
}

interface GroupResultData {
  code: string;
  memberCount: number;
  hasStrongMatch: boolean;
  top3: ResultItem[];
  winner: ResultItem | null;
}

interface FinalVoteState {
  completed: boolean;
  totalVotes: number;
  memberCount: number;
  winnerId: number | null;
  winnerVotes: number;
  winner: {
    id: number;
    name: string;
    imageUrl: string;
    address: string;
    rating: string;
    priceLevel: number;
  } | null;
}

function ConfettiPop() {
  const colors = ["#FF385C", "#FFD700", "#00A699", "#FC642D", "#7B61FF"];
  const pieces = useMemo(() =>
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 600,
      ty: -(200 + Math.random() * 400),
      spin: (Math.random() - 0.5) * 720,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 7,
      delay: Math.random() * 0.2,
      duration: 1.5 + Math.random() * 1,
    })), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            top: "50%", left: "50%",
            width: p.size, height: p.size * 0.5,
            backgroundColor: p.color,
            animation: `confetti-explode ${p.duration}s ease-out ${p.delay}s forwards`,
            ["--tx" as any]: `${p.tx}px`,
            ["--ty" as any]: `${p.ty}px`,
            ["--ty-end" as any]: `${Math.abs(p.ty) * 0.3}px`,
            ["--spin" as any]: `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default function GroupResult() {
  const [, navigate] = useLocation();
  const { profile } = useLineProfile();
  const sessionCode = new URLSearchParams(window.location.search).get("session") || "";

  const [result, setResult] = useState<GroupResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [finalState, setFinalState] = useState<FinalVoteState | null>(null);
  const [voting, setVoting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sharing, setSharing] = useState(false);
  const autoSharedRef = useRef(false);

  useEffect(() => {
    if (!sessionCode) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/group/${sessionCode}/result`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
          if (data.hasStrongMatch && data.winner) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
          }
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [sessionCode]);

  // Poll for final vote result once voting has started
  useEffect(() => {
    if (!sessionCode || !myVote) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/group/${sessionCode}/result`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        }
      } catch {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [sessionCode, myVote]);

  const handleVote = async (menuItemId: number) => {
    if (!profile || voting || myVote) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/group/${sessionCode}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterName: profile.userId, menuItemId }),
      });
      if (res.ok) {
        const data: FinalVoteState = await res.json();
        setMyVote(menuItemId);
        setFinalState(data);
        if (data.completed && data.winner) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
          trackEvent("share_event", { metadata: { type: "group_result", code: sessionCode } });
        }
      }
    } catch {}
    setVoting(false);
  };

  // Auto-share to LINE when vote completes
  useEffect(() => {
    if (!finalState?.completed || !finalState.winner || autoSharedRef.current) return;
    autoSharedRef.current = true;
    const w = finalState.winner;
    const text = `Toast decided! We're going to ${w.name} 🍽️\n📍 ${w.address}\n⭐ ${w.rating} | ${"฿".repeat(w.priceLevel)}\n\nDecided with Toast — the food decision app!`;
    shareMessage(text).catch(() => {});
  }, [finalState?.completed, finalState?.winner]);

  const handleShare = async () => {
    setSharing(true);
    const winner = finalState?.winner ?? result?.winner?.item ?? result?.top3[0]?.item;
    if (!winner) { setSharing(false); return; }
    const text = `Toast decided! We're going to ${winner.name} 🍽️\n📍 ${winner.address}\n⭐ ${winner.rating} | ${"฿".repeat(winner.priceLevel)}\n\nDecided with Toast — the food decision app!`;
    await shareMessage(text);
    setSharing(false);
  };

  const handleMapsLink = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + " Bangkok")}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="w-full h-[100dvh] bg-[#FCFCFC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" />
      </div>
    );
  }

  if (!result || result.top3.length === 0) {
    return (
      <div className="w-full h-[100dvh] bg-[#FCFCFC] flex flex-col items-center justify-center px-6 text-center">
        <span className="text-5xl mb-4">🤔</span>
        <h2 className="text-xl font-bold mb-2">No matches found</h2>
        <p className="text-sm text-muted-foreground mb-6">Your group didn't agree on anything this round. Try again with different options!</p>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3.5 rounded-2xl bg-foreground text-white font-bold text-sm active:scale-[0.97] transition-transform"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const finalWinner = finalState?.completed ? finalState.winner : null;
  const showVoting = !finalState?.completed && !result.hasStrongMatch;

  return (
    <div className="w-full min-h-[100dvh] bg-[hsl(30,20%,97%)] flex flex-col">
      {showConfetti && <ConfettiPop />}

      {/* Header */}
      <div className="px-6 pt-12 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-full bg-[#FFCC02]/15 flex items-center justify-center">
            <Trophy className="w-4.5 h-4.5 text-[#2d2000]" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight">
              {finalWinner ? "It's decided!" : result.hasStrongMatch ? "Strong Match!" : "Vote for the winner"}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {result.memberCount} people · Session {sessionCode}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 pb-32">

        {/* Strong match or final winner — show as hero */}
        {(result.hasStrongMatch || finalWinner) && (() => {
          const hero = finalWinner ?? result.winner?.item;
          const heroEntry = finalWinner ? null : result.winner;
          if (!hero) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] overflow-hidden"
              style={{ boxShadow: "0 20px 60px -15px rgba(0,0,0,0.15)" }}
            >
              <div className="relative">
                <img src={hero.imageUrl} alt={hero.name} className="w-full h-52 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="bg-[#FFCC02] text-[#2d2000] text-xs font-black px-3 py-1.5 rounded-full">
                    {finalWinner ? "Winner" : "Strong Match"}
                  </span>
                </div>
                {heroEntry && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-bold text-foreground">
                    {heroEntry.agreeCount}/{result.memberCount} agree
                  </div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-xl font-bold mb-1">{hero.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span>★ {hero.rating}</span>
                  <span>·</span>
                  <span>{"฿".repeat(hero.priceLevel)}</span>
                  <span>·</span>
                  <span className="truncate">{hero.address}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleMapsLink(hero.address)}
                    className="flex-1 py-3 rounded-2xl bg-foreground text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                  >
                    <MapPin className="w-4 h-4" />
                    Open Maps
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="flex-1 py-3 rounded-2xl bg-[#06C755] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
                  >
                    <Share2 className="w-4 h-4" />
                    {sharing ? "Sharing..." : "Share to LINE"}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Top 3 list — show voting UI if no strong match yet */}
        {showVoting && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Top {result.top3.length} — tap to vote
            </p>
            {result.top3.map((entry, idx) => {
              if (!entry.item) return null;
              const isVoted = myVote === entry.menuItemId;
              return (
                <motion.div
                  key={entry.menuItemId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  onClick={() => !myVote && handleVote(entry.menuItemId)}
                  className={`bg-white rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    isVoted
                      ? "border-[#FFCC02] shadow-[0_0_0_3px_rgba(255,204,2,0.15)]"
                      : myVote
                      ? "border-transparent opacity-60"
                      : "border-transparent hover:border-gray-200"
                  }`}
                  style={{ boxShadow: isVoted ? "0 8px 30px -8px rgba(255,204,2,0.25)" : "0 4px 16px rgba(0,0,0,0.06)" }}
                >
                  <div className="flex">
                    <div className="relative w-28 h-28 flex-shrink-0">
                      <img src={entry.item.imageUrl} alt={entry.item.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                        <span className="text-white text-[11px] font-black">#{idx + 1}</span>
                      </div>
                    </div>
                    <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-[15px] truncate">{entry.item.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.item.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium">★ {entry.item.rating}</span>
                          <span className="text-xs text-muted-foreground">{"฿".repeat(entry.item.priceLevel)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <div className="text-xs text-muted-foreground">
                            {entry.agreeCount}/{result.memberCount} liked
                          </div>
                          <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden ml-1">
                            <div
                              className="h-full rounded-full bg-[#FFCC02]"
                              style={{ width: `${result.memberCount > 0 ? (entry.agreeCount / result.memberCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        {isVoted && (
                          <span className="text-[10px] font-black text-[#2d2000] bg-[#FFCC02] rounded-full px-2 py-0.5">
                            Your vote
                          </span>
                        )}
                        {!myVote && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}

        {/* After voting but not complete yet */}
        {myVote && !finalState?.completed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 rounded-2xl px-4 py-4 text-center border border-amber-100"
          >
            <p className="text-sm font-semibold text-amber-900">Vote submitted!</p>
            <p className="text-xs text-amber-700 mt-0.5">Waiting for others to vote...</p>
          </motion.div>
        )}

        {/* Non-voting summary for strong-match or winner */}
        {!showVoting && !finalWinner && result.top3.length > 1 && (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 pt-2">All results</p>
            {result.top3.slice(1).map((entry, idx) => {
              if (!entry.item) return null;
              return (
                <motion.div
                  key={entry.menuItemId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx + 1) * 0.06 }}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}
                >
                  <div className="flex">
                    <img src={entry.item.imageUrl} alt={entry.item.name} className="w-20 h-20 object-cover flex-shrink-0" />
                    <div className="p-3 flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{entry.item.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.item.address}</p>
                      <p className="text-xs text-muted-foreground mt-1">{entry.agreeCount}/{result.memberCount} liked · ★ {entry.item.rating}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 pb-8 space-y-3">
        {!finalWinner && !result.hasStrongMatch && !myVote && (
          <p className="text-center text-xs text-muted-foreground">
            No strong match — tap a result to vote for the final pick
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            New Session
          </button>
          {(finalWinner || result.hasStrongMatch) && (
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 py-3.5 rounded-2xl bg-[#06C755] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
            >
              <Share2 className="w-4 h-4" />
              {sharing ? "Sharing..." : "Share to LINE"}
            </button>
          )}
        </div>
        {(finalWinner || result.hasStrongMatch) && (
          <button
            onClick={() => navigate(`/group/setup?again=${sessionCode}`)}
            className="w-full py-3 rounded-2xl border border-gray-200 text-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Play again with same group?
          </button>
        )}
      </div>
    </div>
  );
}
