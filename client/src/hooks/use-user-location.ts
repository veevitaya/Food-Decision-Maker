import { useState, useEffect } from "react";

const DEFAULT_LAT = 13.742;
const DEFAULT_LNG = 100.54;

export interface UserLocation {
  lat: number;
  lng: number;
}

export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently fall back to defaults
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }, []);

  return location;
}
