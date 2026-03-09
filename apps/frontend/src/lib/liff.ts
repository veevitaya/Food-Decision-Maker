import liff from "@line/liff";

const LIFF_ID = import.meta.env.VITE_LIFF_ID || "";

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface ShareResult {
  shared: boolean;
  method: "liff" | "line-app" | "clipboard";
}

let initialized = false;
let initPromise: Promise<void> | null = null;
let cachedProfile: LineProfile | null = null;

export function isLiffAvailable(): boolean {
  return !!LIFF_ID;
}

export async function initLiff(): Promise<boolean> {
  if (!LIFF_ID) return false;
  if (initialized) return true;

  if (!initPromise) {
    initPromise = liff.init({ liffId: LIFF_ID }).then(() => {
      initialized = true;
    }).catch((err) => {
      console.error("LIFF init failed:", err);
      initPromise = null;
    });
  }

  await initPromise;
  return initialized;
}

export function isLoggedIn(): boolean {
  if (!initialized) return false;
  return liff.isLoggedIn();
}

export function login(): void {
  if (!initialized) return;
  liff.login();
}

export function logout(): void {
  if (!initialized) return;
  cachedProfile = null;
  liff.logout();
}

export async function getProfile(): Promise<LineProfile | null> {
  if (cachedProfile) return cachedProfile;
  if (!initialized || !liff.isLoggedIn()) return null;
  try {
    const profile = await liff.getProfile();
    cachedProfile = {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
    return cachedProfile;
  } catch (err) {
    console.error("Failed to get LINE profile:", err);
    return null;
  }
}

export function getCachedProfile(): LineProfile | null {
  return cachedProfile;
}

export async function ensureLoggedIn(): Promise<LineProfile | null> {
  const ready = await initLiff();
  if (!ready) return null;
  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }
  return getProfile();
}

export async function shareMessage(text: string): Promise<ShareResult> {
  const ready = await initLiff();

  if (ready && initialized) {
    try {
      if (liff.isApiAvailable("shareTargetPicker")) {
        const result = await liff.shareTargetPicker([
          { type: "text", text },
        ]);
        if (result && "status" in result && result.status === "success") {
          return { shared: true, method: "liff" };
        }
        return { shared: false, method: "liff" };
      }
    } catch (err) {
      console.error("shareTargetPicker failed:", err);
    }
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
    window.location.href = lineUrl;
    return { shared: true, method: "line-app" };
  } else {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
    const popup = window.open(lineUrl, "_blank", "width=500,height=600");
    if (!popup) {
      return { shared: false, method: "line-app" };
    }
    return { shared: true, method: "line-app" };
  }
}

/** Build a shareable LIFF deep-link. Falls back to origin URL when LIFF_ID is not configured. */
export function liffUrl(path: string, params?: Record<string, string>): string {
  const base = LIFF_ID
    ? `https://liff.line.me/${LIFF_ID}${path}`
    : `${window.location.origin}${path}`;
  if (!params || Object.keys(params).length === 0) return base;
  return `${base}?${new URLSearchParams(params).toString()}`;
}

export async function sendInvite(mode: string): Promise<ShareResult> {
  const joinUrl = liffUrl("/swipe", { mode });
  const message = `Join me on Toast!\n\nLet's decide what to eat together. I'm swiping on ${mode} mode right now!\n\nTap to join:\n${joinUrl}`;
  return shareMessage(message);
}

export async function sendGroupInvite(sessionId: string): Promise<ShareResult> {
  const joinUrl = liffUrl("/group/waiting", { session: sessionId });
  const message = `Toast Group Session!\n\nJoin our food swiping session and let's find the perfect meal together!\n\nTap to join:\n${joinUrl}`;
  return shareMessage(message);
}

export function isInLiff(): boolean {
  if (!initialized) return false;
  return liff.isInClient();
}

export function getAccessToken(): string | null {
  if (!initialized) return null;
  return liff.getAccessToken();
}

export function getLiffIdToken(): string | null {
  if (!initialized) return null;
  try {
    return liff.getIDToken() ?? null;
  } catch {
    return null;
  }
}
