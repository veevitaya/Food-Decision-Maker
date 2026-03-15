import { replayDlq } from "../../lib/eventQueue";

async function main() {
  const rawLimit = Number(process.argv[2] ?? "100");
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.floor(rawLimit), 1000)) : 100;
  const result = await replayDlq(limit);
  console.log(JSON.stringify(result));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
