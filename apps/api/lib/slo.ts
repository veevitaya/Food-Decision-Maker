export type SLOStatus = {
  name: string;
  target: number;
  actual: number;
  unit: string;
  passing: boolean;
  description: string;
};

export const SLO_TARGETS = {
  qualityPassRatePct: 98,     // % of events without critical quality issues
  featureFreshnessHours: 72,  // max acceptable age of user/item snapshots
  ingestSuccessRatePct: 99,   // % of submitted events accepted (not skipped)
} as const;

export function checkSLOs(params: {
  qualityPassRatePct: number;
  featureFreshnessHoursAvg: number;
  ingestSuccessRatePct?: number;
}): SLOStatus[] {
  const { qualityPassRatePct, featureFreshnessHoursAvg, ingestSuccessRatePct } = params;

  const slos: SLOStatus[] = [
    {
      name: "quality_pass_rate",
      target: SLO_TARGETS.qualityPassRatePct,
      actual: Number(qualityPassRatePct.toFixed(2)),
      unit: "%",
      passing: qualityPassRatePct >= SLO_TARGETS.qualityPassRatePct,
      description: "Percentage of ingested events free of critical quality issues",
    },
    {
      name: "feature_freshness",
      target: SLO_TARGETS.featureFreshnessHours,
      actual: Number(featureFreshnessHoursAvg.toFixed(1)),
      unit: "hours",
      passing: featureFreshnessHoursAvg <= SLO_TARGETS.featureFreshnessHours,
      description: "Average age of user feature snapshots used for recommendations",
    },
  ];

  if (ingestSuccessRatePct !== undefined) {
    slos.push({
      name: "ingest_success_rate",
      target: SLO_TARGETS.ingestSuccessRatePct,
      actual: Number(ingestSuccessRatePct.toFixed(2)),
      unit: "%",
      passing: ingestSuccessRatePct >= SLO_TARGETS.ingestSuccessRatePct,
      description: "Percentage of submitted events accepted by the ingestion pipeline",
    });
  }

  return slos;
}
