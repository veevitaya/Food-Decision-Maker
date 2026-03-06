import liff from "@line/liff";

const RAW_LIFF_ID = import.meta.env.VITE_LIFF_ID;
const LIFF_ID = RAW_LIFF_ID || "";
const AUTO_LOGIN =
  (import.meta.env.VITE_LIFF_AUTO_LOGIN || "false").toLowerCase() === "true";

if (!LIFF_ID) {
  const viteKeys = Object.keys(import.meta.env).filter((key) => key.startsWith("VITE_"));
  console.log("[LIFF env debug] VITE_LIFF_ID is empty or missing.", {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    VITE_LIFF_ID: RAW_LIFF_ID ?? null,
    VITE_LIFF_AUTO_LOGIN: import.meta.env.VITE_LIFF_AUTO_LOGIN ?? null,
    availableViteKeys: viteKeys,
    hint: "Client code only receives Vite env vars prefixed with VITE_. Restart dev server after editing .env.",
  });
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

type InitOptions = {
  autoLogin?: boolean;
};

let initialized = false;
let initPromise: Promise<void> | null = null;
const GROUP_LIFF_INVITE_BASE = "https://liff.line.me/2009257970-yD2Hc8Zt";

export function isLiffAvailable(): boolean {
  return LIFF_ID.length > 0;
}

export async function initLiff(options: InitOptions = {}): Promise<boolean> {
  if (!isLiffAvailable()) return false;
  if (initialized) return true;

  if (!initPromise) {
    initPromise = liff
      .init({ liffId: LIFF_ID })
      .then(() => {
        initialized = true;
      })
      .catch((err) => {
        console.error("LIFF init failed:", err);
        initPromise = null;
      });
  }

  await initPromise;

  const shouldAutoLogin = options.autoLogin ?? AUTO_LOGIN;
  if (initialized && shouldAutoLogin && !liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
  }

  return initialized;
}

export function isLoggedIn(): boolean {
  if (!initialized) return false;
  return liff.isLoggedIn();
}

export function login(): void {
  if (!initialized) return;
  liff.login({ redirectUri: window.location.href });
}

export function logout(): void {
  if (!initialized) return;
  liff.logout();
}

export async function getProfile(): Promise<LineProfile | null> {
  if (!initialized || !liff.isLoggedIn()) return null;
  try {
    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (err) {
    console.error("Failed to get LINE profile:", err);
    return null;
  }
}

export function getLiffIdToken(): string | null {
  if (!initialized || !liff.isLoggedIn()) return null;
  return liff.getIDToken() || null;
}

/** Returns the nonce embedded in the ID token, if present.
 *  Required for server-side verification when LIFF runs in an external browser (PC). */
export function getLiffNonce(): string | null {
  if (!initialized || !liff.isLoggedIn()) return null;
  return liff.getDecodedIDToken()?.nonce ?? null;
}

export function getLiffAccessToken(): string | null {
  if (!initialized || !liff.isLoggedIn()) return null;
  return liff.getAccessToken() || null;
}

export function isInLiff(): boolean {
  if (!initialized) return false;
  return liff.isInClient();
}

export function closeLiffWindow(): void {
  if (!initialized || !liff.isInClient()) return;
  liff.closeWindow();
}

export async function shareMessage(text: string): Promise<boolean> {
  if (!initialized) return false;
  try {
    if (!liff.isApiAvailable("shareTargetPicker")) {
      const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
      window.open(lineUrl, "_blank");
      return true;
    }
    await liff.shareTargetPicker([{ type: "text", text }]);
    return true;
  } catch (err) {
    console.error("Failed to share:", err);
    return false;
  }
}

export async function sendInvite(mode: string): Promise<boolean> {
  const appUrl = window.location.origin;
  const message = `Join me on Toast!\n\nLet's decide what to eat together. I'm swiping on ${mode} mode right now.\n\n${appUrl}/swipe?mode=${mode}`;
  return shareMessage(message);
}

export async function sendGroupInvite(sessionId: string): Promise<boolean> {
  const joinUrl = `${GROUP_LIFF_INVITE_BASE}?room=${encodeURIComponent(sessionId)}`;
  const message = `Toast Group Session!\n\nJoin our food swiping session and let's find the perfect meal together.\n\n${joinUrl}`;
  return shareMessage(message);
}
