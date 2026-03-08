import { useSyncExternalStore } from "react";

export interface ActiveSession {
  id: string;
  type: "solo" | "group";
  label: string;
  route: string;
  memberCount?: number;
  matchCount?: number;
  startedAt: number;
}

let sessions: ActiveSession[] = [];
let listeners: Set<() => void> = new Set();

function notify() {
  for (const l of listeners) l();
  try {
    sessionStorage.setItem("toast_sessions", JSON.stringify(sessions));
  } catch {}
}

try {
  const stored = sessionStorage.getItem("toast_sessions");
  if (stored) sessions = JSON.parse(stored);
} catch {}

export function addSession(session: ActiveSession) {
  if (sessions.find((s) => s.id === session.id)) return;
  sessions = [...sessions, session];
  notify();
}

export function removeSession(id: string) {
  sessions = sessions.filter((s) => s.id !== id);
  notify();
}

export function updateSession(id: string, updates: Partial<ActiveSession>) {
  sessions = sessions.map((s) => (s.id === id ? { ...s, ...updates } : s));
  notify();
}

export function useSessions(): ActiveSession[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sessions,
  );
}
