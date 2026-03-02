import { getLiffIdToken } from "./liff";

export function getAuthHeaders(includeJson = false): HeadersInit {
  const token = getLiffIdToken();
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
