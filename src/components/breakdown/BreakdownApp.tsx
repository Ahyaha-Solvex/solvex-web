'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Button,
  Empty,
  Segmented,
  Switch,
  Tag,
} from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';

import { useBreakdownStore } from '@/lib/stores/breakdownStore';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { SimBadge } from '@/components/app/SimBadge';
import { BreakdownRequestCard } from './BreakdownRequestCard';

const BreakdownMap = dynamic(
  () => import('./BreakdownMap').then((mod) => mod.BreakdownMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#FAF8F3] text-[#5C675F]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#006233] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Chargement de la carte...</p>
        </div>
      </div>
    ),
  }
);

export function BreakdownApp() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('breakdown');
  const tHospital = useTranslations('hospital');

  const provider = useBreakdownStore((s) => s.provider);
  const requests = useBreakdownStore((s) => s.requests);
  const selectedRequestId = useBreakdownStore((s) => s.selectedRequestId);
  const activeMissionId = useBreakdownStore((s) => s.activeMissionId);
  const earningsDzd = useBreakdownStore((s) => s.earningsDzd);

  const selectRequest = useBreakdownStore((s) => s.selectRequest);
  const toggleOnline = useBreakdownStore((s) => s.toggleOnline);
  const simulateNewRequest = useBreakdownStore((s) => s.simulateNewRequest);
  const tickRouteProgress = useBreakdownStore((s) => s.tickRouteProgress);

  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');

  // Simulation loop: if a mission is in progress, drive tow truck along the route
  useEffect(() => {
    if (!activeMissionId) return;

    const interval = setInterval(() => {
      tickRouteProgress();
    }, 1200);

    return () => clearInterval(interval);
  }, [activeMissionId, tickRouteProgress]);

  const requestList = useMemo(() => {
    const list = Object.values(requests);
    if (filter === 'pending') return list.filter((r) => r.status === 'pending');
    if (filter === 'active')
      return list.filter((r) => r.status === 'accepted' || r.status === 'en_route' || r.status === 'on_scene');
    return list.filter((r) => r.status !== 'declined');
  }, [requests, filter]);

  const selectedRequest = selectedRequestId ? requests[selectedRequestId] : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF8F3] text-[#14201A]">
      {/* 56px Global Header */}
      <header className="h-14 border-b border-[#E2DDD3] px-4 flex items-center justify-between gap-4 bg-white/80 backdrop-blur shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#006233] text-white flex items-center justify-center font-black text-sm shadow-sm">
              DEP
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#14201A]">
                SolveX <span className="text-[#006233]">Breakdown</span>
              </span>
              <span className="text-[10px] text-[#5C675F] leading-none">
                {t('subHeader')}
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-[#E2DDD3] mx-1" />

          {/* Provider status badge */}
          <div className="flex items-center gap-2 text-xs">
            <Switch
              checked={provider.isOnline}
              onChange={(checked) => toggleOnline(checked)}
              size="small"
              className="bg-gray-300"
            />
            <span className="font-semibold text-[11px] text-[#14201A]">
              {provider.isOnline ? t('online') : t('offline')}
            </span>
          </div>
        </div>

        {/* 3-Role Navigation Switcher */}
        <Segmented
          value="breakdown"
          onChange={(role) => {
            if (role === 'responder') router.push(`/${locale}/responder`);
            if (role === 'hospital') router.push(`/${locale}/hospital`);
          }}
          options={[
            { label: tHospital('roleResponder'), value: 'responder' },
            { label: tHospital('roleHospital'), value: 'hospital' },
            { label: t('roleBreakdown'), value: 'breakdown' },
          ]}
        />

        {/* Right Header Utilities */}
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={simulateNewRequest}
            className="bg-[#006233] hover:bg-[#004f29] border-none font-semibold text-xs shadow-sm"
          >
            {t('simulateRequest')}
          </Button>
          <LangSwitcher />
          <SimBadge />
        </div>
      </header>

      {/* Main Workspace Stage */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Drawer / Request Queue Panel */}
        <aside className="w-84 xl:w-96 border-e border-[#E2DDD3] bg-white flex flex-col shrink-0 z-10 shadow-sm">
          {/* Tow Truck Driver Dossier */}
          <div className="p-3.5 border-b border-[#E2DDD3] bg-[#FAF8F3]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#006233] text-white flex items-center justify-center text-lg font-bold shadow-sm">
                  🚚
                </div>
                <div>
                  <div className="font-bold text-xs text-[#14201A]">
                    {provider.name}
                  </div>
                  <div className="text-[11px] text-[#5C675F] flex items-center gap-1.5">
                    <span>{provider.unitCode}</span>
                    <span>•</span>
                    <span className="flex items-center text-amber-500 font-semibold">
                      <StarFilled className="text-[10px] me-0.5" />
                      {provider.rating}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-end">
                <div className="text-[10px] uppercase text-[#5C675F] font-semibold">
                  {t('earnings')}
                </div>
                <div className="font-mono font-bold text-xs text-[#006233] flex items-center justify-end gap-1">
                  <DollarOutlined />
                  <span>{earningsDzd.toLocaleString()} DZD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Queue Filter Segmented */}
          <div className="p-2 border-b border-[#E2DDD3] bg-white">
            <Segmented
              block
              size="small"
              value={filter}
              onChange={(val) => setFilter(val as 'all' | 'pending' | 'active')}
              options={[
                { label: `${t('filterAll')} (${Object.values(requests).length})`, value: 'all' },
                {
                  label: `${t('filterPending')} (${
                    Object.values(requests).filter((r) => r.status === 'pending').length
                  })`,
                  value: 'pending',
                },
                {
                  label: `${t('filterActive')} (${
                    Object.values(requests).filter(
                      (r) => r.status === 'en_route' || r.status === 'on_scene'
                    ).length
                  })`,
                  value: 'active',
                },
              ]}
            />
          </div>

          {/* Requests List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {requestList.length === 0 ? (
              <div className="py-12">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('noRequests')}
                />
              </div>
            ) : (
              requestList.map((req) => {
                const isSelected = req.id === selectedRequestId;
                const isEnRoute = req.status === 'en_route';
                const isOnScene = req.status === 'on_scene';

                return (
                  <div
                    key={req.id}
                    onClick={() => selectRequest(req.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#006233] bg-[#E8F5E9]/30 shadow-sm ring-1 ring-[#006233]/40'
                        : 'border-[#E2DDD3] bg-white hover:bg-[#FAF8F3]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-bold text-xs text-[#14201A]">
                        {req.userName}
                      </div>
                      <Tag
                        color={
                          isEnRoute || isOnScene
                            ? 'green'
                            : req.status === 'pending'
                            ? 'gold'
                            : 'default'
                        }
                        className="text-[10px] m-0 font-semibold"
                      >
                        {t(`statuses.${req.status}`)}
                      </Tag>
                    </div>

                    <div className="text-[11px] text-[#5C675F] flex items-center justify-between mb-2">
                      <span className="truncate max-w-[170px]">{req.vehicleModel}</span>
                      <span className="font-bold text-[#006233]">
                        {req.priceDzd.toLocaleString()} DZD
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#5C675F] pt-1.5 border-t border-[#F0ECE3]">
                      <span>📍 {req.roadLabel}</span>
                      <span className="font-semibold text-[#14201A]">
                        {req.distanceKm} km ({req.etaMinutes} min)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Central Map & Floating Uber-style Card */}
        <main className="flex-1 relative h-full">
          <BreakdownMap />

          {/* Floating Request Dossier (Bottom/End Floating Card) */}
          {selectedRequest && (
            <div className="absolute bottom-5 end-5 w-96 max-w-[calc(100vw-32px)] z-20">
              <BreakdownRequestCard
                request={selectedRequest}
                onClose={() => selectRequest(null)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
