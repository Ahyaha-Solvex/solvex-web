'use client';

import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Maximize2 } from 'lucide-react';
import type { Incident, Ambulance } from '@/lib/data/types';

export interface MiniMapProps {
  incident?: Incident | null;
  ambulances?: Ambulance[];
  isPip?: boolean;
  onToggleSwap?: () => void;
  className?: string;
}

// Generate a GeoJSON Polygon circle of radius in meters
function createGeoJsonCircle(centerLat: number, centerLng: number, radiusMeters: number, points = 48) {
  const coords: [number, number][] = [];
  const km = radiusMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

export function MiniMap({
  incident,
  ambulances = [],
  isPip = true,
  onToggleSwap,
  className = '',
}: MiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const centerLng = incident?.position.lng ?? 3.9056;
  const centerLat = incident?.position.lat ?? 36.3749;

  // Base map style (prefer light positron / demotiles or custom env)
  const mapStyle =
    process.env.NEXT_PUBLIC_MAP_STYLE ||
    'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let mapInstance: maplibregl.Map;

    try {
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: [centerLng, centerLat],
        zoom: isPip ? 13 : 14.5,
        attributionControl: isPip ? false : undefined,
        interactive: !isPip, // Full map is interactive, PiP allows click to swap
      });

      if (!isPip) {
        mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      }

      mapRef.current = mapInstance;
    } catch (err) {
      console.warn('MapLibre GL initialization error, falling back to raster OSM:', err);
      // Fallback raster OSM style
      mapInstance = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: [centerLng, centerLat],
        zoom: isPip ? 13 : 14.5,
        interactive: !isPip,
      });
      mapRef.current = mapInstance;
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapInstance.remove();
      mapRef.current = null;
    };
  }, [mapStyle, isPip, centerLng, centerLat]);

  // Update Markers and Layers on Incident change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !incident) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const { lat, lng } = incident.position;

    // 1. Crash Pin Marker with Confidence color (DESIGN line 130)
    const confScore = incident.confidence.score;
    const pinColor =
      confScore >= 90 ? '#D21034' : confScore >= 70 ? '#D9A400' : '#8A9189';

    const pinEl = document.createElement('div');
    pinEl.className = 'relative flex items-center justify-center';
    pinEl.innerHTML = `
      <div style="background-color: ${pinColor}; width: 14px; height: 14px; border-radius: 9999px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
      ${
        confScore >= 90
          ? `<div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; border: 2px solid ${pinColor}; opacity: 0.75; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
          : ''
      }
    `;

    const crashMarker = new maplibregl.Marker({ element: pinEl })
      .setLngLat([lng, lat])
      .addTo(map);
    markersRef.current.push(crashMarker);

    // 2. Assigned Ambulance Marker
    const assignedAmbulance = ambulances.find(
      (a) => a.id === incident.dispatch.ambulanceId
    );
    if (assignedAmbulance) {
      const ambEl = document.createElement('div');
      ambEl.className =
        'flex items-center justify-center w-6 h-6 rounded-full bg-[#006233] text-white shadow-lg border-2 border-white text-[10px] font-bold';
      ambEl.innerHTML = '🚑';

      const ambMarker = new maplibregl.Marker({ element: ambEl })
        .setLngLat([assignedAmbulance.lng, assignedAmbulance.lat])
        .addTo(map);
      markersRef.current.push(ambMarker);
    }

    // 3. Nearby People Markers
    incident.nearbyPeople?.forEach((p) => {
      const isMedic = p.kind === 'helper_medic';
      const color = isMedic ? '#D21034' : '#006233';

      const personEl = document.createElement('div');
      personEl.innerHTML = `
        <div style="background-color: ${color}; width: 8px; height: 8px; border-radius: 9999px; border: 1.5px solid white;"></div>
      `;

      const personMarker = new maplibregl.Marker({ element: personEl })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      markersRef.current.push(personMarker);
    });

    // 4. Map load listener for 500m circle & route polyline
    const updateLayers = () => {
      if (!map.isStyleLoaded()) return;

      // 500m Safety Perimeter Ring
      const circleData = createGeoJsonCircle(lat, lng, 500);
      if (map.getSource('crash-perimeter')) {
        (map.getSource('crash-perimeter') as maplibregl.GeoJSONSource).setData(
          circleData
        );
      } else {
        map.addSource('crash-perimeter', {
          type: 'geojson',
          data: circleData,
        });
        map.addLayer({
          id: 'crash-perimeter-fill',
          type: 'fill',
          source: 'crash-perimeter',
          paint: {
            'fill-color': '#FF4D5E',
            'fill-opacity': 0.08,
          },
        });
        map.addLayer({
          id: 'crash-perimeter-stroke',
          type: 'line',
          source: 'crash-perimeter',
          paint: {
            'line-color': '#FF4D5E',
            'line-width': 1.5,
            'line-dasharray': [3, 2],
          },
        });
      }

      // Ambulance Route Polyline
      if (incident.dispatch.polyline && incident.dispatch.polyline.length > 1) {
        // MapLibre expects [lng, lat]
        const lineCoords = incident.dispatch.polyline.map(([pLat, pLng]) => [
          pLng,
          pLat,
        ]);
        const routeData = {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: lineCoords,
          },
          properties: {},
        };

        if (map.getSource('ambulance-route')) {
          (map.getSource('ambulance-route') as maplibregl.GeoJSONSource).setData(
            routeData
          );
        } else {
          map.addSource('ambulance-route', {
            type: 'geojson',
            data: routeData,
          });
          map.addLayer({
            id: 'ambulance-route-line',
            type: 'line',
            source: 'ambulance-route',
            paint: {
              'line-color': '#006233', // --brand on light map
              'line-width': 3.5,
              'line-dasharray': [2, 1],
            },
          });
        }
      }

      // Fit bounds to incident and ambulance if present
      if (assignedAmbulance) {
        const bounds = new maplibregl.LngLatBounds()
          .extend([lng, lat])
          .extend([assignedAmbulance.lng, assignedAmbulance.lat]);
        map.fitBounds(bounds, { padding: isPip ? 24 : 60, maxZoom: 15 });
      } else {
        map.flyTo({ center: [lng, lat], zoom: isPip ? 13 : 14.5 });
      }
    };

    if (map.isStyleLoaded()) {
      updateLayers();
    } else {
      map.once('style.load', updateLayers);
    }
  }, [incident, ambulances, isPip]);

  return (
    <div
      onClick={isPip ? onToggleSwap : undefined}
      className={`relative overflow-hidden transition-all duration-300 ${
        isPip
          ? 'w-[240px] h-[160px] rounded-xl border border-white/20 shadow-2xl cursor-pointer hover:border-white/40 group'
          : 'w-full h-full'
      } ${className}`}
    >
      {/* MapLibre DOM Target */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#1B2621]" />

      {/* PiP Overlay Swap / Expand Pill Button */}
      {isPip && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSwap?.();
          }}
          className="absolute top-2 right-2 px-2 py-1 rounded bg-[#0B1310]/80 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1 border border-white/20 opacity-90 group-hover:opacity-100 transition-opacity"
          aria-label="Expand map"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Swap</span>
        </button>
      )}
    </div>
  );
}

export default MiniMap;
