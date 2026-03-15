import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface OpeningHour {
  day: string;
  hours: string;
}

interface Review {
  author?: string;
  authorPhoto?: string;
  rating?: number;
  text?: string;
  time?: string;
}

interface Restaurant {
  id: number;
  name: string;
  lat: string | null;
  lng: string | null;
  imageUrl?: string | null;
  photos?: string[] | null;
  category?: string | null;
  description?: string | null;
  rating?: string | null;
  priceLevel?: number | null;
  address?: string | null;
  phone?: string | null;
  openingHours?: OpeningHour[] | null;
  reviews?: Review[] | null;
  reviewCount?: number | null;
  vibes?: string[] | null;
  district?: string | null;
  isNew?: boolean | null;
  googlePlaceId?: string | null;
  website?: string | null;
  plusCode?: string | null;
  editorialSummary?: string | null;
  serviceOptions?: {
    dineIn?: boolean;
    takeout?: boolean;
    delivery?: boolean;
    curbsidePickup?: boolean;
    reservable?: boolean;
  } | null;
  amenities?: {
    hasOutdoorSeating?: boolean;
    hasWifi?: boolean;
    allowsDogs?: boolean;
    liveMusic?: boolean;
    goodForChildren?: boolean;
    goodForGroups?: boolean;
    goodForWatchingSports?: boolean;
    menuForChildren?: boolean;
    servesBeer?: boolean;
    servesWine?: boolean;
    servesCocktails?: boolean;
    servesCoffee?: boolean;
    servesBreakfast?: boolean;
    servesLunch?: boolean;
    servesDinner?: boolean;
    servesBrunch?: boolean;
    servesVegetarianFood?: boolean;
  } | null;
  paymentOptions?: {
    acceptsCreditCards?: boolean;
    acceptsCashOnly?: boolean;
    acceptsNfc?: boolean;
    acceptsDebitCards?: boolean;
  } | null;
}

interface GoogleImportResult {
  fetched: number;
  processed: number;
  saved: number;
  failed: number;
}

type ImportResult = { source: "google"; data: GoogleImportResult };

export interface GoogleImportParams {
  lat: number; lng: number; radius: number;
  keyword: string; locationFilter: string;
  maxResults: number; includeDetails: boolean; smallFetch: boolean;
}

interface FixImagesResult {
  done: number;
  failed: number;
  totalCost: number;
}

interface AdminImportMapProps {
  restaurants: Restaurant[];
  onGoogleImport: (p: GoogleImportParams) => void;
  onFixImages: () => void;
  onEdit: (restaurant: Restaurant) => void;
  fixingImages: boolean;
  fixImagesResult?: FixImagesResult | null;
  importing: boolean;
  importResult?: ImportResult | null;
}

const DEFAULT_LAT = 13.7563;
const DEFAULT_LNG = 100.5018;

export function AdminImportMap({
  restaurants,
  onGoogleImport,
  onFixImages,
  onEdit,
  fixingImages,
  fixImagesResult,
  importing,
  importResult,
}: AdminImportMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const importPinRef = useRef<L.Marker | null>(null);
  const importCircleRef = useRef<L.Circle | null>(null);
  const importPanelRef = useRef<HTMLDivElement>(null);

  // ── Debug: log z-index / stacking context info after mount ──────────────
  useEffect(() => {
    if (!mapRef.current || !importPanelRef.current) return;

    function stackingContextCreators(el: Element): string[] {
      const s = getComputedStyle(el);
      const reasons: string[] = [];
      if (s.transform !== "none") reasons.push(`transform:${s.transform.slice(0, 30)}`);
      if (s.opacity !== "1") reasons.push(`opacity:${s.opacity}`);
      if (s.filter !== "none") reasons.push(`filter:${s.filter}`);
      if (s.isolation === "isolate") reasons.push("isolation:isolate");
      if (s.willChange !== "auto") reasons.push(`will-change:${s.willChange}`);
      if (s.position !== "static" && s.zIndex !== "auto") reasons.push(`position:${s.position}+z-index:${s.zIndex}`);
      return reasons;
    }

    function walkParents(el: Element | null, label: string) {
      const chain: string[] = [];
      let cur = el;
      while (cur && cur !== document.body) {
        const s = getComputedStyle(cur);
        const creators = stackingContextCreators(cur);
        if (creators.length > 0 || s.zIndex !== "auto") {
          chain.push(`<${cur.tagName.toLowerCase()} class="${cur.className.toString().slice(0, 40)}" z=${s.zIndex} [${creators.join(", ")}]>`);
        }
        cur = cur.parentElement;
      }
      console.group(`[map-debug] Stacking context chain for ${label}`);
      chain.forEach((c) => console.log(c));
      console.groupEnd();
    }

    const mapCS = getComputedStyle(mapRef.current);
    const panelCS = getComputedStyle(importPanelRef.current);
    console.group("[map-debug] z-index snapshot");
    console.log("mapRef z-index:", mapCS.zIndex, "| position:", mapCS.position);
    console.log("importPanel z-index:", panelCS.zIndex, "| position:", panelCS.position);

    // Log Leaflet's own panes
    ["leaflet-tile-pane", "leaflet-overlay-pane", "leaflet-marker-pane", "leaflet-popup-pane", "leaflet-map-pane"].forEach((cls) => {
      const el = mapRef.current!.querySelector(`.${cls}`) as HTMLElement | null;
      if (el) console.log(`  .${cls} z-index:`, getComputedStyle(el).zIndex);
    });
    console.groupEnd();

    walkParents(importPanelRef.current, "import panel");
    walkParents(mapRef.current, "mapRef");
  }, []);

  // Pin state
  const [pinLat, setPinLat] = useState(DEFAULT_LAT);
  const [pinLng, setPinLng] = useState(DEFAULT_LNG);
  const [radius, setRadius] = useState(2000);
  const [pinPlaced, setPinPlaced] = useState(false);

  const [keyword, setKeyword] = useState("restaurant");
  const [locationFilter, setLocationFilter] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [smallFetch, setSmallFetch] = useState(false);

  // Selected restaurant detail panel
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Callback ref so markers can call setSelected without stale closure
  const setSelectedRef = useRef(setSelected);
  useEffect(() => { setSelectedRef.current = setSelected; }, []);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    markersLayerRef.current = layer;

    map.on("click", (e: L.LeafletMouseEvent) => {
      setPinLat(parseFloat(e.latlng.lat.toFixed(6)));
      setPinLng(parseFloat(e.latlng.lng.toFixed(6)));
      setPinPlaced(true);
      setSelectedRef.current(null);
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update import pin + radius circle
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    importPinRef.current?.remove();
    importCircleRef.current?.remove();

    if (!pinPlaced) return;

    const pinColor = "#3b82f6";

    const pinIcon = L.divIcon({
      html: `
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:18px;height:18px;background:${pinColor};border:3px solid white;border-radius:50%;
            box-shadow:0 2px 10px ${pinColor}88"></div>
          <div style="width:2px;height:10px;background:${pinColor};margin-top:-1px"></div>
        </div>`,
      className: "",
      iconSize: [18, 30],
      iconAnchor: [9, 30],
    });

    const pin = L.marker([pinLat, pinLng], { icon: pinIcon, draggable: true, zIndexOffset: 1000 }).addTo(map);
    pin.on("dragend", (e: L.DragEndEvent) => {
      const ll = (e.target as L.Marker).getLatLng();
      setPinLat(parseFloat(ll.lat.toFixed(6)));
      setPinLng(parseFloat(ll.lng.toFixed(6)));
    });
    importPinRef.current = pin;

    importCircleRef.current = L.circle([pinLat, pinLng], {
      radius,
      color: pinColor,
      fillColor: pinColor,
      fillOpacity: 0.07,
      weight: 2,
      dashArray: "6 5",
    }).addTo(map);
  }, [pinLat, pinLng, radius, pinPlaced]);

  // Render restaurant markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    for (const r of restaurants) {
      const lat = parseFloat(r.lat ?? "");
      const lng = parseFloat(r.lng ?? "");
      if (!isFinite(lat) || !isFinite(lng)) continue;

      let html: string;
      let size: [number, number];
      let anchor: [number, number];

      if (r.imageUrl) {
        html = `
          <div style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:2.5px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.22);background:#f3f4f6;cursor:pointer;transition:transform .15s">
            <img src="${escapeHtml(r.imageUrl)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"
              onerror="this.style.display='none';this.parentElement.innerHTML='<div style=width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px>🍽️</div>'" />
          </div>`;
        size = [38, 38];
        anchor = [19, 19];
      } else {
        const short = r.name.length > 15 ? r.name.slice(0, 15) + "…" : r.name;
        html = `<div style="background:white;padding:3px 8px;border-radius:14px;font-size:10px;font-weight:600;
          color:#111827;box-shadow:0 2px 8px rgba(0,0,0,0.12);white-space:nowrap;cursor:pointer;
          font-family:system-ui,sans-serif;max-width:130px;overflow:hidden;text-overflow:ellipsis">
          ${escapeHtml(short)}</div>`;
        size = [130, 22];
        anchor = [65, 11];
      }

      const icon = L.divIcon({ html, className: "", iconSize: size, iconAnchor: anchor });
      const marker = L.marker([lat, lng], { icon }).addTo(layer);
      // Capture r in closure
      const captured = r;
      marker.on("click", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        setSelectedRef.current(captured);
      });
    }
  }, [restaurants]);

  // Reset photo index when selected changes
  useEffect(() => { setPhotoIndex(0); }, [selected]);

  function handleImport() {
    onGoogleImport({ lat: pinLat, lng: pinLng, radius, keyword, locationFilter, maxResults, includeDetails, smallFetch });
  }

  const validCount = restaurants.filter(
    (r) => isFinite(parseFloat(r.lat ?? "")) && isFinite(parseFloat(r.lng ?? "")),
  ).length;

  const inp = "w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300 mt-0.5";

  // Build photo list for selected restaurant
  const allPhotos: string[] = selected
    ? [
        ...(selected.imageUrl ? [selected.imageUrl] : []),
        ...(selected.photos ?? []).filter((p) => p !== selected.imageUrl),
      ]
    : [];

  return (
    <div
      className="relative w-full"
      style={{ height: "calc(100vh - 200px)", minHeight: 520 }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* z-[0] creates a stacking context boundary — all Leaflet z-indices (400–1000) stay
          inside this element. Our overlay panels at z-[9999] are guaranteed above it. */}
      <div ref={mapRef} className="absolute inset-0 rounded-xl overflow-hidden" style={{ zIndex: 0 }} />

      {/* ── Detail panel (Google Maps style) ── */}
      {selected && (
        <div
          className="absolute top-3 left-3 bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 flex flex-col overflow-hidden"
          style={{ maxHeight: "calc(100vh - 240px)", zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo area */}
          <div className="relative w-full bg-gray-100 flex-shrink-0" style={{ height: 180 }}>
            {allPhotos.length > 0 ? (
              <>
                <img
                  key={allPhotos[photoIndex]}
                  src={allPhotos[photoIndex]}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                />
                {allPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIndex((i) => (i - 1 + allPhotos.length) % allPhotos.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 text-sm"
                    >‹</button>
                    <button
                      onClick={() => setPhotoIndex((i) => (i + 1) % allPhotos.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 text-sm"
                    >›</button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {allPhotos.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === photoIndex ? "bg-white" : "bg-white/50"}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">🍽️</div>
            )}
            {/* Close button */}
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 text-base leading-none"
            >×</button>
            {/* Edit button */}
            <button
              onClick={() => { onEdit(selected); setSelected(null); }}
              className="absolute top-2 right-11 flex items-center gap-1 bg-white/90 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow hover:bg-white transition-colors"
            >✏️ Edit</button>
            {selected.isNew && (
              <span className="absolute top-2 left-2 bg-amber-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>
            )}
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {/* Name + rating */}
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">{selected.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {selected.rating && (
                  <div className="flex items-center gap-1">
                    <StarRating value={parseFloat(selected.rating)} />
                    <span className="text-xs font-semibold text-gray-700">{selected.rating}</span>
                    {selected.reviewCount ? (
                      <span className="text-[11px] text-gray-400">({selected.reviewCount})</span>
                    ) : null}
                  </div>
                )}
                {selected.priceLevel ? (
                  <span className="text-xs font-semibold text-gray-500">{"฿".repeat(selected.priceLevel)}</span>
                ) : null}
                {selected.category && (
                  <span className="text-[11px] bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-2 py-0.5 font-medium">
                    {selected.category}
                  </span>
                )}
              </div>
            </div>

            {/* Vibes */}
            {selected.vibes && selected.vibes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.vibes.map((v) => (
                  <span key={v} className="text-[10px] bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-full px-2 py-0.5">{v}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {selected.description && (
              <p className="text-xs text-gray-600 leading-relaxed">{selected.description}</p>
            )}

            {/* Info rows */}
            <div className="space-y-2 pt-1 border-t border-gray-50">
              {selected.address && (
                <InfoRow icon="📍" text={selected.address} />
              )}
              {selected.district && (
                <InfoRow icon="🏙️" text={selected.district} />
              )}
              {selected.phone && (
                <InfoRow icon="📞" text={selected.phone} href={`tel:${selected.phone}`} />
              )}
              {selected.googlePlaceId && (
                <InfoRow icon="🗺️" text="View on Google Maps"
                  href={`https://www.google.com/maps/place/?q=place_id:${selected.googlePlaceId}`} external />
              )}
              {selected.website && (
                <InfoRow icon="🌐" text={new URL(selected.website).hostname} href={selected.website} external />
              )}
              {selected.plusCode && (
                <InfoRow icon="📌" text={selected.plusCode} />
              )}
            </div>
            {selected.editorialSummary && (
              <p className="text-xs text-gray-600 italic leading-relaxed border-l-2 border-orange-200 pl-2">{selected.editorialSummary}</p>
            )}

            {/* Opening hours */}
            {selected.openingHours && selected.openingHours.length > 0 && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">Hours</p>
                <div className="space-y-0.5">
                  {selected.openingHours.map((h, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-500 w-24 flex-shrink-0">{h.day}</span>
                      <span className="text-gray-800 font-medium">{h.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service options */}
            {selected.serviceOptions && Object.values(selected.serviceOptions).some(Boolean) && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Service options</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.serviceOptions.dineIn && <Chip label="Dine-in" />}
                  {selected.serviceOptions.takeout && <Chip label="Takeaway" />}
                  {selected.serviceOptions.delivery && <Chip label="Delivery" />}
                  {selected.serviceOptions.curbsidePickup && <Chip label="Kerbside pickup" />}
                  {selected.serviceOptions.reservable && <Chip label="Reservable" />}
                </div>
              </div>
            )}

            {/* Amenities */}
            {selected.amenities && (
              <AmenitiesSection amenities={selected.amenities} />
            )}

            {/* Payment options */}
            {selected.paymentOptions && Object.values(selected.paymentOptions).some(Boolean) && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Payments</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.paymentOptions.acceptsCreditCards && <Chip label="Credit cards" />}
                  {selected.paymentOptions.acceptsDebitCards && <Chip label="Debit cards" />}
                  {selected.paymentOptions.acceptsNfc && <Chip label="NFC payments" />}
                  {selected.paymentOptions.acceptsCashOnly && <Chip label="Cash only" />}
                </div>
              </div>
            )}

            {/* Reviews */}
            {selected.reviews && selected.reviews.length > 0 && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Reviews</p>
                <div className="space-y-2.5">
                  {selected.reviews.slice(0, 5).map((rev, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        {rev.authorPhoto ? (
                          <img src={rev.authorPhoto} alt={rev.author} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-[10px] text-gray-500">
                            {(rev.author ?? "G")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 truncate">{rev.author ?? "Guest"}</span>
                            {rev.rating != null && <StarRating value={rev.rating} small />}
                          </div>
                          {rev.time && <p className="text-[10px] text-gray-400">{rev.time}</p>}
                        </div>
                      </div>
                      {rev.text && <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-4">{rev.text}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import panel */}
      <div ref={importPanelRef} className="absolute top-3 right-3 bg-white rounded-2xl shadow-xl border border-gray-100 w-72"
        style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto", zIndex: 9999 }}>
        <div className="p-4 space-y-3">

          {/* Pin hint */}
          <p className="text-[11px] text-gray-400">
            {pinPlaced ? "Drag pin or click map to reposition" : "Click anywhere on the map to place a pin"}
          </p>

          {/* Lat / Lng */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Lat</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono mt-0.5 focus:outline-none focus:ring-1 focus:ring-orange-300"
                value={pinLat}
                onChange={(e) => { const v = parseFloat(e.target.value); if (isFinite(v)) { setPinLat(v); setPinPlaced(true); } }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Lng</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono mt-0.5 focus:outline-none focus:ring-1 focus:ring-orange-300"
                value={pinLng}
                onChange={(e) => { const v = parseFloat(e.target.value); if (isFinite(v)) { setPinLng(v); setPinPlaced(true); } }}
              />
            </div>
          </div>

          {/* Radius slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Radius</label>
              <span className="text-xs font-bold text-blue-500">
                {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
              </span>
            </div>
            <input
              type="range" min="200" max="10000" step="100" value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
              <span>200 m</span><span>10 km</span>
            </div>
          </div>

          {/* Google options */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Keyword</label>
              <input className={inp} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="restaurant" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Location filter <span className="normal-case">(address contains)</span></label>
              <input className={inp} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="e.g. Sukhumvit" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-gray-400">Max results</label>
              <input
                type="number" min="1" max="100" className={inp}
                value={maxResults} onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
              />
            </div>
            <div className="flex flex-col gap-1.5 pt-0.5">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input type="checkbox" checked={includeDetails} onChange={(e) => setIncludeDetails(e.target.checked)} className="accent-blue-500" />
                <span className="text-gray-600">Include details (phone, hours, reviews)</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input type="checkbox" checked={smallFetch} onChange={(e) => setSmallFetch(e.target.checked)} className="accent-blue-500" />
                <span className="text-gray-600">Small fetch test mode (max 5)</span>
              </label>
            </div>
          </div>

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={importing || !pinPlaced}
            className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-xl transition-colors bg-blue-500 hover:bg-blue-600"
          >
            {importing ? "Importing…" : "Import from Google Places"}
          </button>

          {/* Result */}
          {importResult && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs space-y-0.5">
              <p className="font-semibold text-green-700">Google import complete</p>
              <p className="text-green-600">Processed {importResult.data.processed} · Saved {importResult.data.saved} · Failed {importResult.data.failed}</p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fix Missing Images</p>
            {(() => {
              const missing = restaurants.filter((r) => !r.imageUrl || r.imageUrl === "").length;
              return (
                <p className="text-[11px] text-gray-400 mb-2">
                  {missing > 0
                    ? <><span className="text-orange-500 font-semibold">{missing}</span> restaurants missing images</>
                    : <span className="text-green-500">All restaurants have images ✓</span>
                  }
                </p>
              );
            })()}
            <button
              onClick={onFixImages}
              disabled={fixingImages || restaurants.filter((r) => !r.imageUrl || r.imageUrl === "").length === 0}
              className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-xl transition-colors bg-orange-500 hover:bg-orange-600"
            >
              {fixingImages ? "Fixing…" : "Fix Images (one by one)"}
            </button>
            {fixImagesResult && (
              <div className="mt-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs space-y-0.5">
                <p className="font-semibold text-green-700">Done</p>
                <p className="text-green-600">Fixed {fixImagesResult.done} · Failed {fixImagesResult.failed}</p>
                <p className="text-green-500">Est. cost: ${fixImagesResult.totalCost.toFixed(3)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restaurant count — bottom left */}
      <div className="absolute bottom-5 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 shadow border border-gray-100" style={{ zIndex: 9999 }}>
        {validCount} restaurants on map
        {selected && <span className="ml-2 text-orange-500">· {selected.name}</span>}
      </div>

      <style>{`
        .leaflet-container { background: #E8E5E0 !important; }
        .leaflet-tile { filter: saturate(0.8) brightness(1.03); }
        .leaflet-control-zoom {
          border-radius: 12px !important;
          overflow: hidden;
          border: none !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12) !important;
        }
        .leaflet-control-zoom a { color: #374151 !important; font-weight: 600 !important; }
        /* Keep Leaflet's own controls below our panels during zoom animations */
        .leaflet-top, .leaflet-bottom { z-index: 800 !important; }
        .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function StarRating({ value, small }: { value: number; small?: boolean }) {
  const size = small ? "text-[10px]" : "text-xs";
  return (
    <span className={`${size} text-amber-400 tracking-tight`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n - 0.25;
        const half = !filled && value >= n - 0.75;
        return (
          <span key={n}>{filled ? "★" : half ? "⯨" : "☆"}</span>
        );
      })}
    </span>
  );
}

function InfoRow({ icon, text, href, external }: { icon: string; text: string; href?: string; external?: boolean }) {
  const content = (
    <span className="text-xs text-gray-700 leading-snug">{text}</span>
  );
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm mt-0.5 flex-shrink-0">{icon}</span>
      {href ? (
        <a href={href} target={external ? "_blank" : undefined} rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline leading-snug">
          {text}
        </a>
      ) : content}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 border border-gray-200">{label}</span>
  );
}

const AMENITY_LABELS: Record<string, string> = {
  hasOutdoorSeating: "Outdoor seating",
  hasWifi: "Wi-Fi",
  allowsDogs: "Dogs allowed",
  liveMusic: "Live music",
  goodForChildren: "Good for kids",
  goodForGroups: "Good for groups",
  goodForWatchingSports: "Sports viewing",
  menuForChildren: "Kids menu",
  servesBeer: "Beer",
  servesWine: "Wine",
  servesCocktails: "Cocktails",
  servesCoffee: "Coffee",
  servesBreakfast: "Breakfast",
  servesLunch: "Lunch",
  servesDinner: "Dinner",
  servesBrunch: "Brunch",
  servesVegetarianFood: "Vegetarian",
};

type AmenitiesType = {
  hasOutdoorSeating?: boolean;
  hasWifi?: boolean;
  allowsDogs?: boolean;
  liveMusic?: boolean;
  goodForChildren?: boolean;
  goodForGroups?: boolean;
  goodForWatchingSports?: boolean;
  menuForChildren?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  servesCocktails?: boolean;
  servesCoffee?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBrunch?: boolean;
  servesVegetarianFood?: boolean;
};

function AmenitiesSection({ amenities }: { amenities: AmenitiesType }) {
  const trueKeys = Object.entries(amenities)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  if (trueKeys.length === 0) return null;
  return (
    <div className="pt-2 border-t border-gray-50">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Amenities</p>
      <div className="flex flex-wrap gap-1.5">
        {trueKeys.map((k) => (
          <Chip key={k} label={AMENITY_LABELS[k] ?? k} />
        ))}
      </div>
    </div>
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
