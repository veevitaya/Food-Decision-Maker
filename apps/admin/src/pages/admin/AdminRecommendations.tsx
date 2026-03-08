import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type RecommendationFeatures = {
  totals: { userSnapshots: number; itemSnapshots: number };
  freshnessHours: {
    avgUser: number;
    avgItem: number;
    staleUserOver72h: number;
    staleItemOver72h: number;
  };
  userSamples: Array<{
    userId: string;
    preferredPriceLevel: number | null;
    activeHours: number[];
    topCuisineAffinity: Array<[string, number]>;
    dislikedCount: number;
    updatedAt: string;
  }>;
  itemSamples: Array<{
    itemId: number;
    ctr: number;
    likeRate: number;
    superLikeRate: number;
    conversionRate: number;
    updatedAt: string;
  }>;
};

export default function AdminRecommendations() {
  const { data, isLoading } = useQuery<RecommendationFeatures>({
    queryKey: ["/api/admin/recommendations/features"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-recommendations-page">
      <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-2">
        <h3 className="text-[15px] font-semibold text-foreground">Feature Snapshot Health</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">User Snapshots: <b>{data?.totals.userSnapshots ?? 0}</b></div>
          <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">Item Snapshots: <b>{data?.totals.itemSnapshots ?? 0}</b></div>
          <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">Avg User Freshness: <b>{data?.freshnessHours.avgUser ?? 0}h</b></div>
          <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">Avg Item Freshness: <b>{data?.freshnessHours.avgItem ?? 0}h</b></div>
          <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">Stale Users (&gt;72h): <b>{data?.freshnessHours.staleUserOver72h ?? 0}</b></div>
          <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">Stale Items (&gt;72h): <b>{data?.freshnessHours.staleItemOver72h ?? 0}</b></div>
        </div>
      </section>

      <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-2">
        <h3 className="text-[15px] font-semibold text-foreground">Top User Affinity Samples</h3>
        <div className="space-y-2">
          {(data?.userSamples ?? []).slice(0, 8).map((sample) => (
            <div key={sample.userId} className="text-sm flex items-center justify-between gap-3 border-b border-gray-100 dark:border-border py-1.5">
              <span className="truncate text-foreground">{sample.userId}</span>
              <span className="text-muted-foreground">{sample.topCuisineAffinity[0]?.[0] ?? "none"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

