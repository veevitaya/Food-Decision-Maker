import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Env diagnostics ────────────────────────────────────────────────────────
{
  const env = import.meta.env;

  // Dump the full env object so nothing is hidden
  console.group("%c[env] Full import.meta.env", "color: #6366f1; font-weight: bold");
  console.log(env);
  console.groupEnd();

  // Targeted VITE_ var check
  console.group("%c[env] VITE_ variable check", "color: #6366f1; font-weight: bold");
  console.log("MODE            :", env.MODE);
  console.log("BASE_URL        :", env.BASE_URL);
  console.log("VITE_LIFF_ID    :", env.VITE_LIFF_ID    ?? "❌ NOT SET");
  console.log("VITE_LIFF_AUTO_LOGIN:", env.VITE_LIFF_AUTO_LOGIN ?? "❌ NOT SET");
  if (!env.VITE_LIFF_ID) {
    console.error(
      "[env] ❌ VITE_LIFF_ID is undefined.\n" +
      "  Possible causes:\n" +
      "  1. Dev server was started BEFORE .env was created — restart pnpm dev\n" +
      "  2. .env is in the wrong directory — it must be at the REPO ROOT (not inside apps/frontend)\n" +
      "  3. envDir in vite.config.ts resolves to: " + new URL("../../", import.meta.url).pathname + "\n" +
      "  4. Variable is missing the VITE_ prefix"
    );
  } else {
    console.log("%c[env] ✅ VITE_LIFF_ID loaded successfully", "color: green");
  }
  console.groupEnd();
}

createRoot(document.getElementById("root")!).render(<App />);
