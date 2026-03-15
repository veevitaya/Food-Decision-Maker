import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Brain, FileText, Database, Activity, CheckCircle2, AlertTriangle, Play, Loader2, Terminal } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ArtifactStatus = {
  exists: boolean;
  path: string;
  sizeBytes?: number;
  updatedAt?: string;
  modelType?: string | null;
  version?: string | null;
  trainedAt?: string | null;
  featuresCount?: number;
  metrics?: Record<string, number | string>;
  parseError?: string;
};

type ManifestStatus = {
  exists: boolean;
  path: string;
  sizeBytes?: number;
  updatedAt?: string;
  totalRows?: number;
  positives?: number;
  positiveRate?: number;
  generatedAt?: string | null;
  missingByColumn?: Record<string, { missing: number; missingPct: number }>;
  parseError?: string;
};

type MlStatusResponse = {
  env: {
    mlRankingEnabled: boolean;
    mlBlendAlpha: number;
    mlModelPath: string;
    mlRankerPath: string;
    manifestPath: string;
  };
  artifacts: {
    recommendationModel: ArtifactStatus;
    rankerModel: ArtifactStatus;
    trainingManifest: ManifestStatus;
    availableArtifacts: string[];
  };
  promotions?: Record<string, unknown>;
};

type MlRunAction = "export" | "train" | "train-ranker" | "eval" | "build";
type MlRunRecord = {
  id: string;
  action: MlRunAction;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  requestedBy: string;
};

type MlRunsResponse = {
  items: MlRunRecord[];
};

type QueueStatusResponse = {
  streamLength: number;
  pending: number;
  lag: number;
  dlqLength: number;
  config: {
    mode: "direct" | "redis";
    redisFailureMode: "direct" | "reject";
    streamKey: string;
    dlqStreamKey: string;
    consumerGroup: string;
    batchSize: number;
    flushIntervalMs: number;
    maxRetries: number;
  };
};

type EvalMetrics = {
  modelNdcg?: number;
  fallbackNdcg?: number;
  upliftPct?: number;
};

function parseEvalMetrics(output: string): EvalMetrics {
  const pick = (pattern: RegExp): number | undefined => {
    const match = output.match(pattern);
    if (!match?.[1]) return undefined;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : undefined;
  };
  return {
    modelNdcg: pick(/model_ndcg@\d+=([0-9.\-]+)/),
    fallbackNdcg: pick(/fallback_ndcg@\d+=([0-9.\-]+)/),
    upliftPct: pick(/uplift_pct=([0-9.\-]+)%/),
  };
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-gray-800">{value}</p>
      {sub ? <p className="text-xs text-gray-500 mt-1">{sub}</p> : null}
    </div>
  );
}

function bytesToText(value?: number): string {
  if (!value || value <= 0) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminMlStatus() {
  const [promoteTarget, setPromoteTarget] = useState<"recommendation" | "ranker">("recommendation");
  const [promoteTag, setPromoteTag] = useState("");
  const [promoteSource, setPromoteSource] = useState("");

  const { data, isLoading, isError } = useQuery<MlStatusResponse>({
    queryKey: ["/api/admin/ml/status"],
  });
  const { data: runsData } = useQuery<MlRunsResponse>({
    queryKey: ["/api/admin/ml/runs"],
  });
  const { data: queueStatus } = useQuery<QueueStatusResponse>({
    queryKey: ["/api/admin/events/queue-status"],
  });

  const runMutation = useMutation({
    mutationFn: async (action: MlRunAction) => {
      const res = await apiRequest("POST", "/api/admin/ml/run", { action });
      return res.json() as Promise<MlRunRecord>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ml/runs"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ml/status"] });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async () => {
      const sourcePath = promoteSource.trim();
      const tag = promoteTag.trim();
      if (!sourcePath || !tag) throw new Error("Please fill source path and version tag");
      const res = await apiRequest("POST", "/api/admin/ml/promote", {
        target: promoteTarget,
        sourcePath,
        tag,
      });
      return res.json() as Promise<Record<string, unknown>>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ml/status"] });
    },
  });
  const replayDlqMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/events/replay-dlq", { limit: 100 });
      return res.json() as Promise<{ moved: number }>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/events/queue-status"] });
    },
  });

  const manifestMissingTop = useMemo(() => {
    const entries = Object.entries(data?.artifacts.trainingManifest.missingByColumn ?? {});
    return entries
      .sort((a, b) => (b[1]?.missingPct ?? 0) - (a[1]?.missingPct ?? 0))
      .slice(0, 5);
  }, [data]);
  const latestEvalRuns = useMemo(() => (runsData?.items ?? []).filter((r) => r.action === "eval").slice(0, 2), [runsData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-6 text-red-600">
        Failed to load ML status.
      </div>
    );
  }

  const model = data.artifacts.recommendationModel;
  const ranker = data.artifacts.rankerModel;
  const manifest = data.artifacts.trainingManifest;
  const runs = runsData?.items ?? [];
  const latestRun = runs[0];
  const currentEval = latestEvalRuns[0];
  const previousEval = latestEvalRuns[1];
  const currentEvalMetrics = currentEval ? parseEvalMetrics(`${currentEval.stdout}\n${currentEval.stderr}`) : {};
  const previousEvalMetrics = previousEval ? parseEvalMetrics(`${previousEval.stdout}\n${previousEval.stderr}`) : {};
  const upliftDelta = (currentEvalMetrics.upliftPct ?? 0) - (previousEvalMetrics.upliftPct ?? 0);
  const availableModelJson = (data.artifacts.availableArtifacts ?? [])
    .filter((name) => name.endsWith(".json"))
    .map((name) => `models/${name}`);

  return (
    <div className="space-y-6" data-testid="admin-ml-status-page">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5 text-indigo-500" />
        <div>
          <h2 className="text-xl font-semibold text-gray-800">ML Status</h2>
          <p className="text-xs text-muted-foreground">Model artifacts, dataset quality, and runtime configuration</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-500" />
          <h3 className="text-[15px] font-semibold text-gray-800">ML Actions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "export", label: "Run Export" },
            { key: "train", label: "Run Train" },
            { key: "train-ranker", label: "Run Train Ranker" },
            { key: "eval", label: "Run Eval" },
            { key: "build", label: "Run Build (All)" },
          ] as Array<{ key: MlRunAction; label: string }>).map((btn) => (
            <button
              key={btn.key}
              onClick={() => runMutation.mutate(btn.key)}
              disabled={runMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 disabled:opacity-60"
              data-testid={`button-run-${btn.key}`}
            >
              {runMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {btn.label}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700">Promote Model</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={promoteTarget}
              onChange={(e) => setPromoteTarget(e.target.value as "recommendation" | "ranker")}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs"
            >
              <option value="recommendation">recommendation</option>
              <option value="ranker">ranker</option>
            </select>
            <input
              value={promoteTag}
              onChange={(e) => setPromoteTag(e.target.value)}
              placeholder="version tag (e.g. v1.2.0)"
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs"
            />
            <input
              value={promoteSource}
              onChange={(e) => setPromoteSource(e.target.value)}
              placeholder="source path (e.g. models/recommendation-model.json)"
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs"
            />
          </div>
          {availableModelJson.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {availableModelJson.slice(0, 8).map((path) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => setPromoteSource(path)}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-600 hover:bg-gray-100"
                >
                  {path}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              onClick={() => promoteMutation.mutate()}
              disabled={promoteMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 text-xs font-medium text-indigo-700 disabled:opacity-60"
            >
              {promoteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Promote
            </button>
            {promoteMutation.isError ? (
              <span className="text-[11px] text-red-600">
                {(promoteMutation.error as Error)?.message ?? "Promote failed"}
              </span>
            ) : null}
            {promoteMutation.isSuccess ? <span className="text-[11px] text-emerald-600">Promoted successfully</span> : null}
          </div>
        </div>

        {latestRun ? (
          <div className={`rounded-lg border p-3 ${latestRun.success ? "border-emerald-100 bg-emerald-50/50" : "border-red-100 bg-red-50/60"}`}>
            <p className="text-xs font-semibold text-gray-800">
              Latest: {latestRun.action} · {latestRun.success ? "success" : "failed"} · {(latestRun.durationMs / 1000).toFixed(1)}s
            </p>
            <p className="text-[11px] text-gray-500 mt-1">By {latestRun.requestedBy} at {latestRun.finishedAt}</p>
            {!latestRun.success && latestRun.stderr ? (
              <pre className="mt-2 text-[10px] leading-relaxed text-red-700 bg-red-50 border border-red-100 rounded p-2 overflow-auto max-h-28">
                {latestRun.stderr}
              </pre>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No ML run history yet.</p>
        )}
      </div>

      <div className={`rounded-2xl border p-4 ${data.env.mlRankingEnabled ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
        <div className="flex items-center gap-2 mb-1">
          {data.env.mlRankingEnabled ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
          <p className="text-sm font-semibold text-gray-800">
            Runtime: {data.env.mlRankingEnabled ? "ML ranking enabled" : "ML ranking disabled"}
          </p>
        </div>
        <p className="text-xs text-gray-600">Blend alpha: {data.env.mlBlendAlpha}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-gray-800">Event Queue Status</h3>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${queueStatus?.config.mode === "redis" ? "text-emerald-600" : "text-amber-600"}`}>
              mode: {queueStatus?.config.mode ?? "unknown"}
            </span>
            <button
              onClick={() => replayDlqMutation.mutate()}
              disabled={replayDlqMutation.isPending || (queueStatus?.dlqLength ?? 0) === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-60"
            >
              {replayDlqMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Replay DLQ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Stream Length" value={String(queueStatus?.streamLength ?? 0)} />
          <StatCard label="Pending" value={String(queueStatus?.pending ?? 0)} />
          <StatCard label="Lag" value={String(queueStatus?.lag ?? 0)} />
          <StatCard label="DLQ Length" value={String(queueStatus?.dlqLength ?? 0)} />
        </div>

        <p className="text-[11px] text-gray-500 break-all">
          {queueStatus
            ? `stream=${queueStatus.config.streamKey} | group=${queueStatus.config.consumerGroup} | batch=${queueStatus.config.batchSize} | flush=${queueStatus.config.flushIntervalMs}ms | retries=${queueStatus.config.maxRetries}`
            : "Queue status unavailable"}
        </p>

        {replayDlqMutation.isSuccess ? (
          <p className="text-[11px] text-emerald-600">Replay completed.</p>
        ) : null}
        {replayDlqMutation.isError ? (
          <p className="text-[11px] text-red-600">{(replayDlqMutation.error as Error)?.message ?? "Replay failed"}</p>
        ) : null}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h3 className="text-[15px] font-semibold text-gray-800">Eval Comparison (Latest vs Previous)</h3>
        {!currentEval ? (
          <p className="text-sm text-gray-500">No eval runs yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCard
              label="Current Uplift"
              value={`${(currentEvalMetrics.upliftPct ?? 0).toFixed(3)}%`}
              sub={currentEval?.finishedAt}
            />
            <StatCard
              label="Previous Uplift"
              value={`${(previousEvalMetrics.upliftPct ?? 0).toFixed(3)}%`}
              sub={previousEval?.finishedAt ?? "—"}
            />
            <StatCard
              label="Delta"
              value={`${upliftDelta >= 0 ? "+" : ""}${upliftDelta.toFixed(3)}%`}
              sub={upliftDelta >= 0 ? "improved" : "regressed"}
            />
            <StatCard
              label="Current NDCG"
              value={(currentEvalMetrics.modelNdcg ?? 0).toFixed(6)}
              sub={`fallback ${(currentEvalMetrics.fallbackNdcg ?? 0).toFixed(6)}`}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Training Rows" value={String(manifest.totalRows ?? 0)} />
        <StatCard label="Positives" value={String(manifest.positives ?? 0)} />
        <StatCard label="Positive Rate" value={`${(((manifest.positiveRate ?? 0) * 100)).toFixed(2)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[15px] font-semibold text-gray-800">Recommendation Model</h3>
          </div>
          <p className="text-xs text-gray-500 break-all">{model.path}</p>
          <p className="text-sm text-gray-700">Exists: <b>{String(model.exists)}</b></p>
          <p className="text-sm text-gray-700">Type: <b>{model.modelType ?? "—"}</b></p>
          <p className="text-sm text-gray-700">Version: <b>{model.version ?? "—"}</b></p>
          <p className="text-sm text-gray-700">Features: <b>{model.featuresCount ?? 0}</b></p>
          <p className="text-sm text-gray-700">Size: <b>{bytesToText(model.sizeBytes)}</b></p>
          <p className="text-xs text-gray-500">Updated: {model.updatedAt ?? "—"}</p>
          {model.parseError ? <p className="text-xs text-red-600">Parse error: {model.parseError}</p> : null}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            <h3 className="text-[15px] font-semibold text-gray-800">Pairwise Ranker Model</h3>
          </div>
          <p className="text-xs text-gray-500 break-all">{ranker.path}</p>
          <p className="text-sm text-gray-700">Exists: <b>{String(ranker.exists)}</b></p>
          <p className="text-sm text-gray-700">Type: <b>{ranker.modelType ?? "—"}</b></p>
          <p className="text-sm text-gray-700">Version: <b>{ranker.version ?? "—"}</b></p>
          <p className="text-sm text-gray-700">Features: <b>{ranker.featuresCount ?? 0}</b></p>
          <p className="text-sm text-gray-700">Size: <b>{bytesToText(ranker.sizeBytes)}</b></p>
          <p className="text-xs text-gray-500">Updated: {ranker.updatedAt ?? "—"}</p>
          {ranker.parseError ? <p className="text-xs text-red-600">Parse error: {ranker.parseError}</p> : null}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" />
          <h3 className="text-[15px] font-semibold text-gray-800">Dataset Manifest</h3>
        </div>
        <p className="text-xs text-gray-500 break-all">{manifest.path}</p>
        <p className="text-xs text-gray-500">Generated: {manifest.generatedAt ?? "—"} | Updated: {manifest.updatedAt ?? "—"}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {manifestMissingTop.map(([col, stat]) => (
            <div key={col} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-xs font-semibold text-gray-800">{col}</p>
              <p className="text-xs text-gray-500">missing: {stat.missing} ({stat.missingPct.toFixed(2)}%)</p>
            </div>
          ))}
          {manifestMissingTop.length === 0 ? (
            <p className="text-sm text-gray-500">No manifest missing-value stats available.</p>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-[15px] font-semibold text-gray-800 mb-3">Available Artifacts</h3>
        {(data.artifacts.availableArtifacts ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No files in models directory.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.artifacts.availableArtifacts.map((name) => (
              <span key={name} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h3 className="text-[15px] font-semibold text-gray-800">Run History</h3>
        {runs.length === 0 ? (
          <p className="text-sm text-gray-500">No runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Action", "Result", "Duration", "Finished", "Exit", "By"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-2 text-[10px] uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 15).map((run) => (
                  <tr key={run.id} className="border-b border-gray-50">
                    <td className="py-2 px-2 font-medium text-gray-800">{run.action}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${run.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {run.success ? "success" : "failed"}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-600">{(run.durationMs / 1000).toFixed(1)}s</td>
                    <td className="py-2 px-2 text-gray-500">{run.finishedAt}</td>
                    <td className="py-2 px-2 text-gray-500">{run.exitCode ?? "—"}</td>
                    <td className="py-2 px-2 text-gray-500">{run.requestedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
