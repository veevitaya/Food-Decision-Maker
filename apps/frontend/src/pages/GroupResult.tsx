import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { shareWithLiffOrClipboard } from "@/lib/share";
import { useLanguage } from "@/i18n/LanguageProvider";

type ResultItem = {
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
    restaurantCount?: number;
  } | null;
};

type GroupResultResponse = {
  code: string;
  mode: "restaurant" | "menu";
  memberCount: number;
  hasStrongMatch: boolean;
  top3: ResultItem[];
  winner: ResultItem | null;
};

export default function GroupResult() {
  const [shareState, setShareState] = useState<string>("");
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const sessionCode = useMemo(
    () => (new URLSearchParams(window.location.search).get("session") || "").toUpperCase(),
    [],
  );

  const { data, isLoading } = useQuery<GroupResultResponse>({
    queryKey: ["/api/group/result", sessionCode],
    enabled: Boolean(sessionCode),
    queryFn: async () => {
      const res = await fetch(`/api/group/${sessionCode}/result`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load result");
      return res.json();
    },
  });

  const top3 = data?.top3 ?? [];
  const winner = data?.winner?.item ?? null;

  const handleShare = async () => {
    if (!winner) return;
    const mapsUrl =
      data?.mode === "menu"
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name + " " + winner.address)}`;
    const message =
      data?.mode === "menu"
        ? `Toast group dish pick: ${winner.name}\nAvailable nearby: ${winner.address}\nSearch: ${mapsUrl}`
        : `Toast group pick: ${winner.name}\n${winner.address}\nMaps: ${mapsUrl}`;
    const method = await shareWithLiffOrClipboard(message);
    setShareState(method === "clipboard" ? "Copied to clipboard." : method === "failed" ? "Share failed." : "Shared.");
  };

  if (isLoading) {
    return <div className="w-full h-[100dvh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-foreground animate-spin" /></div>;
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[hsl(30,20%,97%)] pb-24 px-6 pt-12" data-testid="group-result-page">
      <h1 className="text-[26px] font-bold tracking-tight">{t("group_result.title")}</h1>
      <p className="text-sm text-muted-foreground mt-1">{t("group_result.session", { code: sessionCode })}</p>

      <div className="mt-5 space-y-3">
        {top3.map((entry, idx) => (
          <div key={entry.menuItemId} className="rounded-2xl bg-white border border-gray-100 p-3 flex gap-3" data-testid={`group-top-${idx + 1}`}>
            <img src={entry.item?.imageUrl || ""} alt={entry.item?.name || "match"} className="w-20 h-20 rounded-xl object-cover bg-gray-100" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">#{idx + 1}</p>
              <p className="font-semibold truncate">{entry.item?.name ?? "Unknown"}</p>
              <p className="text-xs text-muted-foreground truncate">{entry.item?.address ?? ""}</p>
              <p className="text-xs mt-1 font-medium">{entry.agreeCount}/{data?.memberCount ?? 0} {t("group_result.agree")}</p>
            </div>
          </div>
        ))}
      </div>

      {data?.hasStrongMatch && winner ? (
        <div className="mt-6 space-y-2">
          {data.mode === "menu" ? (
            <button
              onClick={() => navigate(`/group/menu-restaurants?session=${sessionCode}&menuItem=${winner.id}`)}
              className="w-full py-3.5 rounded-2xl bg-[#FFCC02] text-[#2d2000] font-bold"
              data-testid="button-open-winner-menu"
            >
              {t("group_result.open_restaurants")}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/restaurant/${winner.id}`)}
              className="w-full py-3.5 rounded-2xl bg-[#FFCC02] text-[#2d2000] font-bold"
              data-testid="button-open-winner"
            >
              {t("group_result.open_winner")}
            </button>
          )}
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl bg-white border border-gray-200 font-semibold"
            data-testid="button-share-group-result"
          >
            {t("group_result.share")}
          </button>
          {shareState ? <p className="text-xs text-muted-foreground text-center">{shareState}</p> : null}
        </div>
      ) : (
        <button
          onClick={() => navigate(`/group/final-vote?session=${sessionCode}`)}
          className="mt-6 w-full py-3.5 rounded-2xl bg-foreground text-white font-bold"
          data-testid="button-go-final-vote"
        >
          {t("group_result.final_vote")}
        </button>
      )}

      <BottomNav />
    </div>
  );
}
