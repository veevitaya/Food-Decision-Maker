/**
 * LINE Messaging API service.
 * Wraps channel-access-token calls for push/multicast/broadcast.
 * Requires LINE_CHANNEL_ACCESS_TOKEN env var.
 */

const LINE_API = "https://api.line.me/v2/bot/message";

function getToken(): string | null {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? null;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export interface LineTextMessage {
  type: "text";
  text: string;
}

export type LineMessage = LineTextMessage;

/**
 * Send a push message to a single LINE user.
 * Silently skips if LINE_CHANNEL_ACCESS_TOKEN is not configured.
 */
export async function sendToUser(lineUserId: string, messages: LineMessage[]): Promise<boolean> {
  const token = getToken();
  if (!token) {
    console.warn("[line/messaging] LINE_CHANNEL_ACCESS_TOKEN not set — skipping push to", lineUserId);
    return false;
  }
  try {
    const res = await fetch(`${LINE_API}/push`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ to: lineUserId, messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[line/messaging] push failed:", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[line/messaging] push error:", err);
    return false;
  }
}

/**
 * Multicast — send to up to 500 LINE users at once.
 */
export async function sendToUsers(lineUserIds: string[], messages: LineMessage[]): Promise<boolean> {
  const token = getToken();
  if (!token) {
    console.warn("[line/messaging] LINE_CHANNEL_ACCESS_TOKEN not set — skipping multicast");
    return false;
  }
  if (lineUserIds.length === 0) return true;
  try {
    const res = await fetch(`${LINE_API}/multicast`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ to: lineUserIds, messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[line/messaging] multicast failed:", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[line/messaging] multicast error:", err);
    return false;
  }
}

/**
 * Broadcast to all users who have added the bot.
 */
export async function sendBroadcast(messages: LineMessage[]): Promise<boolean> {
  const token = getToken();
  if (!token) {
    console.warn("[line/messaging] LINE_CHANNEL_ACCESS_TOKEN not set — skipping broadcast");
    return false;
  }
  try {
    const res = await fetch(`${LINE_API}/broadcast`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[line/messaging] broadcast failed:", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[line/messaging] broadcast error:", err);
    return false;
  }
}

export function isConfigured(): boolean {
  return !!getToken();
}
