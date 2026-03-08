import { createHash } from "crypto";

/**
 * Masks a userId for use in non-admin analytics responses.
 * Returns a deterministic short hash prefixed with "u_".
 * The original userId cannot be recovered from the masked value.
 */
export function maskUserId(userId: string | null | undefined): string {
  if (!userId) return "u_anonymous";
  return "u_" + createHash("sha256").update(userId).digest("hex").slice(0, 8);
}
