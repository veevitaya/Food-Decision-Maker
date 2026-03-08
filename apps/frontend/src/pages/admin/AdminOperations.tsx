import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type SloData = {
  windowHours: number;
  totals: { events: number };
  slos: {
    timestampCoveragePct: number;
    platformCoveragePct: number;
    contextCoveragePct: number;
  };
  status: {
    timestampCoverageOk: boolean;
    platformCoverageOk: boolean;
    contextCoverageOk: boolean;
  };
};

type OpsLogs = {
  total: number;
  items: Array<{ ts: string; level: string; source: string; message: string }>;
};

export default function AdminOperations() {
  const { data: slo, isLoading: loadingSlo } = useQuery<SloData>({ queryKey: ["/api/admin/ops/slo"] });
  const { data: logs, isLoading: loadingLogs } = useQuery<OpsLogs>({ queryKey: ["/api/admin/ops/logs?limit=30"] });

  return (
    <div className="space-y-6" data-testid="admin-operations-page">
      <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-3">
        <h3 className="text-[15px] font-semibold text-foreground">SLO Status (24h)</h3>
        {loadingSlo ? <Skeleton className="h-20 w-full" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">Timestamp Coverage: <b>{slo?.slos.timestampCoveragePct ?? 0}%</b></div>
            <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">Platform Coverage: <b>{slo?.slos.platformCoveragePct ?? 0}%</b></div>
            <div className="rounded-xl bg-gray-50 dark:bg-muted p-3">Context Coverage: <b>{slo?.slos.contextCoveragePct ?? 0}%</b></div>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-3">
        <h3 className="text-[15px] font-semibold text-foreground">Ops Logs</h3>
        {loadingLogs ? <Skeleton className="h-28 w-full" /> : (
          <div className="space-y-2">
            {(logs?.items ?? []).map((log, idx) => (
              <div key={`${log.ts}-${idx}`} className="text-sm border-b border-gray-100 dark:border-border py-1.5">
                <span className="text-muted-foreground mr-2">{new Date(log.ts).toLocaleString()}</span>
                <span className="font-medium text-foreground mr-2">{log.source}</span>
                <span className="text-foreground">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

