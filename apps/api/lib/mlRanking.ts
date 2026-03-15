import fs from "node:fs";
import path from "node:path";

export type MlFeatureVector = {
  cuisine_affinity: number;
  price_match: number;
  distance_score: number;
  popularity_score: number;
  disliked: number;
  hour_active: number;
  is_weekend: number;
  new_restaurant: number;
};

type ModelFile = {
  modelType: string;
  version: string;
  trainedAt: string;
  features: string[];
  bias: number;
  weights: Record<string, number>;
  metrics?: Record<string, number>;
};

type MlModel = {
  bias: number;
  featureOrder: Array<keyof MlFeatureVector>;
  weights: Record<keyof MlFeatureVector, number>;
  version: string;
};

let cachedModel: MlModel | null = null;
let cachedPath: string | null = null;
let lastLoadedAt = 0;
const RELOAD_INTERVAL_MS = 30_000;

function toBool(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function sigmoid(x: number): number {
  if (x < -30) return 1e-13;
  if (x > 30) return 1 - 1e-13;
  return 1 / (1 + Math.exp(-x));
}

function resolveModelPath(): string {
  const raw = process.env.ML_MODEL_PATH ?? "models/recommendation-model.json";
  return path.resolve(process.cwd(), raw);
}

function parseModel(raw: ModelFile): MlModel {
  if (!Array.isArray(raw.features) || raw.features.length === 0) {
    throw new Error("Invalid model file: missing features");
  }
  const featureOrder = raw.features as Array<keyof MlFeatureVector>;
  const weights = {} as Record<keyof MlFeatureVector, number>;
  for (const f of featureOrder) {
    weights[f] = Number(raw.weights[f] ?? 0);
  }
  return {
    bias: Number(raw.bias ?? 0),
    featureOrder,
    weights,
    version: raw.version ?? "unknown",
  };
}

function loadModelIfNeeded(): MlModel | null {
  const now = Date.now();
  const resolvedPath = resolveModelPath();
  if (cachedModel && cachedPath === resolvedPath && now - lastLoadedAt < RELOAD_INTERVAL_MS) {
    return cachedModel;
  }

  if (!fs.existsSync(resolvedPath)) {
    cachedModel = null;
    cachedPath = resolvedPath;
    lastLoadedAt = now;
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8")) as ModelFile;
  cachedModel = parseModel(parsed);
  cachedPath = resolvedPath;
  lastLoadedAt = now;
  return cachedModel;
}

export function isMlRankingEnabled(): boolean {
  return toBool(process.env.ML_RANKING_ENABLED);
}

export function getMlBlendAlpha(): number {
  const raw = Number(process.env.ML_BLEND_ALPHA ?? 0.7);
  if (!Number.isFinite(raw)) return 0.7;
  return Math.max(0, Math.min(1, raw));
}

export function predictMlProbability(features: MlFeatureVector): number | null {
  const model = loadModelIfNeeded();
  if (!model) return null;

  let linear = model.bias;
  for (const key of model.featureOrder) {
    const x = Number(features[key] ?? 0);
    linear += model.weights[key] * x;
  }
  return sigmoid(linear);
}

export function getLoadedMlModelVersion(): string | null {
  return loadModelIfNeeded()?.version ?? null;
}
