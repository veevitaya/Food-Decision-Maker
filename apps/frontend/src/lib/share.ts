import { shareMessage } from "@/lib/liff";

export async function shareWithLiffOrClipboard(message: string): Promise<"liff" | "line-app" | "clipboard" | "failed"> {
  try {
    const result = await shareMessage(message);
    if (result.shared) return result.method;
  } catch {}

  try {
    await navigator.clipboard.writeText(message);
    return "clipboard";
  } catch {
    return "failed";
  }
}
