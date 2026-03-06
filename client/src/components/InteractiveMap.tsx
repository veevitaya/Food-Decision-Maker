import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapPin {
  id: number;
  name: string;
  emoji: string;
  category: string;
  price: string;
  imageUrl?: string | null;
  lat: number;
  lng: number;
}

const PIN_PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#f59e0b'/>
          <stop offset='100%' stop-color='#ef4444'/>
        </linearGradient>
      </defs>
      <rect width='64' height='64' rx='32' fill='url(#g)'/>
      <circle cx='32' cy='24' r='8' fill='white' fill-opacity='0.92'/>
      <rect x='20' y='36' width='24' height='10' rx='5' fill='white' fill-opacity='0.92'/>
    </svg>`,
  );

interface InteractiveMapProps {
  pins: MapPin[];
  center: [number, number];
  zoom?: number;
  selectedPinId: number | null;
  onPinSelect: (id: number) => void;
  filteredCategory: string | null;
}

export function InteractiveMap({ pins, center, zoom = 13, selectedPinId, onPinSelect, filteredCategory }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const onPinSelectRef = useRef(onPinSelect);
  onPinSelectRef.current = onPinSelect;

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 11,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    userMarkerRef.current = L.marker(center, {
      icon: L.divIcon({
        html: `<div class="user-location-dot"><span class="user-location-core"></span></div>`,
        className: "user-location-icon",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    map.setView(center, zoom, { animate: true });
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(center);
    }
  }, [center, zoom]);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !selectedPinId) return;
    const pin = pins.find(p => p.id === selectedPinId);
    if (pin) {
      map.panTo([pin.lat, pin.lng], { animate: true });
    }
  }, [selectedPinId, pins]);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    setTimeout(() => map.invalidateSize(), 100);
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    const withImage = pins.filter((pin) => Boolean(pin.imageUrl && pin.imageUrl.trim())).length;
    const withoutImage = pins.length - withImage;
    console.log("[liff-map-debug] marker render pass", {
      totalPins: pins.length,
      withImage,
      withoutImage,
      selectedPinId,
      filteredCategory,
      sampleWithoutImage: pins
        .filter((pin) => !(pin.imageUrl && pin.imageUrl.trim()))
        .slice(0, 5)
        .map((pin) => ({ id: pin.id, name: pin.name })),
    });

    pins.forEach((pin) => {
      const isFiltered = !filteredCategory || pin.category === filteredCategory;
      const isSelected = selectedPinId === pin.id;
      const isBarsPin = pin.category === "Bars" && filteredCategory === "Bars" && isFiltered && !isSelected;
      const safeSrc = (pin.imageUrl || PIN_PLACEHOLDER_IMAGE).replace(/"/g, "&quot;");
      const safeAlt = pin.name.replace(/"/g, "&quot;");
      const imageHtml = `<img src="${safeSrc}" alt="${safeAlt}" class="pin-thumb" />`;

      const html = `
        <div class="pin-marker ${isSelected ? 'pin-selected' : ''} ${!isFiltered ? 'pin-dimmed' : ''} ${isBarsPin ? 'pin-drunk-sway' : ''}" data-testid="map-pin-${pin.id}">
          <div class="pin-content">
            ${imageHtml}
            <span class="pin-price">${pin.price}</span>
          </div>
          ${isSelected ? '<div class="pin-arrow"></div>' : ''}
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: "custom-pin-icon",
        iconSize: [70, 30],
        iconAnchor: [35, 15],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map);
      marker.on("click", () => onPinSelectRef.current(pin.id));
      markersRef.current.set(pin.id, marker);
    });
  }, [pins, selectedPinId, filteredCategory]);

  return (
    <>
      <div ref={mapRef} className="w-full h-full" />
      <style>{`
        .custom-pin-icon {
          background: none !important;
          border: none !important;
          overflow: visible !important;
        }
        .pin-marker {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pin-content {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 4px 8px;
          border-radius: 20px;
          background: white;
          font-size: 11px;
          font-weight: 700;
          font-family: 'Figtree', sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          white-space: nowrap;
          line-height: 1.2;
          overflow: hidden;
        }
        .pin-emoji {
          font-size: 12px;
          line-height: 1;
          flex-shrink: 0;
        }
        .pin-thumb {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(0,0,0,0.08);
        }
        .pin-price {
          font-size: 11px;
          line-height: 1;
          flex-shrink: 0;
        }
        .pin-selected .pin-content {
          background: hsl(222, 47%, 11%);
          color: white;
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        }
        .pin-selected {
          transform: translate(-50%, -50%) scale(1.1);
          z-index: 100 !important;
        }
        .pin-dimmed .pin-content {
          background: rgba(255,255,255,0.6);
          color: rgba(0,0,0,0.4);
        }
        .pin-arrow {
          position: absolute;
          left: 50%;
          bottom: -6px;
          transform: translateX(-50%) rotate(45deg);
          width: 10px;
          height: 10px;
          background: hsl(222, 47%, 11%);
        }
        .leaflet-container {
          background: #F0EDE8 !important;
          z-index: 0 !important;
          isolation: isolate;
        }
        .leaflet-tile {
          filter: saturate(0.9) contrast(0.95) brightness(1.02);
        }
        .user-location-icon {
          background: none !important;
          border: none !important;
        }
        .user-location-dot {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.25);
        }
        .user-location-core {
          width: 11px;
          height: 11px;
          border-radius: 999px;
          background: #3b82f6;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px rgba(30, 64, 175, 0.12);
          display: block;
        }
        .pin-drunk-sway {
          animation: pin-sway 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
          transform-origin: bottom center;
        }
        .pin-drunk-sway:nth-child(odd) {
          animation-delay: -2s;
        }
        @keyframes pin-sway {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          15% { transform: translate(-50%, -50%) rotate(-4deg) translateX(-3px); }
          35% { transform: translate(-50%, -50%) rotate(5deg) translateX(4px); }
          55% { transform: translate(-50%, -50%) rotate(3deg) translateX(2px); }
          75% { transform: translate(-50%, -50%) rotate(-3deg) translateX(-2px); }
          90% { transform: translate(-50%, -50%) rotate(2deg) translateX(1px); }
          100% { transform: translate(-50%, -50%) rotate(0deg); }
        }
      `}</style>
    </>
  );
}
