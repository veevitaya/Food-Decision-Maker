import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { fileURLToPath } from "node:url";

function parseArgs() {
  const args = process.argv.slice(2);
  const outArg = args.find((a) => a.startsWith("--out="));
  const outPath = outArg ? outArg.slice("--out=".length) : "models/recommendation-training.csv";
  return { outPath };
}

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function isMissing(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const { outPath } = parseArgs();
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.join(scriptDir, "training_set.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql);
    const headers =
      result.rows.length > 0
        ? Object.keys(result.rows[0])
        : result.fields.map((f) => f.name);
    const lines: string[] = [headers.join(",")];
    for (const row of result.rows) {
      lines.push(headers.map((h) => csvEscape((row as Record<string, unknown>)[h])).join(","));
    }

    const resolvedOut = path.resolve(process.cwd(), outPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, `${lines.join("\n")}\n`, "utf8");
    console.log(`Exported ${result.rows.length} rows to ${resolvedOut}`);

    const totalRows = result.rows.length;
    const positives = result.rows.reduce((acc, row) => acc + (Number((row as Record<string, unknown>).label ?? 0) > 0 ? 1 : 0), 0);
    const missingByColumn: Record<string, { missing: number; missingPct: number }> = {};
    for (const h of headers) {
      let missing = 0;
      for (const row of result.rows) {
        if (isMissing((row as Record<string, unknown>)[h])) missing += 1;
      }
      missingByColumn[h] = {
        missing,
        missingPct: totalRows > 0 ? Number(((missing / totalRows) * 100).toFixed(4)) : 0,
      };
    }
    const manifest = {
      generatedAt: new Date().toISOString(),
      sqlPath,
      csvPath: resolvedOut,
      totalRows,
      positives,
      positiveRate: totalRows > 0 ? Number((positives / totalRows).toFixed(6)) : 0,
      missingByColumn,
    };
    const manifestPath = resolvedOut.replace(/\.csv$/i, ".manifest.json");
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Wrote manifest to ${manifestPath}`);

    if (result.rows.length === 0) {
      console.log("No training rows found. CSV header was written for downstream fallback.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
