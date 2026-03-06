import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import AdminLayout from "./AdminLayout";

type MapCheckItem = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  rating: string;
  priceLevel: number;
  imageUrl: string;
  phone: string | null;
  distanceMeters: number;
};

type MapCheckResponse = {
  center: { lat: number; lng: number };
  radius: number;
  totalInDb: number;
  count: number;
  fromCache: boolean;
  cachedAt: string;
  items: MapCheckItem[];
};

const RADIUS_OPTIONS = [500, 1000, 2000, 3000, 5000, 10000];
const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];
const MAX_ACCEPTED_ACCURACY_M = 1000;

function safeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}

export default function AdminMapCheck() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(2000);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [geoError, setGeoError] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [locating, setLocating] = useState(false);
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);
  const [geoTimestamp, setGeoTimestamp] = useState<number | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const radiusCircle = useRef<L.Circle | null>(null);
  const centerLat = lat ?? DEFAULT_CENTER[0];
  const centerLng = lng ?? DEFAULT_CENTER[1];

  const queryKey = useMemo(() => ["admin-map-check", lat ?? "none", lng ?? "none", radius], [lat, lng, radius]);
  const { data, isLoading, refetch, isFetching } = useQuery<MapCheckResponse>({
    queryKey,
    enabled: lat !== null && lng !== null,
    queryFn: async () => {
      const url = new URL("/api/admin/map-check", window.location.origin);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lng", String(lng));
      url.searchParams.set("radius", String(radius));
      const res = await fetch(url.pathname + url.search, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load map data");
      return res.json();
    },
  });

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    markers.current = L.layerGroup().addTo(map);
    radiusCircle.current = L.circle(DEFAULT_CENTER, {
      radius,
      color: "#0f172a",
      fillColor: "#93c5fd",
      fillOpacity: 0.18,
      weight: 2,
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markers.current = null;
      radiusCircle.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    map.setView([centerLat, centerLng], map.getZoom(), { animate: true });
    if (radiusCircle.current) {
      radiusCircle.current.setLatLng([centerLat, centerLng]);
      radiusCircle.current.setRadius(radius);
    }
  }, [centerLat, centerLng, radius]);

  useEffect(() => {
    const map = leafletMap.current;
    const layer = markers.current;
    if (!map || !layer || !data) return;

    layer.clearLayers();

    L.marker([centerLat, centerLng], {
      icon: L.divIcon({
        html: '<div style="width:14px;height:14px;border-radius:999px;background:#0f172a;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.25)"></div>',
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    })
      .addTo(layer)
      .bindPopup(lat === null || lng === null ? "Default center (set location)" : "Current center");

    data.items.forEach((r) => {
      const thumb = r.imageUrl?.trim()
        ? `<img src="${safeAttr(r.imageUrl)}" alt="${safeAttr(r.name)}" class="mapcheck-thumb" />`
        : `<div class="mapcheck-thumb-fallback"></div>`;
      const markerIcon = L.divIcon({
        html: `<div class="mapcheck-pin ${selectedId === r.id ? "is-selected" : ""}">${thumb}</div>`,
        className: "",
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      const marker = L.marker([r.lat, r.lng], { icon: markerIcon }).addTo(layer);
      marker.on("click", () => setSelectedId(r.id));
      marker.bindPopup(
        `<div style="min-width:180px"><b>${r.name}</b><br/>${r.category} • ${"$".repeat(Math.max(1, Math.min(4, Number(r.priceLevel || 1))))}<br/>${r.address}<br/>${r.distanceMeters}m</div>`,
      );
      if (selectedId === r.id) marker.openPopup();
    });
  }, [data, centerLat, centerLng, lat, lng, selectedId]);

  const useCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    if (!window.isSecureContext) {
      setGeoError("Location requires HTTPS or localhost. Open this app on a secure origin.");
      return;
    }

    try {
      if ("permissions" in navigator) {
        const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        if (status.state === "denied") {
          setGeoStatus("denied");
          setGeoError("Location permission is blocked in browser settings. Please allow location for this site.");
          return;
        }
      }
    } catch {
      // Continue even if Permissions API is unavailable
    }

    setLocating(true);
    setGeoStatus("requesting");
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy ?? null;
        setGeoAccuracy(accuracy);
        setGeoTimestamp(pos.timestamp ?? Date.now());
        if (accuracy != null && accuracy > MAX_ACCEPTED_ACCURACY_M) {
          setGeoError(
            `Location rejected: low accuracy (${Math.round(accuracy)}m). Move to better signal or enter coordinates manually.`,
          );
          setLocating(false);
          return;
        }
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoError("");
        setGeoStatus("granted");
        setLocating(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus("denied");
          setGeoError("Location permission denied. Allow location access for this site and try again.");
        } else if (err.code === err.TIMEOUT) {
          setGeoError("Location request timed out. Try again outdoors or with better signal.");
        } else {
          setGeoError(err.message || "Failed to get current location");
        }
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );
  }, []);

  useEffect(() => {
    void useCurrentLocation();
  }, [useCurrentLocation]);

  return (
    <AdminLayout title="Map Check">
      <div className="grid gap-4">
        <div className="bg-white border rounded-xl p-3 md:p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Latitude</label>
            <input
              className="px-3 py-2 border rounded-lg text-sm w-36"
              value={lat ?? ""}
              onChange={(e) => {
                const next = Number(e.target.value);
                setLat(Number.isFinite(next) ? next : null);
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Longitude</label>
            <input
              className="px-3 py-2 border rounded-lg text-sm w-36"
              value={lng ?? ""}
              onChange={(e) => {
                const next = Number(e.target.value);
                setLng(Number.isFinite(next) ? next : null);
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Radius</label>
            <select
              className="px-3 py-2 border rounded-lg text-sm w-36 bg-white"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r} m</option>
              ))}
            </select>
          </div>
          <button
            className="px-3 py-2 bg-foreground text-white rounded-lg text-sm disabled:opacity-50"
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? "Locating..." : "Use Current Location"}
          </button>
          <button className="px-3 py-2 border rounded-lg text-sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </button>
        </div>
        {lat === null || lng === null ? (
          <p className="text-sm text-muted-foreground">
            Waiting for real browser location. Allow location access or enter coordinates manually.
          </p>
        ) : null}

        {geoError && <p className="text-sm text-red-600">{geoError}</p>}
        {geoStatus === "granted" && !geoError && (
          <p className="text-xs text-muted-foreground">
            Browser location granted. Using GPS/high-accuracy location when available.
          </p>
        )}

        <div className="grid md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Restaurants in DB</p>
            <p className="text-xl font-semibold">{data?.totalInDb ?? "-"}</p>
          </div>
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Within Radius</p>
            <p className="text-xl font-semibold">{data?.count ?? "-"}</p>
          </div>
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Cache</p>
            <p className="text-xl font-semibold">{data?.fromCache ? "HIT" : "MISS"}</p>
          </div>
          <div className="bg-white border rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Cached At</p>
            <p className="text-sm font-medium">{data?.cachedAt ? new Date(data.cachedAt).toLocaleTimeString() : "-"}</p>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-3 text-xs font-mono">
          <p className="text-muted-foreground mb-1">Location Debug</p>
          <p>
            source={lat === null || lng === null ? "default-center" : "browser-geolocation"} | status={geoStatus}
          </p>
          <p>lat={lat ?? "null"} lng={lng ?? "null"}</p>
          <p>accuracyMeters={geoAccuracy ?? "unknown"}</p>
          <p>timestamp={geoTimestamp ? new Date(geoTimestamp).toISOString() : "n/a"}</p>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="h-[58dvh] min-h-[420px] w-full">
            <div ref={mapRef} className="w-full h-full" />
          </div>
        </div>
        <style>{`
          .mapcheck-pin {
            width: 36px;
            height: 36px;
            border-radius: 999px;
            border: 2px solid #fff;
            overflow: hidden;
            box-shadow: 0 3px 10px rgba(0,0,0,.28);
            background: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .mapcheck-pin.is-selected {
            transform: scale(1.12);
            border-color: #0f172a;
          }
          .mapcheck-thumb {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .mapcheck-thumb-fallback {
            width: 14px;
            height: 14px;
            border-radius: 999px;
            background: #334155;
          }
        `}</style>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-semibold">Nearby Restaurants</div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-3 py-3">Loading...</p>
          ) : (data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground px-3 py-3">No restaurants found in selected radius.</p>
          ) : (
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2 hidden md:table-cell">Category</th>
                    <th className="text-left px-3 py-2">Distance</th>
                    <th className="text-left px-3 py-2 hidden lg:table-cell">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.items ?? []).map((r) => (
                    <tr key={r.id} className="hover:bg-muted/10 cursor-pointer" onClick={() => setSelectedId(r.id)}>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 hidden md:table-cell">{r.category}</td>
                      <td className="px-3 py-2">{r.distanceMeters} m</td>
                      <td className="px-3 py-2 hidden lg:table-cell text-muted-foreground">{r.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
