import { z } from "zod";
import type { Request, Response } from "express";

const verifyResponseSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.string(),
  exp: z.number(),
  iat: z.number(),
  nonce: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
  email: z.string().optional(),
});

export type VerifiedLineToken = z.infer<typeof verifyResponseSchema>;

export async function verifyLineIdToken(
  idToken: string,
  nonce?: string | null,
): Promise<VerifiedLineToken | null> {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId || !idToken) return null;

  const body = new URLSearchParams();
  body.set("id_token", idToken);
  body.set("client_id", channelId);
  if (nonce) body.set("nonce", nonce);

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = await res.json();

  if (!res.ok) {
    console.warn("[lineAuth] LINE verify rejected:", res.status, JSON.stringify(json));
    return null;
  }

  const parsed = verifyResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.warn("[lineAuth] LINE verify response schema mismatch:", parsed.error.message);
    return null;
  }

  return parsed.data;
}

export function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

export async function requireVerifiedLineUser(req: Request, res: Response): Promise<{ lineUserId: string } | null> {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ message: "Missing bearer token" });
    return null;
  }
  const verified = await verifyLineIdToken(token);
  if (!verified) {
    res.status(401).json({ message: "Invalid LINE ID token" });
    return null;
  }
  return { lineUserId: verified.sub };
}

export async function requireAdmin(req: Request, res: Response): Promise<{ lineUserId: string; role: string } | null> {
  const verifiedUser = await requireVerifiedLineUser(req, res);
  if (!verifiedUser) return null;
  return { lineUserId: verifiedUser.lineUserId, role: "admin" };
}
