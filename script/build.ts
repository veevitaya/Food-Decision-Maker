import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Resolve paths relative to this script file, not cwd
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Server deps to bundle (reduces cold start syscalls)
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildApi() {
  await rm(path.join(ROOT, "dist/index.cjs"), { force: true });

  console.log("building api...");
  const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: [path.join(ROOT, "apps/api/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.join(ROOT, "dist/index.cjs"),
    // Shim import.meta.url for CJS. Point to the original source location
    // (apps/api/) so relative paths like "../../migrations" resolve correctly.
    banner: {
      js: `const __importMetaUrl = require("url").pathToFileURL(require("path").resolve(__dirname, "../apps/api/index.js")).href;`,
    },
    define: {
      "process.env.NODE_ENV": '"production"',
      "import.meta.url": "__importMetaUrl",
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("api build complete → dist/index.cjs");
}

buildApi().catch((err) => {
  console.error(err);
  process.exit(1);
});
