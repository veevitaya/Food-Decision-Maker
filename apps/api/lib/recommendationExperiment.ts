import { z } from "zod";
import type { ScoringWeights } from "@algorithms";

export const DEFAULT_RECOMMENDATION_EXPERIMENT_KEY = "recommendation_ranking_v1";

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  cuisineAffinity: 0.35,
  priceMatch: 0.2,
  distanceScore: 0.2,
  globalPopularity: 0.2,
  recentNegativePenalty: 0.05,
};

export type ExperimentVariant = { key: string; weight: number };

export type ExperimentConfig = {
  experimentKey: string;
  enabled: boolean;
  variants: ExperimentVariant[];
};

export type RecommendationWeightsConfig = {
  activePresetKey: string;
  presets: Record<string, ScoringWeights>;
};

const scoringWeightsSchema = z.object({
  cuisineAffinity: z.number().finite(),
  priceMatch: z.number().finite(),
  distanceScore: z.number().finite(),
  globalPopularity: z.number().finite(),
  recentNegativePenalty: z.number().finite(),
});

const experimentConfigSchema = z.object({
  experimentKey: z.string().min(1),
  enabled: z.boolean(),
  variants: z.array(z.object({ key: z.string().min(1), weight: z.number().min(0) })).min(1),
});

const recommendationWeightsConfigSchema = z.object({
  activePresetKey: z.string().min(1).optional(),
  presets: z.record(z.string().min(1), scoringWeightsSchema).optional(),
});

function defaultRecommendationWeights(): RecommendationWeightsConfig {
  return {
    activePresetKey: "control",
    presets: {
      control: { ...DEFAULT_SCORING_WEIGHTS },
      hybrid_v2: {
        cuisineAffinity: 0.42,
        priceMatch: 0.16,
        distanceScore: 0.18,
        globalPopularity: 0.2,
        recentNegativePenalty: 0.04,
      },
    },
  };
}

export function parseExperimentConfigs(value: unknown): ExperimentConfig[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => experimentConfigSchema.safeParse(item))
    .filter((result): result is { success: true; data: ExperimentConfig } => result.success)
    .map((result) => result.data);
}

export function parseRecommendationWeightsConfig(value: unknown): RecommendationWeightsConfig {
  const parsed = recommendationWeightsConfigSchema.safeParse(value);
  if (!parsed.success) return defaultRecommendationWeights();

  const presets = parsed.data.presets && Object.keys(parsed.data.presets).length > 0
    ? parsed.data.presets
    : defaultRecommendationWeights().presets;

  const activePresetKey =
    parsed.data.activePresetKey && presets[parsed.data.activePresetKey]
      ? parsed.data.activePresetKey
      : Object.keys(presets)[0] ?? "control";

  return {
    activePresetKey,
    presets,
  };
}

export function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickVariant(seed: string, variants: ExperimentVariant[]): string {
  const normalized = variants
    .map((variant) => ({ ...variant, weight: Math.max(0, variant.weight) }))
    .filter((variant) => variant.weight > 0);
  if (normalized.length === 0) return "control";

  const total = normalized.reduce((sum, variant) => sum + variant.weight, 0);
  const bucket = (hashStringToUint32(seed) % 10000) / 10000;
  let cursor = 0;

  for (const variant of normalized) {
    cursor += variant.weight / total;
    if (bucket <= cursor) return variant.key;
  }

  return normalized[normalized.length - 1]?.key ?? "control";
}

export function validateVariantPresetMapping(
  experiments: ExperimentConfig[],
  presets: Record<string, ScoringWeights>,
): string[] {
  const presetKeys = new Set(Object.keys(presets));
  const missing = new Set<string>();
  for (const experiment of experiments) {
    for (const variant of experiment.variants) {
      if (!presetKeys.has(variant.key)) {
        missing.add(variant.key);
      }
    }
  }
  return Array.from(missing);
}

export function resolveRecommendationExperiment(input: {
  experiments: ExperimentConfig[];
  recommendationWeights: RecommendationWeightsConfig;
  experimentKey: string;
  seed: string;
}): { experimentKey: string; variant: string; weights: ScoringWeights } {
  const fallbackVariant = input.recommendationWeights.activePresetKey || "control";
  const fallbackWeights =
    input.recommendationWeights.presets[fallbackVariant] ??
    input.recommendationWeights.presets.control ??
    DEFAULT_SCORING_WEIGHTS;

  const experiment = input.experiments.find((item) => item.experimentKey === input.experimentKey);
  if (!experiment || !experiment.enabled || experiment.variants.length === 0) {
    return {
      experimentKey: input.experimentKey,
      variant: fallbackVariant,
      weights: fallbackWeights,
    };
  }

  const assignedVariant = pickVariant(`${input.seed}:${input.experimentKey}`, experiment.variants);
  const resolvedWeights = input.recommendationWeights.presets[assignedVariant];
  if (!resolvedWeights) {
    return {
      experimentKey: input.experimentKey,
      variant: fallbackVariant,
      weights: fallbackWeights,
    };
  }

  return {
    experimentKey: input.experimentKey,
    variant: assignedVariant,
    weights: resolvedWeights,
  };
}
