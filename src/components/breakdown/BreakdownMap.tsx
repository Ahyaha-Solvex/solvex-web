'use client';

import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { AimOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';
import { useBreakdownStore } from '@/lib/stores/breakdownStore';
import type { BreakdownRequest } from '@/lib/data/breakdownTypes';

if (typeof window !== 'undefined') {
  maplibregl.config.WORKER_URL = '/maplibre-gl-worker.mjs';
}

const EMPTY_LINE_COLLECTION = {
  type: 'Feature' as const,
  geometry: {
    type: 'LineString' as const,
    coordinates: [] as [number, number][],
  },
  properties: {},
};

export function BreakdownMap() {
  const t = useTranslations('breakdown');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isMapLoadedRef = useRef<boolean>(false);

  const provider = useBreakdownStore((s) => s.provider);
  const requests = useBreakdownStore((s) => s.requests);
  const selectedRequestId = useBreakdownStore((s) => s.selectedRequestId);
  const activeMissionId = useBreakdownStore((s) => s.activeMissionId);
  const selectRequest = useBreakdownStore((s) => s.selectRequest);
  const isTrackingTowTruck = useBreakdownStore((s) => s.isTrackingTowTruck);
  const setTrackingTowTruck = useBreakdownStore((s) => s.setTrackingTowTruck);

  const providerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const providerMarkerSigRef = useRef<string>('');
  const userMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const userMarkerSigsRef = useRef<Map<string, string>>(new Map());
  const lastFitMissionRef = useRef<string | null>(null);

  const setTrackingRef = useRef(setTrackingTowTruck);
  setTrackingRef.current = setTrackingTowTruck;

  const initialPosRef = useRef<[number, number]>([provider.position.lng, provider.position.lat]);

  // Initialize MapLibre
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
      center: initialPosRef.current,
      zoom: 13,
      attributionControl: false,
    });

    mapInstance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right'
    );

    const handleUserInteraction = () => {
      setTrackingRef.current(false);
    };
    mapInstance.on('dragstart', handleUserInteraction);
    mapInstance.on('wheel', handleUserInteraction);

    const onStyleReady = () => {
      isMapLoadedRef.current = true;
      if (!mapInstance.getSource('breakdown-route')) {
        mapInstance.addSource('breakdown-route', {
          type: 'geojson',
          data: EMPTY_LINE_COLLECTION,
        });

        // Route Casing
        mapInstance.addLayer({
          id: 'breakdown-route-casing',
          type: 'line',
          source: 'breakdown-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 7,
            'line-opacity': 0.9,
          },
        });

        // Route Emerald Line
        mapInstance.addLayer({
          id: 'breakdown-route-line',
          type: 'line',
          source: 'breakdown-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#006233',
            'line-width': 4.5,
          },
        });
      }
    };

    mapInstance.on('style.load', onStyleReady);
    mapInstance.on('load', onStyleReady);

    const ro = new ResizeObserver(() => {
      mapInstance.resize();
    });
    ro.observe(container);

    mapRef.current = mapInstance;

    const userMarkers = userMarkersRef.current;

    return () => {
      ro.disconnect();
      userMarkers.forEach((m) => m.remove());
      userMarkers.clear();
      if (providerMarkerRef.current) {
        providerMarkerRef.current.remove();
        providerMarkerRef.current = null;
      }
      mapInstance.remove();
      mapRef.current = null;
      isMapLoadedRef.current = false;
    };
  }, []);

  // Update Tow Truck Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const towSig = `${provider.unitCode}:${provider.isOnline}:${provider.status}`;

    const renderTowMarker = () => `
      <div class="relative flex flex-col items-center cursor-pointer select-none group" style="transform: translate(-50%, -50%);">
        <div class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#006233] text-white shadow-lg border border-white/60 mb-1 whitespace-nowrap flex items-center gap-1.5 tracking-wide">
          <span class="w-2 h-2 rounded-full ${provider.isOnline ? 'bg-emerald-300 animate-pulse' : 'bg-gray-400'}"></span>
          <span>🚚 ${provider.unitCode}</span>
          ${provider.status === 'busy' ? '<span class="text-[9px] bg-black/25 px-1 py-0.2 rounded font-semibold">EN MISSION</span>' : ''}
        </div>
        <div class="relative flex items-center justify-center">
          <div class="w-10 h-10 rounded-full bg-[#006233] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,98,51,0.4)] border-2 border-white ring-4 ring-[#006233]/25 transition-transform duration-200 group-hover:scale-110">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
        </div>
      </div>
    `;

    if (!providerMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'select-none';
      el.innerHTML = renderTowMarker();

      el.addEventListener('click', () => {
        map.flyTo({
          center: [provider.position.lng, provider.position.lat],
          zoom: 14,
          duration: 800,
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([provider.position.lng, provider.position.lat])
        .addTo(map);

      providerMarkerRef.current = marker;
      providerMarkerSigRef.current = towSig;
    } else {
      providerMarkerRef.current.setLngLat([provider.position.lng, provider.position.lat]);
      if (providerMarkerSigRef.current !== towSig) {
        providerMarkerSigRef.current = towSig;
        providerMarkerRef.current.getElement().innerHTML = renderTowMarker();
      }
    }

    if (isTrackingTowTruck) {
      map.easeTo({
        center: [provider.position.lng, provider.position.lat],
        duration: 300,
      });
    }
  }, [provider.position.lat, provider.position.lng, provider.unitCode, provider.isOnline, provider.status, isTrackingTowTruck]);

  // Update Stranded User Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const requestList = Object.values(requests).filter(
      (r) => r.status !== 'declined' && r.status !== 'completed'
    );
    const activeIds = new Set(requestList.map((r) => r.id));

    // Remove markers that no longer exist or are declined/completed
    userMarkersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        userMarkersRef.current.delete(id);
        userMarkerSigsRef.current.delete(id);
      }
    });

    requestList.forEach((req) => {
      const isSelected = req.id === selectedRequestId;
      const isAccepted = req.id === activeMissionId;
      const sig = `${req.id}:${req.status}:${isSelected}:${isAccepted}:${req.distanceKm}`;

      const renderStrandedMarker = () => `
        <div class="relative flex flex-col items-center cursor-pointer select-none group" style="transform: translate(-50%, -50%);">
          <!-- Status & Distance Pill -->
          <div class="px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-md whitespace-nowrap mb-1 flex items-center gap-1.5 border border-[#D5CFBE] transition-transform duration-200 ${
            isSelected ? 'scale-110 bg-[#14201A] text-white' : 'bg-[#FAF8F3] text-[#14201A]'
          }">
            <span class="w-2 h-2 rounded-full ${isAccepted ? 'bg-[#006233]' : 'bg-[#D21034] animate-ping'}"></span>
            <span>${req.userName}</span>
            <span class="text-[10px] text-[#5C675F] font-mono">• ${req.distanceKm} km</span>
          </div>

          <!-- Distress Radar Pulse Signal -->
          <div class="relative flex items-center justify-center">
            ${
              !isAccepted
                ? `<div class="absolute w-12 h-12 rounded-full bg-[#D21034] animate-ping opacity-30 pointer-events-none"></div>
                   <div class="absolute w-10 h-10 rounded-full border-2 border-[#D21034] animate-pulse pointer-events-none opacity-60"></div>`
                : `<div class="absolute w-10 h-10 rounded-full bg-[#006233] animate-pulse opacity-25 pointer-events-none"></div>`
            }

            <!-- Center Icon Badge -->
            <div class="relative w-9 h-9 rounded-full ${
              isAccepted
                ? 'bg-[#006233] text-white ring-4 ring-[#006233]/25 shadow-[0_4px_12px_rgba(0,98,51,0.4)]'
                : isSelected
                ? 'bg-[#D21034] text-white ring-4 ring-[#D21034]/35 shadow-[0_4px_14px_rgba(210,16,52,0.5)] scale-110'
                : 'bg-[#14201A] text-white ring-2 ring-white shadow-lg'
            } flex items-center justify-center text-sm border-2 border-white transition-all duration-200 group-hover:scale-110">
              ${isAccepted ? '✓' : '🚗'}
            </div>
          </div>
        </div>
      `;

      let marker = userMarkersRef.current.get(req.id);

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'select-none transition-transform duration-200 hover:scale-105';
        el.innerHTML = renderStrandedMarker();

        el.addEventListener('click', () => {
          selectRequest(req.id);
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([req.position.lng, req.position.lat])
          .addTo(map);

        userMarkersRef.current.set(req.id, marker);
        userMarkerSigsRef.current.set(req.id, sig);
      } else {
        marker.setLngLat([req.position.lng, req.position.lat]);
        if (userMarkerSigsRef.current.get(req.id) !== sig) {
          userMarkerSigsRef.current.set(req.id, sig);
          marker.getElement().innerHTML = renderStrandedMarker();
        }
      }
    });
  }, [requests, selectedRequestId, activeMissionId, selectRequest]);

  // Update Road Polyline and Fit Bounds when a mission is accepted or selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoadedRef.current) return;

    const activeMission = activeMissionId ? requests[activeMissionId] : null;
    const selectedReq = selectedRequestId ? requests[selectedRequestId] : null;

    // Show road polyline if mission is accepted/active OR if selected
    // As per user specification: "if accept the road to that user should appear"
    const reqWithRoute: BreakdownRequest | null =
      activeMission ??
      (selectedReq && (selectedReq.status === 'accepted' || selectedReq.status === 'en_route')
        ? selectedReq
        : null);

    const source = map.getSource('breakdown-route') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (reqWithRoute && reqWithRoute.routeCoordinates.length > 0) {
      // Map to GeoJSON [lng, lat]
      const coords = reqWithRoute.routeCoordinates.map(([lat, lng]) => [lng, lat] as [number, number]);
      source.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        properties: {},
      });

      // Fit bounds once when accepted
      if (lastFitMissionRef.current !== reqWithRoute.id) {
        lastFitMissionRef.current = reqWithRoute.id;

        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([provider.position.lng, provider.position.lat]);
        bounds.extend([reqWithRoute.position.lng, reqWithRoute.position.lat]);

        map.fitBounds(bounds, {
          padding: { top: 90, bottom: 90, left: 120, right: 120 },
          maxZoom: 15,
          duration: 1100,
        });
      }
    } else {
      source.setData(EMPTY_LINE_COLLECTION);
      if (!activeMissionId) {
        lastFitMissionRef.current = null;
      }
    }
  }, [activeMissionId, selectedRequestId, requests, provider.position]);

  const handleCenterProvider = () => {
    const map = mapRef.current;
    if (!map) return;
    setTrackingTowTruck(true);
    map.flyTo({
      center: [provider.position.lng, provider.position.lat],
      zoom: 14,
      duration: 800,
    });
  };

  return (
    <div className="relative w-full h-full min-h-[420px]">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Tactical Overlay Controls */}
      <div className="absolute top-3 end-3 z-10 flex items-center gap-2">
        <Tooltip title={t('centerTowTruck')}>
          <Button
            shape="circle"
            icon={<AimOutlined />}
            onClick={handleCenterProvider}
            className="shadow-md bg-[#FAF8F3] hover:bg-white border-[#E2DDD3]"
          />
        </Tooltip>
      </div>
    </div>
  );
}
