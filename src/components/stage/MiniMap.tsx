'use client';

import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Maximize2 } from 'lucide-react';
import type { Incident, Ambulance } from '@/lib/data/types';

if (typeof window !== 'undefined') {
  maplibregl.config.WORKER_URL = '/maplibre-gl-worker.mjs';
}

export interface MiniMapProps {
  incident?: Incident | null;
  ambulances?: Ambulance[];
  isPip?: boolean;
  trackAmbulance?: boolean;
  onDisableTracking?: () => void;
  onToggleSwap?: () => void;
  className?: string;
}

interface ManagedMarker {
  marker: maplibregl.Marker;
  el: HTMLDivElement;
  sig?: string;
}

const EMPTY_LINE_COLLECTION = {
  type: 'Feature' as const,
  geometry: {
    type: 'LineString' as const,
    coordinates: [] as [number, number][],
  },
  properties: {},
};

const EMPTY_POLYGON_COLLECTION = {
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[]] as [number, number][][],
  },
  properties: {},
};

// Generate a GeoJSON Polygon circle of radius in meters
function createGeoJsonCircle(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  points = 48
) {
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

function ensureSourcesAndLayers(map: maplibregl.Map) {
  if (!map.getSource('crash-perimeter')) {
    map.addSource('crash-perimeter', {
      type: 'geojson',
      data: EMPTY_POLYGON_COLLECTION,
    });
    map.addLayer({
      id: 'crash-perimeter-fill',
      type: 'fill',
      source: 'crash-perimeter',
      paint: {
        'fill-color': '#D21034',
        'fill-opacity': 0.08,
      },
    });
    map.addLayer({
      id: 'crash-perimeter-stroke',
      type: 'line',
      source: 'crash-perimeter',
      paint: {
        'line-color': '#D21034',
        'line-width': 1.5,
        'line-dasharray': [3, 2],
      },
    });
  }

  if (!map.getSource('ambulance-route')) {
    map.addSource('ambulance-route', {
      type: 'geojson',
      data: EMPTY_LINE_COLLECTION,
    });
    map.addLayer({
      id: 'ambulance-route-casing',
      type: 'line',
      source: 'ambulance-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#FFFFFF',
        'line-width': 6,
        'line-opacity': 0.85,
      },
    });
    map.addLayer({
      id: 'ambulance-route-line',
      type: 'line',
      source: 'ambulance-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#006233',
        'line-width': 3.5,
        'line-dasharray': [2, 1.2],
      },
    });
  }

  if (!map.getSource('hospital-route')) {
    map.addSource('hospital-route', {
      type: 'geojson',
      data: EMPTY_LINE_COLLECTION,
    });
    map.addLayer({
      id: 'hospital-route-casing',
      type: 'line',
      source: 'hospital-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#FFFFFF',
        'line-width': 6,
        'line-opacity': 0.85,
      },
    });
    map.addLayer({
      id: 'hospital-route-line',
      type: 'line',
      source: 'hospital-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#0F766E',
        'line-width': 4,
      },
    });
  }
}

export function MiniMap({
  incident,
  ambulances = [],
  isPip = true,
  trackAmbulance = false,
  onDisableTracking,
  onToggleSwap,
  className = '',
}: MiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isMapLoadedRef = useRef<boolean>(false);

  // Persistent DOM marker refs so 200ms GPS ticks update coordinates smoothly without flickering
  const crashMarkerRef = useRef<ManagedMarker | null>(null);
  const ambMarkersRef = useRef<Map<string, ManagedMarker>>(new Map());
  const hospMarkersRef = useRef<Map<string, ManagedMarker>>(new Map());
  const personMarkersRef = useRef<Map<string, ManagedMarker>>(new Map());

  const lastFitKeyRef = useRef<string>('');
  const prevTrackRef = useRef<boolean>(false);
  const onDisableTrackingRef = useRef(onDisableTracking);
  onDisableTrackingRef.current = onDisableTracking;

  const centerLng = incident?.position.lng ?? 3.9012;
  const centerLat = incident?.position.lat ?? 36.3741;
  const initialCenterRef = useRef<[number, number]>([centerLng, centerLat]);

  // Initialize MapLibre instance once
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    maplibregl.config.WORKER_URL = '/maplibre-gl-worker.mjs';
    isMapLoadedRef.current = false;

    const mapStyle =
      process.env.NEXT_PUBLIC_MAP_STYLE ||
      'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const mapInstance = new maplibregl.Map({
      container,
      style: mapStyle,
      center: initialCenterRef.current,
      zoom: isPip ? 12.5 : 13,
      attributionControl: isPip ? false : undefined,
      interactive: !isPip,
    });

    if (!isPip) {
      mapInstance.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'bottom-right'
      );
    }

    // Disengage camera lock if user manually drags or zooms the map
    const handleUserInteraction = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent && onDisableTrackingRef.current) {
        onDisableTrackingRef.current();
      }
    };
    mapInstance.on('dragstart', handleUserInteraction);
    mapInstance.on('wheel', handleUserInteraction);

    const onStyleReady = () => {
      isMapLoadedRef.current = true;
      ensureSourcesAndLayers(mapInstance);
    };
    mapInstance.on('style.load', onStyleReady);
    mapInstance.on('load', onStyleReady);

    // ResizeObserver so layout shifts on the Responder page always keep the canvas sharp and aligned
    const ro = new ResizeObserver(() => {
      mapInstance.resize();
    });
    ro.observe(container);

    mapRef.current = mapInstance;

    const ambMap = ambMarkersRef.current;
    const hospMap = hospMarkersRef.current;
    const personMap = personMarkersRef.current;

    return () => {
      ro.disconnect();
      if (crashMarkerRef.current) {
        crashMarkerRef.current.marker.remove();
        crashMarkerRef.current = null;
      }
      ambMap.forEach((m) => m.marker.remove());
      ambMap.clear();
      hospMap.forEach((m) => m.marker.remove());
      hospMap.clear();
      personMap.forEach((m) => m.marker.remove());
      personMap.clear();
      mapInstance.remove();
      mapRef.current = null;
      isMapLoadedRef.current = false;
    };
  }, [isPip]);

  // Synchronize Markers, Route Polylines, and Camera on Incident / Ambulance updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // If no active incident, clear markers and polylines
    if (!incident) {
      if (crashMarkerRef.current) {
        crashMarkerRef.current.marker.remove();
        crashMarkerRef.current = null;
      }
      ambMarkersRef.current.forEach((m) => m.marker.remove());
      ambMarkersRef.current.clear();
      hospMarkersRef.current.forEach((m) => m.marker.remove());
      hospMarkersRef.current.clear();
      personMarkersRef.current.forEach((m) => m.marker.remove());
      personMarkersRef.current.clear();

      if (isMapLoadedRef.current) {
        (map.getSource('crash-perimeter') as maplibregl.GeoJSONSource | undefined)?.setData(
          EMPTY_POLYGON_COLLECTION
        );
        (map.getSource('ambulance-route') as maplibregl.GeoJSONSource | undefined)?.setData(
          EMPTY_LINE_COLLECTION
        );
        (map.getSource('hospital-route') as maplibregl.GeoJSONSource | undefined)?.setData(
          EMPTY_LINE_COLLECTION
        );
      }
      return;
    }

    const { lat, lng } = incident.position;

    // 1. Crash Pin Marker (persistent DOM node, updated in place)
    const confScore = incident.confidence.score;
    const pinColor =
      confScore >= 90
        ? 'var(--sev-extreme)'
        : confScore >= 70
        ? 'var(--sev-medium)'
        : 'var(--muted)';
    const crashSig = `${pinColor}:${confScore >= 90}`;

    if (!crashMarkerRef.current) {
      const pinEl = document.createElement('div');
      const marker = new maplibregl.Marker({ element: pinEl, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);
      crashMarkerRef.current = { marker, el: pinEl, sig: '' };
    } else {
      crashMarkerRef.current.marker.setLngLat([lng, lat]);
    }

    if (crashMarkerRef.current.sig !== crashSig) {
      crashMarkerRef.current.sig = crashSig;
      crashMarkerRef.current.el.innerHTML = `
        <div class="relative flex items-center justify-center">
          ${
            confScore >= 90
              ? `<span class="animate-ping" style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background-color: ${pinColor}; opacity: 0.45;"></span>`
              : ''
          }
          <span style="position: relative; background-color: ${pinColor}; width: 16px; height: 16px; border-radius: 9999px; border: 2.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.45); display: block;"></span>
        </div>
      `;
    }

    // 2. Ambulance Markers (assigned unit highlighted + available units as compact pins)
    const assignedId = incident.dispatch.ambulanceId;
    const activeAmbIds = new Set<string>();

    ambulances.forEach((amb) => {
      const isAssigned = amb.id === assignedId;
      if (!isAssigned && amb.status !== 'available') return;

      activeAmbIds.add(amb.id);
      const shortUnit = amb.unit.replace(/^Ambulance\s+/i, '').split(' ')[0];
      const speedBadge =
        isAssigned && amb.speedKmh && amb.speedKmh > 0
          ? ` · ${amb.speedKmh} km/h`
          : '';
      const ambSig = `${isAssigned}:${shortUnit}:${speedBadge}`;

      let entry = ambMarkersRef.current.get(amb.id);
      if (!entry) {
        const ambEl = document.createElement('div');
        const marker = new maplibregl.Marker({ element: ambEl, anchor: 'center' })
          .setLngLat([amb.lng, amb.lat])
          .addTo(map);
        entry = { marker, el: ambEl, sig: '' };
        ambMarkersRef.current.set(amb.id, entry);
      } else {
        entry.marker.setLngLat([amb.lng, amb.lat]);
      }

      if (entry.sig !== ambSig) {
        entry.sig = ambSig;
        if (isAssigned) {
          entry.el.innerHTML = `
            <div style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 9999px; background-color: var(--brand); color: #ffffff; border: 2px solid #ffffff; box-shadow: 0 3px 10px rgba(0,0,0,0.32); font-family: var(--font-mono); font-size: 11px; font-weight: 700; white-space: nowrap;">
              <span>🚑 ${shortUnit}${speedBadge}</span>
            </div>
          `;
        } else {
          entry.el.innerHTML = `
            <div title="${amb.unit}" style="display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 9999px; background-color: var(--surface); border: 2px solid var(--brand); box-shadow: 0 2px 6px rgba(0,0,0,0.22); font-size: 13px; cursor: pointer;">
              🚑
            </div>
          `;
        }
      }
    });

    ambMarkersRef.current.forEach((entry, id) => {
      if (!activeAmbIds.has(id)) {
        entry.marker.remove();
        ambMarkersRef.current.delete(id);
      }
    });

    // 3. Receiving Hospital Markers (tactical medical pins; Never overwrite el.className!)
    const selectedHospitalId = incident.dispatch.hospitalId;
    const activeHospIds = new Set<string>();

    incident.hospitalOptions.forEach((h) => {
      if (h.lat === undefined || h.lng === undefined) return;
      activeHospIds.add(h.id);

      const isSelected = h.id === selectedHospitalId;
      const capColor =
        h.capacityStatus === 'divert'
          ? 'var(--sev-extreme)'
          : h.capacityStatus === 'saturated'
          ? 'var(--sev-high)'
          : h.capacityStatus === 'busy'
          ? 'var(--sev-medium)'
          : 'var(--sev-low)';
      const shortName = h.name.replace(/\s*\(seed\)\s*/i, '');
      const hospSig = `${isSelected}:${capColor}:${shortName}:${h.freeBeds}`;

      let entry = hospMarkersRef.current.get(h.id);
      if (!entry) {
        const hospEl = document.createElement('div');
        const marker = new maplibregl.Marker({ element: hospEl, anchor: 'center' })
          .setLngLat([h.lng, h.lat])
          .addTo(map);
        entry = { marker, el: hospEl, sig: '' };
        hospMarkersRef.current.set(h.id, entry);
      } else {
        entry.marker.setLngLat([h.lng, h.lat]);
      }

      if (entry.sig !== hospSig) {
        entry.sig = hospSig;
        if (isSelected) {
          entry.el.innerHTML = `
            <div title="${shortName}" style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 5px; border-radius: 9999px; background-color: var(--surface); color: var(--ink); border: 2px solid var(--brand); box-shadow: 0 3px 10px rgba(0,0,0,0.28); font-size: 11px; font-weight: 700; white-space: nowrap;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 9999px; background-color: ${capColor}; color: #ffffff; font-size: 10px; font-weight: 800;">H</span>
              <span>${shortName}</span>
            </div>
          `;
        } else {
          entry.el.innerHTML = `
            <div title="${shortName} (${h.freeBeds} free beds)" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px 2px 3px; border-radius: 9999px; background-color: var(--surface); color: var(--ink); border: 1.5px solid ${capColor}; box-shadow: 0 2px 6px rgba(0,0,0,0.2); font-size: 10px; font-weight: 600; white-space: nowrap;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 9999px; background-color: ${capColor}; color: #ffffff; font-size: 9px; font-weight: 800;">H</span>
              <span>${shortName}</span>
            </div>
          `;
        }
      }
    });

    hospMarkersRef.current.forEach((entry, id) => {
      if (!activeHospIds.has(id)) {
        entry.marker.remove();
        hospMarkersRef.current.delete(id);
      }
    });

    // 4. Nearby People / First Responders Markers
    const activePersonIds = new Set<string>();
    incident.nearbyPeople?.forEach((p) => {
      activePersonIds.add(p.id);
      const isMedic = p.kind === 'helper_medic';
      const color = isMedic ? 'var(--sev-extreme)' : 'var(--brand)';
      const personSig = `${color}:${p.accepted}`;

      let entry = personMarkersRef.current.get(p.id);
      if (!entry) {
        const personEl = document.createElement('div');
        const marker = new maplibregl.Marker({ element: personEl, anchor: 'center' })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        entry = { marker, el: personEl, sig: '' };
        personMarkersRef.current.set(p.id, entry);
      } else {
        entry.marker.setLngLat([p.lng, p.lat]);
      }

      if (entry.sig !== personSig) {
        entry.sig = personSig;
        entry.el.innerHTML = `
          <div style="background-color: ${color}; width: 9px; height: 9px; border-radius: 9999px; border: 1.5px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
        `;
      }
    });

    personMarkersRef.current.forEach((entry, id) => {
      if (!activePersonIds.has(id)) {
        entry.marker.remove();
        personMarkersRef.current.delete(id);
      }
    });

    // 5. Update GeoJSON Layers & Camera Bounds
    const assignedAmbulance = ambulances.find((a) => a.id === assignedId);

    const applyLayersAndCamera = () => {
      ensureSourcesAndLayers(map);

      // 500m Safety Perimeter Ring
      const circleData = createGeoJsonCircle(lat, lng, 500);
      (map.getSource('crash-perimeter') as maplibregl.GeoJSONSource | undefined)?.setData(
        circleData
      );

      // Ambulance Route Polyline (drawn only when an ambulance is assigned)
      const ambPoly =
        assignedId && incident.dispatch.polyline && incident.dispatch.polyline.length > 1
          ? incident.dispatch.polyline.map(([pLat, pLng]) => [pLng, pLat] as [number, number])
          : [];
      (map.getSource('ambulance-route') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: ambPoly,
        },
        properties: {},
      });

      // Hospital Transport Polyline (drawn when a hospital route is active)
      const hospPoly =
        incident.dispatch.hospitalPolyline && incident.dispatch.hospitalPolyline.length > 1
          ? incident.dispatch.hospitalPolyline.map(
              ([pLat, pLng]) => [pLng, pLat] as [number, number]
            )
          : [];
      (map.getSource('hospital-route') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: hospPoly,
        },
        properties: {},
      });

      // Camera Management
      const fitKey = `${incident.id}:${assignedId ?? ''}:${selectedHospitalId ?? ''}`;
      const trackJustEnabled = trackAmbulance && !prevTrackRef.current;
      prevTrackRef.current = trackAmbulance;

      if (trackAmbulance && assignedAmbulance) {
        map.easeTo({
          center: [assignedAmbulance.lng, assignedAmbulance.lat],
          zoom: trackJustEnabled ? Math.max(map.getZoom(), 13.8) : map.getZoom(),
          duration: 180,
        });
      } else if (lastFitKeyRef.current !== fitKey) {
        lastFitKeyRef.current = fitKey;
        const bounds = new maplibregl.LngLatBounds().extend([lng, lat]);
        let hasExtraPoints = false;

        if (assignedAmbulance) {
          bounds.extend([assignedAmbulance.lng, assignedAmbulance.lat]);
          hasExtraPoints = true;
        }
        ambPoly.forEach((coord) => {
          bounds.extend(coord);
          hasExtraPoints = true;
        });
        hospPoly.forEach((coord) => {
          bounds.extend(coord);
          hasExtraPoints = true;
        });

        const selectedHosp = incident.hospitalOptions.find(
          (h) => h.id === selectedHospitalId
        );
        if (selectedHosp?.lat !== undefined && selectedHosp?.lng !== undefined) {
          bounds.extend([selectedHosp.lng, selectedHosp.lat]);
          hasExtraPoints = true;
        }

        // When no ambulance or hospital is assigned yet, frame nearby hospitals + crash site
        if (!hasExtraPoints) {
          incident.hospitalOptions.slice(0, 2).forEach((h) => {
            if (h.lat !== undefined && h.lng !== undefined) {
              bounds.extend([h.lng, h.lat]);
              hasExtraPoints = true;
            }
          });
        }

        if (hasExtraPoints) {
          map.fitBounds(bounds, {
            padding: isPip ? 24 : { top: 84, bottom: 56, left: 64, right: 64 },
            maxZoom: isPip ? 13.5 : 14.2,
            duration: 500,
          });
        } else {
          map.flyTo({ center: [lng, lat], zoom: isPip ? 13 : 13.8, duration: 500 });
        }
      }
    };

    if (isMapLoadedRef.current) {
      applyLayersAndCamera();
    } else {
      map.once('style.load', applyLayersAndCamera);
    }
  }, [incident, ambulances, isPip, trackAmbulance]);

  return (
    <div
      onClick={isPip ? onToggleSwap : undefined}
      className={`relative overflow-hidden transition-all duration-base ${
        isPip
          ? 'w-[240px] h-[160px] rounded-lg border border-white/20 shadow-2 cursor-pointer hover:border-white/40 group'
          : 'w-full h-full'
      } ${className}`}
    >
      {/* MapLibre DOM Target */}
      <div ref={mapContainerRef} className="w-full h-full bg-stage-bg" />

      {/* PiP Overlay Swap / Expand Pill Button */}
      {isPip && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSwap?.();
          }}
          className="absolute top-2 end-2 px-2.5 py-1 rounded-sm bg-stage-bg/90 backdrop-blur-md text-stage-ink text-[11px] font-medium flex items-center gap-1.5 border border-white/20 opacity-90 group-hover:opacity-100 transition-opacity"
          aria-label="Expand map"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Map</span>
        </button>
      )}
    </div>
  );
}

export default MiniMap;
