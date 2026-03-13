import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { initLiff, getProfile, isLoggedIn, login, logout, isLiffAvailable, isInLiff } from "@/lib/liff";
import type { LineProfile } from "@/lib/liff";
import { grantBehaviorConsent } from "@/lib/eventTracker";

const STORAGE_KEY = "toast_line_profile";

let cachedProfile: LineProfile | null = null;
let listeners: Set<() => void> = new Set();

function notify() {
  for (const l of listeners) l();
}

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    cachedProfile = JSON.parse(stored);
    // Backfill consent for returning users who were already logged in before this was introduced
    if (cachedProfile?.userId) grantBehaviorConsent();
  }
} catch {}

function setProfile(profile: LineProfile | null) {
  cachedProfile = profile;
  if (profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  notify();
}

export function useLineProfile() {
  const [loading, setLoading] = useState(false);
  const [liffReady, setLiffReady] = useState(false);

  const profile = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => cachedProfile
  );

  useEffect(() => {
    if (!isLiffAvailable()) return;
    initLiff().then((ready) => {
      setLiffReady(ready);
      if (ready && isLoggedIn()) {
        setLoading(true);
        getProfile().then((p) => {
          if (p) {
            setProfile(p);
            grantBehaviorConsent();
          }
          setLoading(false);
        });
      }
    });
  }, []);

  const handleLogin = useCallback(() => {
    if (liffReady) {
      login();
    }
  }, [liffReady]);

  const handleLogout = useCallback(() => {
    logout();
    setProfile(null);
  }, []);

  const setMockProfile = useCallback((p: LineProfile) => {
    setProfile(p);
  }, []);

  return {
    profile,
    loading,
    liffReady,
    loggedIn: liffReady ? isLoggedIn() : false,
    liffAvailable: isLiffAvailable(),
    isInLiff: liffReady ? isInLiff() : false,
    login: handleLogin,
    logout: handleLogout,
    setMockProfile,
  };
}

export function getStoredProfile(): LineProfile | null {
  return cachedProfile;
}
