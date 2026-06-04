'use client';

import { useEffect, useRef, useState } from 'react';

export interface MapPickerProps {
  lat?: number;
  lng?: number;
  readonly?: boolean;
  onChange?: (lat: number, lng: number) => void;
  boundary?: object | null;
  hectares?: number;
  typeColor?: string;
  /** Auto-prompt browser geolocation if no lat/lng is set and the user previously granted permission. Default: true. */
  autoLocate?: boolean;
}

export default function MapPicker({ lat, lng, readonly = false, onChange, boundary, hectares, typeColor = '#16a34a', autoLocate = true }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const areaLayerRef = useRef<import('leaflet').Layer | null>(null);
  const autoLocateTried = useRef(false);
  const [locateState, setLocateState] = useState<"idle" | "locating" | "denied" | "unavailable">("idle");

  // Centralised browser-geolocation request. Resolves the marker + map view if
  // we get coords; updates state if denied/unavailable so the button can show
  // the right feedback.
  function locateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateState("unavailable");
      return;
    }
    setLocateState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = Math.round(pos.coords.latitude  * 1e6) / 1e6;
        const nextLng = Math.round(pos.coords.longitude * 1e6) / 1e6;
        onChange?.(nextLat, nextLng);
        if (mapRef.current) mapRef.current.setView([nextLat, nextLng], 13);
        setLocateState("idle");
      },
      (err) => {
        // err.code 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        setLocateState(err.code === 1 ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }

  // Auto-prompt geolocation once if the user already granted permission in a
  // previous session. Avoids the "cold prompt" UX where the form appears and
  // then a browser dialog leaps onto it without user action.
  useEffect(() => {
    if (readonly || !autoLocate || autoLocateTried.current) return;
    if (lat && lng) return;  // already placed
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) return;
    autoLocateTried.current = true;
    navigator.permissions.query({ name: "geolocation" as PermissionName })
      .then(p => { if (p.state === "granted") locateMe(); })
      .catch(() => { /* unsupported — ignore */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readonly, autoLocate]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const initialCenter: [number, number] = lat && lng ? [lat, lng] : [6, 20];
      const initialZoom = lat && lng ? 12 : 4;

      const map = L.map(containerRef.current, { zoomControl: true }).setView(initialCenter, initialZoom);
      mapRef.current = map;

      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });

      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles © Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics',
          maxZoom: 19,
        }
      );

      const ndviOverlay = L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible/{z}/{y}/{x}.png',
        {
          attribution: 'NDVI © NASA GIBS / MODIS Terra 8-day composite',
          opacity: 0.75,
          maxZoom: 7,
        }
      );

      osm.addTo(map);
      L.control.layers(
        { 'Street Map': osm, 'Satellite': satellite },
        { 'NDVI Overlay (NASA MODIS)': ndviOverlay },
        { position: 'topright' }
      ).addTo(map);

      const greenIcon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${typeColor};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      if (lat && lng) {
        const marker = L.marker([lat, lng], { icon: greenIcon, draggable: !readonly }).addTo(map);
        markerRef.current = marker;

        if (!readonly && onChange) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onChange(Math.round(pos.lat * 1e6) / 1e6, Math.round(pos.lng * 1e6) / 1e6);
          });
        }

        // Render area shape (polygon or auto-circle)
        const areaStyle = { color: typeColor, fillOpacity: 0.12, opacity: 0.5, weight: 1.5 };

        if (boundary) {
          try {
            const layer = L.geoJSON(boundary as Parameters<typeof L.geoJSON>[0], { style: areaStyle }).addTo(map);
            areaLayerRef.current = layer;
            const bounds = layer.getBounds();
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
          } catch { /* invalid GeoJSON — ignore */ }
        } else if (hectares && hectares > 0) {
          const radiusM = Math.sqrt((hectares * 10000) / Math.PI);
          const circle = L.circle([lat, lng], {
            radius: radiusM,
            color: typeColor,
            fillOpacity: 0.10,
            opacity: 0.45,
            weight: 1.5,
            dashArray: '6 4',
          }).addTo(map);
          areaLayerRef.current = circle;
          map.fitBounds(circle.getBounds(), { padding: [40, 40], maxZoom: 13 });
        }
      }

      if (!readonly) {
        map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
          const clickedLat = Math.round(e.latlng.lat * 1e6) / 1e6;
          const clickedLng = Math.round(e.latlng.lng * 1e6) / 1e6;

          if (markerRef.current) {
            markerRef.current.setLatLng([clickedLat, clickedLng]);
          } else {
            const marker = L.marker([clickedLat, clickedLng], { icon: greenIcon, draggable: true }).addTo(map);
            markerRef.current = marker;
            marker.on('dragend', () => {
              const pos = marker.getLatLng();
              onChange?.(Math.round(pos.lat * 1e6) / 1e6, Math.round(pos.lng * 1e6) / 1e6);
            });
          }

          onChange?.(clickedLat, clickedLng);
        });
      }
    });

    return () => {
      if (mapRef.current) {
        try {
          (mapRef.current as any)._animatingZoom = false;
          mapRef.current.stop();
          mapRef.current.off();
          mapRef.current.remove();
        } catch { /* ignore HMR teardown races */ }
        mapRef.current = null;
        markerRef.current = null;
        areaLayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when props change (e.g. user types in fields)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !lat || !lng) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], mapRef.current.getZoom());
  }, [lat, lng]);

  return (
    <div className="relative">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div ref={containerRef} style={{ width: '100%', height: '400px', borderRadius: '0.75rem', zIndex: 0 }} />

      {/* Locating shimmer — soft frosted-glass overlay with a pill in the
          centre while the browser geolocation API resolves. Pointer-events:none
          so the user can still pan if they're impatient. */}
      {!readonly && locateState === "locating" && (
        <div className="absolute inset-0 z-[399] pointer-events-none flex items-center justify-center rounded-xl bg-white/30 backdrop-blur-[2px] animate-fade-in">
          <div className="bg-white shadow-lg border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-sm text-gray-800">
            <span className="w-4 h-4 border-2 border-forest-200 border-t-forest-600 rounded-full animate-spin" />
            Finding your location…
          </div>
        </div>
      )}

      {/* Geolocate button — overlaid bottom-left, clear of leaflet's layers
          control (top-right), zoom buttons (top-left) and attribution (bottom-right). */}
      {!readonly && (
        <button
          type="button"
          onClick={locateMe}
          disabled={locateState === "locating"}
          aria-label="Use my current location"
          className="absolute bottom-3 left-3 z-[400] flex items-center gap-1.5 bg-white shadow-md border border-gray-200 hover:border-forest-400 hover:bg-forest-50 disabled:opacity-60 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2"  x2="12" y2="5"  />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2"  y1="12" x2="5"  y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
          {locateState === "locating" ? "Locating…" : "Use my location"}
        </button>
      )}

      {!readonly && (
        <p className="mt-1.5 text-xs text-gray-500">
          {locateState === "denied"
            ? "Location permission denied. Click on the map to place a marker, or type coordinates below."
            : locateState === "unavailable"
              ? "We couldn't read your location. Click on the map to place a marker, or type coordinates below."
              : "Click \"Use my location\" to auto-place a marker, or click anywhere on the map. Drag to reposition."}
        </p>
      )}
    </div>
  );
}
