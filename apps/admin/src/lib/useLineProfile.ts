import { useState, useEffect } from "react";
import { initLiff, getProfile, isLoggedIn, isLiffAvailable, login, isInLiff, type LineProfile } from "./liff";

const GUEST_KEY = "toast_guest_profile";

function getGuestProfile(): LineProfile {
  const stored = localStorage.getItem(GUEST_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch {}
  }
  const guestId = "guest_" + Math.random().toString(36).substring(2, 10);
  const profile: LineProfile = {
    userId: guestId,
    displayName: "You",
    pictureUrl: undefined,
  };
  localStorage.setItem(GUEST_KEY, JSON.stringify(profile));
  return profile;
}

export function useLineProfile() {
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLineUser, setIsLineUser] = useState(false);

  useEffect(() => {
    async function init() {
      if (isLiffAvailable()) {
        const ready = await initLiff();
        if (ready) {
          if (isLoggedIn()) {
            const p = await getProfile();
            if (p) {
              localStorage.setItem(GUEST_KEY, JSON.stringify(p));
              setProfile(p);
              setIsLineUser(true);
              setLoading(false);
              return;
            }
          } else if (isInLiff()) {
            login();
            return;
          }
        }
      }
      setProfile(getGuestProfile());
      setIsLineUser(false);
      setLoading(false);
    }
    init();
  }, []);

  return { profile, loading, isLineUser };
}
