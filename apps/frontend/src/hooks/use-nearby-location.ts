import { useState, useEffect, useMemo } from "react";

interface Landmark {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  type: "mall" | "area" | "station";
  emoji: string;
  restaurants: LandmarkRestaurant[];
}

interface LandmarkRestaurant {
  name: string;
  category: string;
  floor?: string;
  rating: string;
  priceLevel: number;
  imageUrl: string;
}

export interface NearbyResult {
  detected: boolean;
  landmark: Landmark | null;
  distance: number | null;
  locationGranted: boolean;
  userLat: number | null;
  userLng: number | null;
}

const BANGKOK_LANDMARKS: Landmark[] = [
  {
    id: "centralworld",
    name: "CentralWorld",
    shortName: "CentralWorld",
    lat: 13.7466,
    lng: 100.5393,
    type: "mall",
    emoji: "🏬",
    restaurants: [
      { name: "Eathai", category: "Thai  •  Food hall", floor: "LG Floor", rating: "4.7", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&auto=format&fit=crop&q=60" },
      { name: "Din Tai Fung", category: "Chinese  •  Dumplings", floor: "7th Floor", rating: "4.6", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&auto=format&fit=crop&q=60" },
      { name: "After You", category: "Cafe  •  Dessert", floor: "6th Floor", rating: "4.5", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&auto=format&fit=crop&q=60" },
      { name: "Sushi Hiro", category: "Japanese  •  Sushi", floor: "7th Floor", rating: "4.4", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&auto=format&fit=crop&q=60" },
      { name: "Greyhound Cafe", category: "Thai  •  Modern", floor: "6th Floor", rating: "4.3", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&auto=format&fit=crop&q=60" },
    ],
  },
  {
    id: "siamparagon",
    name: "Siam Paragon",
    shortName: "Siam Paragon",
    lat: 13.7454,
    lng: 100.5341,
    type: "mall",
    emoji: "🏬",
    restaurants: [
      { name: "Sushi Masa", category: "Japanese  •  Omakase", floor: "G Floor", rating: "4.8", priceLevel: 4, imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&auto=format&fit=crop&q=60" },
      { name: "Nara Thai", category: "Thai  •  Fine dining", floor: "4th Floor", rating: "4.6", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&auto=format&fit=crop&q=60" },
      { name: "Gourmet Market", category: "International  •  Food hall", floor: "G Floor", rating: "4.5", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&auto=format&fit=crop&q=60" },
      { name: "Blue by Alain Ducasse", category: "French  •  Fine dining", floor: "5th Floor", rating: "4.7", priceLevel: 4, imageUrl: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=400&auto=format&fit=crop&q=60" },
      { name: "S&P Restaurant", category: "Thai  •  Family", floor: "4th Floor", rating: "4.2", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&auto=format&fit=crop&q=60" },
    ],
  },
  {
    id: "emquartier",
    name: "EmQuartier",
    shortName: "EmQuartier",
    lat: 13.7310,
    lng: 100.5695,
    type: "mall",
    emoji: "🏬",
    restaurants: [
      { name: "Roast Coffee", category: "Cafe  •  Brunch", floor: "G Floor", rating: "4.6", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop&q=60" },
      { name: "Pizza Massilia", category: "Italian  •  Pizza", floor: "G Floor", rating: "4.5", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=60" },
      { name: "Quince", category: "Thai  •  Modern", floor: "5th Floor", rating: "4.7", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&auto=format&fit=crop&q=60" },
      { name: "Another Hound Cafe", category: "Western  •  Cafe", floor: "3rd Floor", rating: "4.4", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&auto=format&fit=crop&q=60" },
      { name: "Open House", category: "International  •  Co-dining", floor: "6th Floor", rating: "4.3", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=400&auto=format&fit=crop&q=60" },
    ],
  },
  {
    id: "iconsiam",
    name: "ICONSIAM",
    shortName: "ICONSIAM",
    lat: 13.7265,
    lng: 100.5100,
    type: "mall",
    emoji: "🏬",
    restaurants: [
      { name: "Sook Siam", category: "Thai  •  Food hall", floor: "G Floor", rating: "4.7", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&auto=format&fit=crop&q=60" },
      { name: "Jumbo Seafood", category: "Chinese  •  Seafood", floor: "6th Floor", rating: "4.5", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&auto=format&fit=crop&q=60" },
      { name: "Ootoya", category: "Japanese  •  Set meals", floor: "4th Floor", rating: "4.4", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400&auto=format&fit=crop&q=60" },
      { name: "SEEN Restaurant", category: "Rooftop  •  Fine dining", floor: "26th Floor", rating: "4.6", priceLevel: 4, imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&auto=format&fit=crop&q=60" },
    ],
  },
  {
    id: "terminal21",
    name: "Terminal 21",
    shortName: "Terminal 21",
    lat: 13.7378,
    lng: 100.5602,
    type: "mall",
    emoji: "🏬",
    restaurants: [
      { name: "Pier 21 Food Court", category: "Thai  •  Food court", floor: "5th Floor", rating: "4.5", priceLevel: 1, imageUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&auto=format&fit=crop&q=60" },
      { name: "Hokkaido Ramen", category: "Japanese  •  Ramen", floor: "5th Floor", rating: "4.4", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400&auto=format&fit=crop&q=60" },
      { name: "MK Restaurants", category: "Thai  •  Hot pot", floor: "4th Floor", rating: "4.3", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400&auto=format&fit=crop&q=60" },
      { name: "Mos Burger", category: "Japanese  •  Burgers", floor: "5th Floor", rating: "4.2", priceLevel: 1, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60" },
    ],
  },
  {
    id: "siamsquare",
    name: "Siam Square",
    shortName: "Siam Square",
    lat: 13.7447,
    lng: 100.5342,
    type: "area",
    emoji: "🎯",
    restaurants: [
      { name: "Som Tam Nua", category: "Thai  •  Isaan", rating: "4.7", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&auto=format&fit=crop&q=60" },
      { name: "Mango Tango", category: "Thai  •  Dessert", rating: "4.4", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1621293954908-907159247fc8?w=400&auto=format&fit=crop&q=60" },
      { name: "Inter", category: "Thai  •  Curry", rating: "4.5", priceLevel: 1, imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&auto=format&fit=crop&q=60" },
    ],
  },
  {
    id: "thonglor",
    name: "Thonglor",
    shortName: "Thonglor",
    lat: 13.7329,
    lng: 100.5795,
    type: "area",
    emoji: "📍",
    restaurants: [
      { name: "72 Courtyard", category: "Mixed  •  Lifestyle", rating: "4.5", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&auto=format&fit=crop&q=60" },
      { name: "Bo.Lan", category: "Thai  •  Fine dining", rating: "4.8", priceLevel: 4, imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&auto=format&fit=crop&q=60" },
      { name: "Peppina", category: "Italian  •  Pizza", rating: "4.6", priceLevel: 3, imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=60" },
    ],
  },
  {
    id: "ari",
    name: "Ari",
    shortName: "Ari",
    lat: 13.7730,
    lng: 100.5445,
    type: "area",
    emoji: "📍",
    restaurants: [
      { name: "Roots Coffee", category: "Cafe  •  Specialty", rating: "4.7", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop&q=60" },
      { name: "Lay Lao", category: "Thai  •  Isaan", rating: "4.6", priceLevel: 1, imageUrl: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&auto=format&fit=crop&q=60" },
      { name: "Sarnies", category: "Cafe  •  Brunch", rating: "4.5", priceLevel: 2, imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&auto=format&fit=crop&q=60" },
    ],
  },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const DETECTION_RADIUS = 600;

export function useNearbyLocation() {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
        setLocationGranted(true);
      },
      () => {
        setLocationGranted(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const nearbyResult: NearbyResult = useMemo(() => {
    if (userLat === null || userLng === null) {
      return { detected: false, landmark: null, distance: null, locationGranted, userLat, userLng };
    }

    let closestLandmark: Landmark | null = null;
    let closestDistance = Infinity;

    for (const landmark of BANGKOK_LANDMARKS) {
      const dist = haversineDistance(userLat, userLng, landmark.lat, landmark.lng);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestLandmark = landmark;
      }
    }

    if (closestLandmark && closestDistance <= DETECTION_RADIUS) {
      return {
        detected: true,
        landmark: closestLandmark,
        distance: Math.round(closestDistance),
        locationGranted,
        userLat,
        userLng,
      };
    }

    return { detected: false, landmark: null, distance: null, locationGranted, userLat, userLng };
  }, [userLat, userLng, locationGranted]);

  return nearbyResult;
}

export { BANGKOK_LANDMARKS };
export type { Landmark, LandmarkRestaurant };
