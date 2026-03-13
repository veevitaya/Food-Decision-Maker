import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { useLineProfile } from "@/lib/useLineProfile";
import { shareWithLiffOrClipboard } from "@/lib/share";

type ResultItem = {
  menuItemId: number;
  agreeCount: number;
  item: {
    id: number;
    name: string;
    imageUrl: string;
    address: string;
    rating: string;
    priceLevel: number;
    restaurantCount?: number;
  } | null;
};

type GroupResultResponse = {
  mode: "restaurant" | "menu";
  memberCount: number;
  top3: ResultItem[];
};

type VoteResponse = {
  mode: "restaurant" | "menu";
  completed: boolean;
  totalVotes: number;
  memberCount: number;
  winner: {
    id: number;
    name: string;
    imageUrl: string;
    address: string;
    rating: string;
    priceLevel: number;
    restaurantCount?: number;
  } | null;
};

export default function GroupFinalVote() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [winner, setWinner] = useState<VoteResponse["winner"]>(null);
  const [shareState, setShareState] = useState("");
  const { profile } = useLineProfile();
  const [, navigate] = useLocation();
  const sessionCode = useMemo(
    () => (new URLSearchParams(window.location.search).get("session") || "").toUpperCase(),
    [],
  );

  const { data, isLoading } = useQuery<GroupResultResponse>({
    queryKey: ["/api/group/final-vote", sessionCode],
    enabled: Boolean(sessionCode),
    queryFn: async () => {
      const res = await fetch(`/api/group/${sessionCode}/result`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load final vote options");
      return res.json();
    },
  });

  const options = data?.top3?.filter((item) => item.item) ?? [];

  const submitVote = async () => {
    if (!selectedId || !profile) return;
    const res = await fetch(`/api/group/${sessionCode}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ voterName: profile.displayName, menuItemId: selectedId }),
    });
    if (!res.ok) return;
    const payload = (await res.json()) as VoteResponse;
    if (payload.winner) setWinner(payload.winner);
  };

  const shareWinner = async () => {
    if (!winner) return;
    const mapsUrl = data?.mode === "menu"
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name + " " + winner.address)}`;
    const shareMessage = data?.mode === "menu"
      ? `Toast final dish winner: ${winner.name}\nAvailable nearby: ${winner.address}\nSearch: ${mapsUrl}`
      : `Toast final vote winner: ${winner.name}\n${winner.address}\nMaps: ${mapsUrl}`;
    const method = await shareWithLiffOrClipboard(shareMessage);
    setShareState(method === "clipboard" ? "Copied to clipboard." : method === "failed" ? "Share failed." : "Shared.");
  };

  if (isLoading) {
    return <div className="w-full h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" /></div>;
  }

  if (winner) {
    return (
      <div className="w-full min-h-[100dvh] bg-[hsl(30,20%,97%)] pb-24 px-6 pt-14" data-testid="group-final-winner-page">
        <h1 className="text-[26px] font-bold tracking-tight">Final Winner</h1>
        <div className="mt-5 rounded-2xl bg-white border border-gray-100 overflow-hidden">
          <img src={winner.imageUrl} alt={winner.name} className="w-full h-52 object-cover" />
          <div className="p-4">
            <p className="font-semibold text-lg">{winner.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{winner.address}</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          {data?.mode === "menu" ? (
            <button onClick={() => navigate(`/group/menu-restaurants?session=${sessionCode}&menuItem=${winner.id}`)} className="w-full py-3.5 rounded-2xl bg-[#FFCC02] text-[#2d2000] font-bold">View Restaurants for Dish</button>
          ) : (
            <button onClick={() => navigate(`/restaurant/${winner.id}`)} className="w-full py-3.5 rounded-2xl bg-[#FFCC02] text-[#2d2000] font-bold">Open Restaurant</button>
          )}
          <button onClick={shareWinner} className="w-full py-3.5 rounded-2xl bg-white border border-gray-200 font-semibold">Share to LINE</button>
          {shareState ? <p className="text-xs text-muted-foreground text-center">{shareState}</p> : null}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[hsl(30,20%,97%)] pb-24 px-6 pt-14" data-testid="group-final-vote-page">
      <h1 className="text-[26px] font-bold tracking-tight">Final Vote</h1>
      <p className="text-sm text-muted-foreground mt-1">Pick one from your group top 3</p>
      <div className="mt-5 space-y-3">
        {options.map((entry) => (
          <button
            key={entry.menuItemId}
            onClick={() => setSelectedId(entry.menuItemId)}
            className={`w-full rounded-2xl border bg-white p-3 flex gap-3 ${selectedId === entry.menuItemId ? "border-[#FFCC02] ring-1 ring-[#FFCC02]" : "border-gray-100"}`}
            data-testid={`final-vote-option-${entry.menuItemId}`}
          >
            <img src={entry.item?.imageUrl || ""} alt={entry.item?.name || "option"} className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
            <div className="min-w-0 text-left">
              <p className="font-semibold truncate">{entry.item?.name}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.item?.address}</p>
              <p className="text-xs mt-1">{entry.agreeCount}/{data?.memberCount ?? 0} agree</p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={submitVote}
        disabled={!selectedId}
        className="mt-5 w-full py-3.5 rounded-2xl bg-foreground text-white font-bold disabled:opacity-40"
        data-testid="button-submit-final-vote"
      >
        Submit Vote
      </button>
      <BottomNav />
    </div>
  );
}
