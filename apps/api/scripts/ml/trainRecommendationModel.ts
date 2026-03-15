import fs from "node:fs";
import path from "node:path";

type Row = {
  created_at: string;
  cuisine_affinity: number;
  price_match: number;
  distance_score: number;
  popularity_score: number;
  disliked: number;
  hour_active: number;
  is_weekend: number;
  new_restaurant: number;
  label: number;
};

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

function fallbackModel() {
  return {
    modelType: "logistic_regression",
    version: "recommendation-ml-v1-fallback",
    trainedAt: new Date().toISOString(),
    features: FEATURES,
    bias: -1.0,
    weights: {
      cuisine_affinity: 1.4,
      price_match: 0.8,
      distance_score: 0.8,
      popularity_score: 0.7,
      disliked: -1.2,
      hour_active: 0.2,
      is_weekend: 0.1,
      new_restaurant: 0.25,
    },
    metrics: {
      trainRows: 0,
      validRows: 0,
      trainAuc: 0,
      validAuc: 0,
      trainLogLoss: 0,
      validLogLoss: 0,
      fallback: 1,
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
    outputPath: outArg ? outArg.slice("--out=".length) : "models/recommendation-model.json",
    epochs: epochArg ? Number(epochArg.slice("--epochs=".length)) : 500,
    learningRate: lrArg ? Number(lrArg.slice("--lr=".length)) : 0.05,
    l2: l2Arg ? Number(l2Arg.slice("--l2=".length)) : 0.0001,
  };
}

function parseCsv(input: string): Row[] {
  const lines = input.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  const index = Object.fromEntries(headers.map((h, i) => [h, i])) as Record<string, number>;

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const getNum = (key: string) => Number(cols[index[key]] ?? 0);
    return {
      created_at: cols[index.created_at] ?? "",
      cuisine_affinity: getNum("cuisine_affinity"),
      price_match: getNum("price_match"),
      distance_score: getNum("distance_score"),
      popularity_score: getNum("popularity_score"),
      disliked: getNum("disliked"),
      hour_active: getNum("hour_active"),
      is_weekend: getNum("is_weekend"),
      new_restaurant: getNum("new_restaurant"),
      label: getNum("label"),
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

function logLoss(y: number, p: number): number {
  const pp = Math.min(1 - 1e-12, Math.max(1e-12, p));
  return -(y * Math.log(pp) + (1 - y) * Math.log(1 - pp));
}

function calcAuc(labels: number[], probs: number[]): number {
  const pairs = probs.map((p, i) => ({ p, y: labels[i] })).sort((a, b) => a.p - b.p);
  let rankSumPos = 0;
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    if (pairs[i].y === 1) {
      pos += 1;
      rankSumPos += i + 1;
    } else {
      neg += 1;
    }
  }
  if (pos === 0 || neg === 0) return 0.5;
  return (rankSumPos - (pos * (pos + 1)) / 2) / (pos * neg);
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

function evaluate(rows: Row[], weights: number[], bias: number) {
  let loss = 0;
  const labels: number[] = [];
  const probs: number[] = [];
  for (const row of rows) {
    const p = sigmoid(dot(weights, rowToFeatures(row)) + bias);
    loss += logLoss(row.label, p);
    labels.push(row.label);
    probs.push(p);
  }
  const avgLoss = rows.length > 0 ? loss / rows.length : 0;
  const auc = calcAuc(labels, probs);
  return { avgLoss, auc };
}

async function main() {
  const { inputPath, outputPath, epochs, learningRate, l2 } = parseArgs();
  const resolvedIn = path.resolve(process.cwd(), inputPath);
  const resolvedOut = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

  if (!fs.existsSync(resolvedIn)) {
    const model = fallbackModel();
    fs.writeFileSync(resolvedOut, `${JSON.stringify(model, null, 2)}\n`, "utf8");
    console.log(`Training CSV not found. Saved fallback model to ${resolvedOut}`);
    return;
  }

  const csv = fs.readFileSync(resolvedIn, "utf8");
  const rows = parseCsv(csv).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (rows.length < 50) {
    const model = fallbackModel();
    fs.writeFileSync(resolvedOut, `${JSON.stringify(model, null, 2)}\n`, "utf8");
    console.log(`Need at least 50 rows to train, got ${rows.length}. Saved fallback model to ${resolvedOut}`);
    return;
  }

  const splitIndex = Math.max(1, Math.floor(rows.length * 0.8));
  const trainRows = rows.slice(0, splitIndex);
  const validRows = rows.slice(splitIndex);

  let weights = new Array(FEATURES.length).fill(0);
  let bias = 0;
  const n = trainRows.length;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradW = new Array(FEATURES.length).fill(0);
    let gradB = 0;

    for (const row of trainRows) {
      const x = rowToFeatures(row);
      const y = row.label;
      const p = sigmoid(dot(weights, x) + bias);
      const err = p - y;
      for (let j = 0; j < FEATURES.length; j += 1) gradW[j] += err * x[j];
      gradB += err;
    }

    for (let j = 0; j < FEATURES.length; j += 1) {
      const reg = l2 * weights[j];
      weights[j] -= learningRate * ((gradW[j] / n) + reg);
    }
    bias -= learningRate * (gradB / n);

    if ((epoch + 1) % 100 === 0 || epoch === 0 || epoch === epochs - 1) {
      const trainEval = evaluate(trainRows, weights, bias);
      const validEval = evaluate(validRows, weights, bias);
      console.log(
        `epoch=${epoch + 1} train_loss=${trainEval.avgLoss.toFixed(5)} train_auc=${trainEval.auc.toFixed(4)} valid_loss=${validEval.avgLoss.toFixed(5)} valid_auc=${validEval.auc.toFixed(4)}`,
      );
    }
  }

  const trainEval = evaluate(trainRows, weights, bias);
  const validEval = evaluate(validRows, weights, bias);
  const model = {
    modelType: "logistic_regression",
    version: "recommendation-ml-v1",
    trainedAt: new Date().toISOString(),
    features: FEATURES,
    bias,
    weights: Object.fromEntries(FEATURES.map((f, i) => [f, weights[i]])),
    metrics: {
      trainRows: trainRows.length,
      validRows: validRows.length,
      trainAuc: trainEval.auc,
      validAuc: validEval.auc,
      trainLogLoss: trainEval.avgLoss,
      validLogLoss: validEval.avgLoss,
    },
  };

  fs.writeFileSync(resolvedOut, `${JSON.stringify(model, null, 2)}\n`, "utf8");
  console.log(`Saved model to ${resolvedOut}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
