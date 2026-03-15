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

const FEATURES: FeatureName[] = [
  "cuisine_affinity",
  "price_match",
  "distance_score",
  "popularity_score",
  "disliked",
  "hour_active",
  "is_weekend",
  "new_restaurant",
];

type Row = {
  group_key: string;
  created_at: string;
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

type Pair = { pos: number[]; neg: number[] };

function fallbackRankerModel(reason: string) {
  return {
    modelType: "linear_ranker",
    version: "recommendation-ranker-v1-fallback",
    trainedAt: new Date().toISOString(),
    features: FEATURES,
    bias: 0,
    weights: {
      cuisine_affinity: 1.0,
      price_match: 0.6,
      distance_score: 0.6,
      popularity_score: 0.5,
      disliked: -0.7,
      hour_active: 0.15,
      is_weekend: 0.08,
      new_restaurant: 0.2,
    },
    metrics: {
      fallback: 1,
      reason,
    },
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const inArg = args.find((a) => a.startsWith("--in="));
  const outArg = args.find((a) => a.startsWith("--out="));
  const epochArg = args.find((a) => a.startsWith("--epochs="));
  const lrArg = args.find((a) => a.startsWith("--lr="));
  const l2Arg = args.find((a) => a.startsWith("--l2="));
  return {
    inputPath: inArg ? inArg.slice("--in=".length) : "models/recommendation-training.csv",
    outputPath: outArg ? outArg.slice("--out=".length) : "models/recommendation-ranker-v1.json",
    epochs: epochArg ? Number(epochArg.slice("--epochs=".length)) : 250,
    learningRate: lrArg ? Number(lrArg.slice("--lr=".length)) : 0.03,
    l2: l2Arg ? Number(l2Arg.slice("--l2=".length)) : 0.0001,
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
      created_at: cols[index.created_at] ?? "",
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

function sigmoid(x: number): number {
  if (x < -30) return 1e-13;
  if (x > 30) return 1 - 1e-13;
  return 1 / (1 + Math.exp(-x));
}

function dot(weights: number[], features: number[]): number {
  let s = 0;
  for (let i = 0; i < weights.length; i += 1) s += weights[i] * features[i];
  return s;
}

function rowToFeatures(row: Row): number[] {
  return [
    row.cuisine_affinity,
    row.price_match,
    row.distance_score,
    row.popularity_score,
    row.disliked,
    row.hour_active,
    row.is_weekend,
    row.new_restaurant,
  ];
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

function samplePairs(rows: Row[]): Pair[] {
  const pairs: Pair[] = [];
  const grouped = groupRows(rows);
  for (const [, items] of grouped) {
    const positives = items.filter((r) => r.label > 0);
    const negatives = items.filter((r) => r.label <= 0);
    if (positives.length === 0 || negatives.length === 0) continue;

    const perPos = Math.min(5, negatives.length);
    for (const pos of positives) {
      for (let i = 0; i < perPos; i += 1) {
        const neg = negatives[Math.floor(Math.random() * negatives.length)];
        pairs.push({ pos: rowToFeatures(pos), neg: rowToFeatures(neg) });
      }
    }
  }
  return pairs;
}

function ndcgAtK(rows: Row[], weights: number[], k = 10): number {
  const grouped = groupRows(rows);
  let total = 0;
  let n = 0;

  for (const [, items] of grouped) {
    const ranked = items
      .map((r) => ({ label: r.label, score: dot(weights, rowToFeatures(r)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    const ideal = items
      .map((r) => r.label)
      .sort((a, b) => b - a)
      .slice(0, k);

    let dcg = 0;
    for (let i = 0; i < ranked.length; i += 1) {
      const gain = ranked[i].label;
      dcg += gain / Math.log2(i + 2);
    }

    let idcg = 0;
    for (let i = 0; i < ideal.length; i += 1) {
      idcg += ideal[i] / Math.log2(i + 2);
    }

    if (idcg > 0) {
      total += dcg / idcg;
      n += 1;
    }
  }
  return n > 0 ? total / n : 0;
}

async function main() {
  const { inputPath, outputPath, epochs, learningRate, l2 } = parseArgs();
  const resolvedIn = path.resolve(process.cwd(), inputPath);
  const resolvedOut = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

  if (!fs.existsSync(resolvedIn)) {
    const model = fallbackRankerModel(`missing_csv:${resolvedIn}`);
    fs.writeFileSync(resolvedOut, `${JSON.stringify(model, null, 2)}\n`, "utf8");
    console.log(`Missing training csv. Saved fallback ranker to ${resolvedOut}`);
    return;
  }

  const csv = fs.readFileSync(resolvedIn, "utf8");
  const rows = parseCsv(csv).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  if (rows.length < 100) {
    const model = fallbackRankerModel(`insufficient_rows:${rows.length}`);
    fs.writeFileSync(resolvedOut, `${JSON.stringify(model, null, 2)}\n`, "utf8");
    console.log(`Need at least 100 rows for pairwise ranker, got ${rows.length}. Saved fallback ranker to ${resolvedOut}`);
    return;
  }

  const splitIndex = Math.max(1, Math.floor(rows.length * 0.8));
  const trainRows = rows.slice(0, splitIndex);
  const validRows = rows.slice(splitIndex);

  let weights = new Array(FEATURES.length).fill(0);
  const trainPairs = samplePairs(trainRows);
  if (trainPairs.length < 100) {
    const model = fallbackRankerModel(`insufficient_pairs:${trainPairs.length}`);
    fs.writeFileSync(resolvedOut, `${JSON.stringify(model, null, 2)}\n`, "utf8");
    console.log(`Not enough positive/negative pairs, got ${trainPairs.length}. Saved fallback ranker to ${resolvedOut}`);
    return;
  }

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    let loss = 0;
    const grad = new Array(FEATURES.length).fill(0);

    for (const pair of trainPairs) {
      const diff = pair.pos.map((v, i) => v - pair.neg[i]);
      const s = dot(weights, diff);
      const p = sigmoid(s);
      loss += -Math.log(p);
      const coeff = p - 1;
      for (let j = 0; j < FEATURES.length; j += 1) grad[j] += coeff * diff[j];
    }

    const n = trainPairs.length;
    for (let j = 0; j < FEATURES.length; j += 1) {
      const reg = l2 * weights[j];
      weights[j] -= learningRate * ((grad[j] / n) + reg);
    }

    if ((epoch + 1) % 50 === 0 || epoch === 0 || epoch === epochs - 1) {
      const avgLoss = loss / trainPairs.length;
      const trainNdcg = ndcgAtK(trainRows, weights, 10);
      const validNdcg = ndcgAtK(validRows, weights, 10);
      console.log(
        `epoch=${epoch + 1} pair_loss=${avgLoss.toFixed(5)} train_ndcg10=${trainNdcg.toFixed(4)} valid_ndcg10=${validNdcg.toFixed(4)}`,
      );
    }
  }

  const model = {
    modelType: "linear_ranker",
    version: "recommendation-ranker-v1",
    trainedAt: new Date().toISOString(),
    features: FEATURES,
    bias: 0,
    weights: Object.fromEntries(FEATURES.map((f, i) => [f, weights[i]])),
    metrics: {
      trainRows: trainRows.length,
      validRows: validRows.length,
      trainPairs: trainPairs.length,
      trainNdcgAt10: ndcgAtK(trainRows, weights, 10),
      validNdcgAt10: ndcgAtK(validRows, weights, 10),
    },
  };

  fs.writeFileSync(resolvedOut, `${JSON.stringify(model, null, 2)}\n`, "utf8");
  console.log(`Saved ranker model to ${resolvedOut}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
