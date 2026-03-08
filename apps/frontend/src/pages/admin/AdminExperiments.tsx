import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Experiment = {
  experimentKey: string;
  enabled: boolean;
  variants: Array<{ key: string; weight: number }>;
};

type ExperimentConfig = {
  experiments: Experiment[];
};

export default function AdminExperiments() {
  const { data, isLoading } = useQuery<ExperimentConfig>({
    queryKey: ["/api/admin/experiments/config"],
  });

  const runSampleAssign = async () => {
    await apiRequest("POST", "/api/experiments/assign", {
      userId: "demo-user",
      experimentKey: "recommendation_ranking_v1",
    });
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/experiments/config"] });
  };

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-6" data-testid="admin-experiments-page">
      <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground">A/B Experiment Config</h3>
          <Button size="sm" onClick={runSampleAssign}>Run Sample Assign</Button>
        </div>
        {(data?.experiments ?? []).map((exp) => (
          <div key={exp.experimentKey} className="rounded-xl bg-gray-50 dark:bg-muted p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">{exp.experimentKey}</p>
            <p className="text-xs text-muted-foreground">Enabled: {String(exp.enabled)}</p>
            <p className="text-xs text-muted-foreground">
              Variants: {exp.variants.map((v) => `${v.key} (${v.weight})`).join(", ")}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

