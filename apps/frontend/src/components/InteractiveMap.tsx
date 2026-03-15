import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapPin {
  id: number;
  name: string;
  emoji: string;
  category: string;
  price: string;
  lat: number;
  lng: number;
}

interface InteractiveMapProps {
  pins: MapPin[];
  center: [number, number];
  zoom?: number;
  selectedPinId: number | null;
  onPinSelect: (id: number) => void;
  filteredCategory: string | null;
  activeLocation?: { lat: number; lng: number } | null;
}

export function InteractiveMap({ pins, center, zoom = 13, selectedPinId, onPinSelect, filteredCategory, activeLocation = null }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const activeLocationMarkerRef = useRef<L.Marker | null>(null);
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

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markersRef.current.clear();
      activeLocationMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    map.setView(center, zoom, { animate: true });
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

    pins.forEach((pin) => {
      const isFiltered = !filteredCategory || pin.category === filteredCategory;
      const isSelected = selectedPinId === pin.id;
      const isBarsPin = pin.category === "Bars" && filteredCategory === "Bars" && isFiltered && !isSelected;

      const html = `
        <div class="pin-marker ${isSelected ? 'pin-selected' : ''} ${!isFiltered ? 'pin-dimmed' : ''} ${isBarsPin ? 'pin-drunk-sway' : ''}" data-testid="map-pin-${pin.id}">
          <div class="pin-content">
            <span class="pin-emoji">${pin.emoji}</span>
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

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (!activeLocation) {
      if (activeLocationMarkerRef.current) {
        activeLocationMarkerRef.current.remove();
        activeLocationMarkerRef.current = null;
      }
      return;
    }

    const latlng: L.LatLngExpression = [activeLocation.lat, activeLocation.lng];
    const icon = L.divIcon({
      html: `
        <div class="active-location-pin" data-testid="map-active-location">
          <span class="active-location-pulse"></span>
          <span class="active-location-core"></span>
        </div>
      `,
      className: "active-location-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!activeLocationMarkerRef.current) {
      activeLocationMarkerRef.current = L.marker(latlng, { icon }).addTo(map);
    } else {
      activeLocationMarkerRef.current.setLatLng(latlng);
    }
  }, [activeLocation]);

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
          background: #D8E2F0 !important;
          z-index: 0 !important;
          isolation: isolate;
        }
        .leaflet-tile {
          filter: saturate(1.1) contrast(0.94) brightness(1.02) hue-rotate(-5deg);
        }
        .active-location-icon {
          background: none !important;
          border: none !important;
        }
        .active-location-pin {
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .active-location-pulse {
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: rgba(26, 115, 232, 0.25);
          animation: active-location-ping 1.9s ease-out infinite;
        }
        .active-location-core {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #1a73e8;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        @keyframes active-location-ping {
          0% { transform: scale(0.7); opacity: 0.7; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .pin-drunk-sway {
          animation: pin-sway 8s cubic-bezier(0.45, 0, 0.55, 1) infinite;
          transform-origin: bottom center;
        }
        .pin-drunk-sway:nth-child(odd) {
          animation-delay: -3s;
        }
        @keyframes pin-sway {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          14% { transform: translate(-50%, -50%) rotate(-2.5deg) translateX(-2px); }
          32% { transform: translate(-50%, -50%) rotate(3deg) translateX(2.5px); }
          50% { transform: translate(-50%, -50%) rotate(-1.5deg) translateX(-1px); }
          68% { transform: translate(-50%, -50%) rotate(2deg) translateX(1.5px); }
          85% { transform: translate(-50%, -50%) rotate(-1deg) translateX(-0.5px); }
          100% { transform: translate(-50%, -50%) rotate(0deg); }
        }
      `}</style>
    </>
  );
}
