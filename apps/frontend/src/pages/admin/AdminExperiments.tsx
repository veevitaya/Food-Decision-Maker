import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Experiment = {
  experimentKey: string;
  enabled: boolean;
  variants: Array<{ key: string; weight: number }>;
};

type ScoringWeights = {
  cuisineAffinity: number;
  priceMatch: number;
  distanceScore: number;
  globalPopularity: number;
  recentNegativePenalty: number;
};

type ExperimentConfig = {
  experiments: Experiment[];
  recommendationWeights: {
    activePresetKey: string;
    presets: Record<string, ScoringWeights>;
  };
};

export default function AdminExperiments() {
  const { data, isLoading } = useQuery<ExperimentConfig>({
    queryKey: ["/api/admin/experiments/config"],
  });

  const [experimentsJson, setExperimentsJson] = useState("[]");
  const [presetsJson, setPresetsJson] = useState("{}");
  const [activePresetKey, setActivePresetKey] = useState("control");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setExperimentsJson(JSON.stringify(data.experiments, null, 2));
    setPresetsJson(JSON.stringify(data.recommendationWeights?.presets ?? {}, null, 2));
    setActivePresetKey(data.recommendationWeights?.activePresetKey ?? "control");
  }, [data]);

  const presetKeys = useMemo(() => {
    try {
      const parsed = JSON.parse(presetsJson) as Record<string, unknown>;
      return Object.keys(parsed);
    } catch {
      return [];
    }
  }, [presetsJson]);

  const runSampleAssign = async () => {
    await apiRequest("POST", "/api/experiments/assign", {
      userId: "demo-user",
      experimentKey: "recommendation_ranking_v1",
    });
  };

  const saveConfig = async () => {
    setError(null);
    setSavedMessage(null);

    let experiments: Experiment[];
    let presets: Record<string, ScoringWeights>;

    try {
      experiments = JSON.parse(experimentsJson) as Experiment[];
      presets = JSON.parse(presetsJson) as Record<string, ScoringWeights>;
    } catch {
      setError("Invalid JSON in editor.");
      return;
    }

    if (!Array.isArray(experiments) || experiments.length === 0) {
      setError("Experiments must be a non-empty array.");
      return;
    }

    const presetNames = Object.keys(presets ?? {});
    if (presetNames.length === 0) {
      setError("At least one preset is required.");
      return;
    }

    if (!presets[activePresetKey]) {
      setError("Active preset must exist in presets JSON.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("PUT", "/api/admin/experiments/config", {
        experiments,
        recommendationWeights: {
          activePresetKey,
          presets,
        },
      });
      setSavedMessage("Saved successfully.");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/experiments/config"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="space-y-6" data-testid="admin-experiments-page">
      <section className="bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-foreground">A/B Experiment Config</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={runSampleAssign}>Run Sample Assign</Button>
            <Button size="sm" onClick={saveConfig} disabled={saving}>{saving ? "Saving..." : "Save Config"}</Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {savedMessage && <p className="text-sm text-green-600">{savedMessage}</p>}

        <div className="grid gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Active Preset</p>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={activePresetKey}
            onChange={(e) => setActivePresetKey(e.target.value)}
          >
            {presetKeys.length > 0 ? (
              presetKeys.map((key) => (
                <option key={key} value={key}>{key}</option>
              ))
            ) : (
              <option value={activePresetKey}>{activePresetKey}</option>
            )}
          </select>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Recommendation Weight Presets (JSON)</p>
          <textarea
            value={presetsJson}
            onChange={(e) => setPresetsJson(e.target.value)}
            className="min-h-[220px] w-full rounded-md border bg-background p-3 font-mono text-xs"
          />
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Traffic Splits / Experiments (JSON)</p>
          <textarea
            value={experimentsJson}
            onChange={(e) => setExperimentsJson(e.target.value)}
            className="min-h-[200px] w-full rounded-md border bg-background p-3 font-mono text-xs"
          />
        </div>
      </section>
    </div>
  );
}
