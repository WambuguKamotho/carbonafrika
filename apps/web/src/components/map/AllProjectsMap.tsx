'use client';

import { useEffect, useRef, useState } from 'react';

interface Project {
  id: string;
  title: string;
  projectType: string;
  landType: string | null;
  energyType: string | null;
  hectares: number;
  capacityKw: number | null;
  country: string;
  region?: string | null;
  lat: number;
  lng: number;
  status: string;
  boundary?: object | null;
  owner: { name: string };
}

const LAND_TYPE_COLORS: Record<string, string> = {
  FOREST:    '#16a34a',
  SAVANNA:   '#d97706',
  GRASSLAND: '#65a30d',
  FARMLAND:  '#ea580c',
  WETLAND:   '#2563eb',
  MANGROVE:  '#0d9488',
};

const ENERGY_TYPE_COLORS: Record<string, string> = {
  SOLAR_PV:    '#f59e0b',
  BIOGAS:      '#f97316',
  BIOCHARCOAL: '#57534e',
  COOKSTOVES:  '#a16207',
  MICRO_HYDRO: '#0284c7',
  WIND:        '#7c3aed',
};

const LAND_TYPE_LABELS:   Record<string, string> = { FOREST: 'Forest', SAVANNA: 'Savanna', GRASSLAND: 'Grassland', FARMLAND: 'Farmland', WETLAND: 'Wetland', MANGROVE: 'Mangrove' };
const ENERGY_TYPE_LABELS: Record<string, string> = { SOLAR_PV: 'Solar PV', BIOGAS: 'Biogas', BIOCHARCOAL: 'Biocharcoal', COOKSTOVES: 'Cookstoves', MICRO_HYDRO: 'Micro-Hydro', WIND: 'Wind' };
const ENERGY_TYPE_EMOJIS: Record<string, string> = { SOLAR_PV: '☀️', BIOGAS: '🔥', BIOCHARCOAL: '⚫', COOKSTOVES: '🍳', MICRO_HYDRO: '💧', WIND: '💨' };

const HEATMAP_ZOOM_THRESHOLD = 5;

function markerHtml(color: string, isEnergy: boolean) {
  if (isEnergy) {
    return `<div style="width:22px;height:22px;border-radius:6px;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer">
      <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 1L1 7h4l-1 4 5-6H5l1-4z" fill="white" stroke="white" stroke-width="0.5" stroke-linejoin="round"/>
      </svg>
    </div>`;
  }
  return `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:pointer"></div>`;
}

export default function AllProjectsMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<import('leaflet').Map | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/projects?status=ACTIVE&pageSize=200').then(r => r.json()),
      fetch('/api/projects?status=VERIFIED&pageSize=200').then(r => r.json()),
    ])
      .then(([a, v]) => {
        const all: Project[] = [...(a.data?.items ?? []), ...(v.data?.items ?? [])];
        setProjects(Array.from(new Map(all.map(p => [p.id, p])).values()));
      })
      .catch(e => console.error('Failed to fetch projects:', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current).setView([6, 20], 4);
      mapRef.current = map;

      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri — Source: Esri, Maxar, GeoEye', maxZoom: 19 }
      );
      const ndviOverlay = L.tileLayer(
        'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible/{z}/{y}/{x}.png',
        { attribution: 'NDVI © NASA GIBS / MODIS Terra 8-day composite', opacity: 0.75, maxZoom: 7 }
      );

      osm.addTo(map);
      L.control.layers(
        { 'Street Map': osm, 'Satellite': satellite },
        { 'NDVI Overlay (NASA MODIS)': ndviOverlay },
        { position: 'topright' }
      ).addTo(map);

      // Two layer groups: heat dots (zoomed out) vs. full detail markers (zoomed in)
      const heatGroup   = L.layerGroup();
      const markerGroup = L.layerGroup();
      const areaGroup   = L.layerGroup(); // always visible when zoomed in

      const bounds: [number, number][] = [];

      projects.forEach((project) => {
        const isEnergy = !!project.energyType;
        const color = isEnergy
          ? (ENERGY_TYPE_COLORS[project.energyType!] ?? '#f59e0b')
          : (LAND_TYPE_COLORS[project.landType!]     ?? '#6b7280');
        const typeLabel = isEnergy
          ? (ENERGY_TYPE_LABELS[project.energyType!]  ?? project.energyType ?? '')
          : (LAND_TYPE_LABELS[project.landType!]       ?? project.landType   ?? '');
        const emoji = isEnergy ? (ENERGY_TYPE_EMOJIS[project.energyType!] ?? '⚡') : '';

        const sizeLabel = isEnergy && project.capacityKw
          ? `${project.capacityKw} kW`
          : `${project.hectares.toLocaleString()} ha`;

        const popupHtml = `
          <div style="min-width:210px;font-family:Inter,sans-serif">
            <div style="font-weight:700;font-size:14px;color:#111;margin-bottom:4px">${project.title}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
              <span style="background:${color}22;color:${color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px">${emoji} ${typeLabel}</span>
              <span style="color:#6b7280;font-size:12px">${sizeLabel}</span>
            </div>
            ${isEnergy ? `<div style="font-size:11px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;display:inline-block;margin-bottom:8px;font-weight:600">⚡ Clean Energy</div>` : ''}
            <div style="color:#6b7280;font-size:12px;margin-bottom:4px">📍 ${project.country}${project.region ? ', ' + project.region : ''}</div>
            <div style="color:#6b7280;font-size:12px;margin-bottom:10px">by ${project.owner?.name ?? 'Unknown'}</div>
            <a href="/projects/${project.id}" style="display:inline-block;background:${isEnergy ? '#f59e0b' : '#16a34a'};color:white;font-size:12px;font-weight:600;padding:5px 12px;border-radius:8px;text-decoration:none">View Project →</a>
          </div>
        `;

        // Heat dot (zoomed out): simple circle marker
        const heatDot = L.circleMarker([project.lat, project.lng], {
          radius:      isEnergy ? 8 : 7,
          fillColor:   color,
          fillOpacity: 0.72,
          color:       'white',
          weight:      1.5,
        });
        heatDot.bindPopup(popupHtml, { maxWidth: 280 });
        heatGroup.addLayer(heatDot);

        // Detail marker (zoomed in): custom HTML icon
        const icon = L.divIcon({
          className: '',
          html: markerHtml(color, isEnergy),
          iconSize:   isEnergy ? [22, 22] : [16, 16],
          iconAnchor: isEnergy ? [11, 11] : [8, 8],
        });
        const marker = L.marker([project.lat, project.lng], { icon });
        marker.bindPopup(popupHtml, { maxWidth: 280 });
        markerGroup.addLayer(marker);

        bounds.push([project.lat, project.lng]);

        // Area shape for land restoration — only shown with detail markers
        if (!isEnergy && project.hectares > 0) {
          const areaStyle = { color, fillOpacity: 0.08, opacity: 0.35, weight: 1 };
          if (project.boundary) {
            try {
              areaGroup.addLayer(
                L.geoJSON(project.boundary as Parameters<typeof L.geoJSON>[0], { style: areaStyle })
              );
            } catch { /* skip invalid boundary */ }
          } else {
            const radiusM = Math.sqrt((project.hectares * 10000) / Math.PI);
            areaGroup.addLayer(
              L.circle([project.lat, project.lng], { radius: radiusM, ...areaStyle, dashArray: '5 4' })
            );
          }
        }
      });

      function updateLayers() {
        const zoom = map.getZoom();
        if (zoom < HEATMAP_ZOOM_THRESHOLD) {
          if (map.hasLayer(markerGroup)) map.removeLayer(markerGroup);
          if (map.hasLayer(areaGroup))   map.removeLayer(areaGroup);
          if (!map.hasLayer(heatGroup))  heatGroup.addTo(map);
        } else {
          if (map.hasLayer(heatGroup))    map.removeLayer(heatGroup);
          if (!map.hasLayer(markerGroup)) markerGroup.addTo(map);
          if (!map.hasLayer(areaGroup))   areaGroup.addTo(map);
        }
      }

      map.on('zoomend', updateLayers);
      updateLayers(); // apply immediately at initial zoom

      if (bounds.length > 1) {
        map.fitBounds(bounds as [number, number][], { padding: [40, 40], maxZoom: 10 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 8);
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
      }
    };
  }, [loading, projects]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '500px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
            Loading projects…
          </div>
        )}
      </div>
    </>
  );
}
