import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type SecurityAuditResponse = {
  total: number;
  items: Array<{
    ts: string;
    level: string;
    source: string;
    message: string;
    metadata?: Record<string, unknown>;
  }>;
};

export default function AdminSecurityAudit() {
  const { data, isLoading } = useQuery<SecurityAuditResponse>({
    queryKey: ["/api/admin/security/audit?limit=100"],
  });

  return (
    <div className="space-y-6" data-testid="admin-security-audit-page">
      <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-3">
        <h3 className="text-[15px] font-semibold text-foreground">Security Audit Trail</h3>
        {isLoading ? <Skeleton className="h-40 w-full" /> : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {(data?.items ?? []).map((item, idx) => (
              <div key={`${item.ts}-${idx}`} className="text-sm border-b border-gray-100 dark:border-border py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{new Date(item.ts).toLocaleString()}</span>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100 dark:bg-muted text-foreground">{item.level}</span>
                </div>
                <div className="mt-1">
                  <span className="font-medium text-foreground">{item.source}</span>
                  <span className="text-foreground ml-2">{item.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

