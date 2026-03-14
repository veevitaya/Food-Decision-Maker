const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const districtCache = new Map<string, { value: string | null; ts: number }>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

function pickDistrict(address: Record<string, unknown> | undefined): string | null {
  const candidates = [
    address?.city_district,
    address?.suburb,
    address?.borough,
    address?.quarter,
    address?.neighbourhood,
    address?.city,
    address?.town,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

export async function reverseGeocodeDistrict(lat: number, lng: number): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const key = cacheKey(lat, lng);
  const cached = districtCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const url = `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "toast-food-app/1.0",
        "Accept-Language": "en",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      districtCache.set(key, { value: null, ts: Date.now() });
      return null;
    }
    const json = (await res.json()) as { address?: Record<string, unknown> };
    const district = pickDistrict(json.address);
    districtCache.set(key, { value: district, ts: Date.now() });
    return district;
  } catch {
    districtCache.set(key, { value: null, ts: Date.now() });
    return null;
  }
}
