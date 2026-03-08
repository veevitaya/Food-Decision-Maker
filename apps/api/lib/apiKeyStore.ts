/**
 * Runtime API key store.
 * Keys are persisted in admin_configs DB table and loaded into memory here.
 * Falls back to process.env when a DB value isn't set.
 */

export const ALLOWED_SERVICE_IDS = [
  "google_places",
  "google_analytics",
  "line_liff",
  "line_messaging",
] as const;

export type ServiceId = (typeof ALLOWED_SERVICE_IDS)[number];

// Map of env var names for each service
const ENV_VAR_MAP: Record<ServiceId, string> = {
  google_places: "GOOGLE_PLACES_API_KEY",
  google_analytics: "VITE_GA_MEASUREMENT_ID",
  line_liff: "VITE_LIFF_ID",
  line_messaging: "LINE_CHANNEL_ACCESS_TOKEN",
};

// In-memory key cache — populated from DB on startup and updated on admin save
const keyStore = new Map<string, string>();

export function setKey(serviceId: string, key: string): void {
  keyStore.set(serviceId, key.trim());
}

export function getKey(serviceId: string): string | undefined {
  const fromStore = keyStore.get(serviceId);
  if (fromStore) return fromStore;
  const envVar = ENV_VAR_MAP[serviceId as ServiceId];
  const fromEnv = envVar ? process.env[envVar]?.trim() : undefined;
  return fromEnv || undefined;
}

export function getSource(serviceId: string): "db" | "env" | "none" {
  if (keyStore.has(serviceId)) return "db";
  const envVar = ENV_VAR_MAP[serviceId as ServiceId];
  if (envVar && process.env[envVar]?.trim()) return "env";
  return "none";
}

export function isConfigured(serviceId: string): boolean {
  return getSource(serviceId) !== "none";
}

/** Load keys from DB into memory — call once on API startup */
export async function loadFromDb(
  getAdminConfig: (key: string) => Promise<{ value: Record<string, unknown> } | undefined>,
): Promise<void> {
  try {
    const config = await getAdminConfig("api_keys");
    if (!config?.value) return;
    for (const [id, key] of Object.entries(config.value)) {
      if (typeof key === "string" && key.trim() && ALLOWED_SERVICE_IDS.includes(id as ServiceId)) {
        keyStore.set(id, key.trim());
      }
    }
  } catch {
    // Non-fatal — will fall back to env vars
  }
}
