import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initLiff, isLiffAvailable } from "./lib/liff";

const root = createRoot(document.getElementById("root")!);

async function bootstrap() {
  if (isLiffAvailable()) {
    // Pre-initialize LIFF once at app startup to reduce auth-related race conditions.
    await initLiff({ autoLogin: false });
  }

  root.render(<App />);
}

void bootstrap();
