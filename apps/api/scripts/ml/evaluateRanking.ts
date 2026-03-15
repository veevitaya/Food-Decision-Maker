import fs from "node:fs";
import path from "node:path";

type FeatureName =
  | "cuisine_affinity"
  | "price_match"
  | "distance_score"
  | "popularity_score"
  | "disliked"
  | "hour_active"
  | "is_weekend"
  | "new_restaurant";

type Row = {
  group_key: string;
  label: number;
  cuisine_affinity: number;
  price_match: number;
  distance_score: number;
  popularity_score: number;
  disliked: number;
  hour_active: number;
  is_weekend: number;
  new_restaurant: number;
};

type Model = {
  modelType: string;
  features: FeatureName[];
  bias?: number;
  weights: Record<string, number>;
};

const FALLBACK_RULE_WEIGHTS: Record<FeatureName, number> = {
  cuisine_affinity: 0.35,
  price_match: 0.2,
  distance_score: 0.2,
  popularity_score: 0.2,
  disliked: -0.05,
  hour_active: 0.06,
  is_weekend: 0.03,
  new_restaurant: 0.15,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const inArg = args.find((a) => a.startsWith("--in="));
  const modelArg = args.find((a) => a.startsWith("--model="));
  const kArg = args.find((a) => a.startsWith("--k="));
  return {
    inputPath: inArg ? inArg.slice("--in=".length) : "models/recommendation-training.csv",
    modelPath: modelArg ? modelArg.slice("--model=".length) : "models/recommendation-model.json",
    k: kArg ? Number(kArg.slice("--k=".length)) : 10,
  };
}

function parseCsv(input: string): Row[] {
  const lines = input.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  const index = Object.fromEntries(headers.map((h, i) => [h, i])) as Record<string, number>;
  const num = (cols: string[], key: string) => Number(cols[index[key]] ?? 0);
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      group_key: cols[index.group_key] ?? "unknown",
      label: num(cols, "label"),
      cuisine_affinity: num(cols, "cuisine_affinity"),
      price_match: num(cols, "price_match"),
      distance_score: num(cols, "distance_score"),
      popularity_score: num(cols, "popularity_score"),
      disliked: num(cols, "disliked"),
      hour_active: num(cols, "hour_active"),
      is_weekend: num(cols, "is_weekend"),
      new_restaurant: num(cols, "new_restaurant"),
    };
  });
}

function rowToFeatures(row: Row, order: FeatureName[]): number[] {
  return order.map((f) => Number(row[f] ?? 0));
}

function dot(weights: number[], x: number[]): number {
  let s = 0;
  for (let i = 0; i < weights.length; i += 1) s += weights[i] * x[i];
  return s;
}

function loadModel(filePath: string): Model {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Model;
}

function groupRows(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const bucket = map.get(row.group_key);
    if (bucket) bucket.push(row);
    else map.set(row.group_key, [row]);
  }
  return map;
}

function ndcgAtK(rows: Row[], scores: number[], k: number): number {
  const grouped = groupRows(rows);
  const scoreByIndex = scores;
  let total = 0;
  let n = 0;
  let cursor = 0;

  for (const [, items] of grouped) {
    const pairs = items.map((item, i) => ({ label: item.label, score: scoreByIndex[cursor + i] }));
    cursor += items.length;

    const ranked = pairs.sort((a, b) => b.score - a.score).slice(0, k);
    const ideal = pairs.map((p) => p.label).sort((a, b) => b - a).slice(0, k);

    let dcg = 0;
    for (let i = 0; i < ranked.length; i += 1) dcg += ranked[i].label / Math.log2(i + 2);
    let idcg = 0;
    for (let i = 0; i < ideal.length; i += 1) idcg += ideal[i] / Math.log2(i + 2);
    if (idcg > 0) {
      total += dcg / idcg;
      n += 1;
    }
  }
  return n > 0 ? total / n : 0;
}

async function main() {
  const { inputPath, modelPath, k } = parseArgs();
  const resolvedIn = path.resolve(process.cwd(), inputPath);
  const resolvedModel = path.resolve(process.cwd(), modelPath);
  const csv = fs.readFileSync(resolvedIn, "utf8");
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    console.log("No rows to evaluate.");
    return;
  }

  const model = loadModel(resolvedModel);
  const features = model.features as FeatureName[];
  const weights = features.map((f) => Number(model.weights[f] ?? 0));
  const bias = Number(model.bias ?? 0);
  const modelScores = rows.map((r) => dot(weights, rowToFeatures(r, features)) + bias);

  const fallbackFeatures = Object.keys(FALLBACK_RULE_WEIGHTS) as FeatureName[];
  const fallbackWeights = fallbackFeatures.map((f) => FALLBACK_RULE_WEIGHTS[f]);
  const fallbackScores = rows.map((r) => dot(fallbackWeights, rowToFeatures(r, fallbackFeatures)));

  const modelNdcg = ndcgAtK(rows, modelScores, k);
  const fallbackNdcg = ndcgAtK(rows, fallbackScores, k);
  const uplift = fallbackNdcg !== 0 ? ((modelNdcg - fallbackNdcg) / fallbackNdcg) * 100 : 0;

  console.log(`rows=${rows.length} groups=${groupRows(rows).size} k=${k}`);
  console.log(`model_type=${model.modelType}`);
  console.log(`model_ndcg@${k}=${modelNdcg.toFixed(6)}`);
  console.log(`fallback_ndcg@${k}=${fallbackNdcg.toFixed(6)}`);
  console.log(`uplift_pct=${uplift.toFixed(3)}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

