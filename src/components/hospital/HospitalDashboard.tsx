'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Segmented,
  Steps,
  Tooltip,
  notification,
} from 'antd';
import {
  AimOutlined,
  AlertOutlined,
  ArrowLeftOutlined,
  CarOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useUiStore } from '@/lib/stores/uiStore';
import type {
  BodyRegion,
  CrashFacts,
  LifecycleStatus,
  M3Level,
  M4Level,
  Occupant,
} from '@/lib/data/types';

import { SimBadge } from '@/components/app/SimBadge';
import { SeverityTag } from '@/components/app/SeverityTag';
import { RegionRow } from '@/components/app/RegionRow';
import { RegionLegend } from '@/components/app/RegionLegend';
import { VitalsCard } from '@/components/app/VitalsCard';
import { PrepChecklist } from '@/components/app/PrepChecklist';
import { TimelineList } from '@/components/app/TimelineList';
import { EmptyState } from '@/components/app/EmptyState';
import { LangSwitcher } from '@/components/ui/LangSwitcher';

const Body3D = dynamic(() => import('@/components/stage/Body3D'), {
  ssr: false,
});

const REGIONS: BodyRegion[] = [
  'head',
  'face',
  'spine_neck',
  'thorax',
  'abdomen',
  'arms',
  'legs',
];

const LEVEL_RANK: Record<M4Level, number> = {
  likely: 3,
  check: 2,
  unlikely: 1,
};

const LEVEL_COLOR: Record<M4Level, string> = {
  likely: 'var(--reg-likely)',
  check: 'var(--reg-check)',
  unlikely: 'var(--reg-unlikely)',
};

const SEVERITY_COLOR: Record<M3Level, string> = {
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  extreme: 'var(--sev-extreme)',
};

const LIFECYCLE: LifecycleStatus[] = [
  'detected',
  'dispatched',
  'on_scene',
  'transporting',
  'at_hospital',
];

const SCALE_TICKS = ['1.8m', '1.5m', '1.2m', '0.9m', '0.6m', '0.3m', '0.0m'];
const DEFAULT_ETA_S = 420;

function useLocalElapsed(enabled: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return elapsed;
}

function impactSide(deg: number): 'front' | 'right' | 'rear' | 'left' {
  const d = ((deg % 360) + 360) % 360;
  if (d < 45 || d >= 315) return 'front';
  if (d < 135) return 'right';
  if (d < 225) return 'rear';
  return 'left';
}

function CrashMechanismSummary({ crash }: { crash?: CrashFacts }) {
  const t = useTranslations('hospital');
  if (!crash) {
    return <p className="text-xs text-muted m-0">{t('noCrashData')}</p>;
  }
  const yesNo = (v: boolean | null) =>
    v === null ? t('unknown') : t(v ? 'yes' : 'no');

  const items = [
    {
      label: t('speedBefore'),
      value: `${crash.speedBeforeKmh} km/h`,
      mono: true,
    },
    { label: t('deltaV'), value: `${crash.deltaVKmh} km/h`, mono: true },
    {
      label: t('impact'),
      value: t(`impactSide.${impactSide(crash.impactDirectionDeg)}`),
      mono: false,
    },
    { label: t('rollover'), value: yesNo(crash.rollover), mono: false },
    { label: t('belt'), value: yesNo(crash.beltUsed), mono: false },
    { label: t('airbag'), value: yesNo(crash.airbagDeployed), mono: false },
  ];

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-2 mb-2">
        <CarOutlined className="text-brand" />
        <span>{t('crashTitle')}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="px-2.5 py-1.5 rounded-sm bg-surface-2/80 border border-border"
          >
            <div className="text-[10px] font-medium text-muted truncate">
              {item.label}
            </div>
            <div
              className={`text-xs font-semibold text-ink truncate mt-0.5 ${
                item.mono ? 'font-mono tabular-nums' : ''
              }`}
              dir={item.mono ? 'ltr' : undefined}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface HospitalDashboardProps {
  incidentId?: string;
  occupantId?: string;
  elapsed?: number;
  onSelectOccupant?: (occupantId: string) => void;
  onBack?: () => void;
}

export function HospitalDashboard({
  incidentId,
  occupantId: initialOccupant,
  elapsed: parentElapsed,
  onSelectOccupant,
  onBack,
}: HospitalDashboardProps = {}) {
  const t = useTranslations('hospital');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('status');
  const tRegions = useTranslations('regions');
  const locale = useLocale();
  const router = useRouter();
  const rtl = locale === 'ar';

  const { incidents, activeIncidentId, online } = useIncidentStore();
  const {
    hoveredRegion,
    selectedRegion,
    setHoveredRegion,
    setSelectedRegion,
    setScenarioDrawerOpen,
  } = useUiStore();

  const shownId = incidentId ?? activeIncidentId;
  const incident = shownId ? incidents[shownId] : null;

  const [occupantId, setOccupantId] = useState<string | null>(
    initialOccupant ?? null
  );
  const [viewMode, setViewMode] = useState<'front' | 'back' | 'free'>('front');
  const [resetNonce, setResetNonce] = useState(0);

  useEffect(() => {
    if (initialOccupant) {
      setOccupantId(initialOccupant);
    }
  }, [initialOccupant]);

  const occupant: Occupant | null = useMemo(() => {
    if (!incident || incident.occupants.length === 0) return null;
    return (
      incident.occupants.find((o) => o.id === occupantId) ??
      incident.occupants[0]
    );
  }, [incident, occupantId]);

  const previousIncident = useRef<string | null>(null);
  useEffect(() => {
    if (
      activeIncidentId &&
      previousIncident.current &&
      previousIncident.current !== activeIncidentId
    ) {
      notification.info({
        message: t('newPatientNotification'),
        description: t('newPatientDesc'),
        placement: rtl ? 'topLeft' : 'topRight',
      });
    }
    previousIncident.current = activeIncidentId;
  }, [activeIncidentId, t, rtl]);

  const ranked = useMemo(() => {
    if (!occupant) return [];
    return REGIONS.map((region) => ({
      region,
      ...(occupant.m4[region] ?? {
        level: 'unlikely' as M4Level,
        probability: 0,
      }),
    })).sort(
      (a, b) =>
        LEVEL_RANK[b.level] - LEVEL_RANK[a.level] ||
        b.probability - a.probability
    );
  }, [occupant]);

  const hospital =
    incident?.hospitalOptions?.find(
      (h) => h.id === incident.dispatch?.hospitalId
    ) ??
    incident?.hospitalOptions?.[0] ??
    null;

  const localElapsed = useLocalElapsed(parentElapsed === undefined);
  const effectiveElapsed = parentElapsed ?? localElapsed;
  const baseEta = incident?.dispatch?.etaToHospitalS ?? DEFAULT_ETA_S;
  const left = Math.max(0, baseEta - effectiveElapsed);
  const minutes = String(Math.floor(left / 60)).padStart(2, '0');
  const seconds = String(left % 60).padStart(2, '0');
  const stepIndex = incident ? LIFECYCLE.indexOf(incident.lifecycle) : 0;

  const resetView = () => {
    setViewMode('front');
    setSelectedRegion(null);
    setResetNonce((n) => n + 1);
  };

  const handleSelectOccupant = (id: string) => {
    setOccupantId(id);
    setSelectedRegion(null);
    onSelectOccupant?.(id);
  };

  const selectedRegionData = useMemo(() => {
    if (!selectedRegion) return null;
    return ranked.find((r) => r.region === selectedRegion) ?? null;
  }, [ranked, selectedRegion]);

  return (
    <div className="h-screen overflow-hidden bg-bg flex flex-col text-ink text-sm">
      {/* Unified 56px Top Navigation Bar */}
      <header className="h-14 shrink-0 px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-surface z-30">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <>
              <Button
                type="default"
                size="small"
                icon={<ArrowLeftOutlined className="rtl:rotate-180" />}
                onClick={onBack}
                className="font-semibold text-xs shrink-0"
              >
                {t('backToRecord')}
              </Button>
              <span className="h-5 w-px bg-border-strong shrink-0" />
            </>
          )}
          <span className="font-bold text-base tracking-tight text-ink shrink-0">
            {tCommon('brand')}
          </span>
          <span className="h-5 w-px bg-border-strong hidden sm:inline-block shrink-0" />
          <span className="text-sm font-medium text-ink-2 truncate hidden sm:inline">
            {hospital?.name ?? t('department')}
          </span>

          {/* Occupant Switcher Pills */}
          {incident && incident.occupants.length > 0 && (
            <div
              className="hidden xl:flex items-center gap-1.5 ms-2"
              role="tablist"
            >
              {incident.occupants.map((o) => {
                const isSelected = o.id === occupant?.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOccupant(o.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold transition-all border shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                      isSelected
                        ? 'bg-brand-subtle border-brand text-ink shadow-1'
                        : 'bg-surface-2 border-border text-muted hover:text-ink hover:border-border-strong'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: SEVERITY_COLOR[o.m3.level] }}
                    />
                    <span>{o.label}</span>
                    <span className="font-mono text-[10px] font-bold text-sev-extreme">
                      {o.profile.bloodType}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Segmented
          value="hospital"
          onChange={(role) =>
            role === 'responder' && router.push(`/${locale}/responder`)
          }
          options={[
            { label: t('roleResponder'), value: 'responder' },
            { label: t('roleHospital'), value: 'hospital' },
          ]}
        />

        <div className="flex items-center justify-end gap-3 shrink-0">
          {hospital && (
            <span className="hidden md:inline-flex items-center gap-1 h-8 px-3 rounded-full bg-brand-subtle border border-brand/25 text-xs font-medium text-brand">
              <MedicineBoxOutlined />
              <span>{t('freeBeds')}:</span>
              <strong className="font-mono tabular-nums">
                {hospital.freeBeds}
              </strong>
            </span>
          )}
          <LangSwitcher />
          <SimBadge />
        </div>
      </header>

      {!online && (
        <Alert
          type="warning"
          banner
          showIcon
          message={t('offlineBanner')}
          className="shrink-0"
        />
      )}

      {!incident || !occupant ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            variant="patients"
            title={t('emptyTitle')}
            description={t('emptyDesc')}
            action={
              <Button
                type="primary"
                onClick={() => setScenarioDrawerOpen(true)}
              >
                {t('scenarioHint')}
              </Button>
            }
          />
        </main>
      ) : (
        <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto lg:overflow-hidden">
          {/* =========================================================
              LEFT RAIL: ARRIVAL, SEVERITY & CRASH MECHANISM, PROFILE
              ========================================================= */}
          <aside className="w-full lg:w-80 shrink-0 lg:h-full lg:overflow-y-auto space-y-3 pe-0.5">
            {/* 1. Arrival & Transport Progress Card */}
            <Card
              size="small"
              className="bg-surface border-border shadow-1"
              title={
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <ClockCircleOutlined className="text-brand" />
                    <span>{t('arrival')}</span>
                  </span>
                  {incident.dispatch?.ambulanceId && (
                    <span className="px-2 py-0.5 rounded-sm bg-brand-subtle border border-brand/25 font-mono text-xs font-semibold text-brand">
                      {incident.dispatch.ambulanceId}
                    </span>
                  )}
                </div>
              }
            >
              <div className="space-y-3">
                {/* Dark Obsidian Telemetry Countdown Readout */}
                <div className="p-3.5 rounded-lg bg-stage-bg border border-border-strong text-stage-ink flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-stage-muted">
                      {t('etaTitle')}
                    </div>
                    <div className="text-xs mt-0.5 font-semibold text-stage-ink truncate">
                      {tStatus(incident.lifecycle)}
                    </div>
                  </div>
                  <div className="text-end shrink-0" dir="ltr">
                    <div
                      role="timer"
                      aria-label={t('etaTitle')}
                      className="font-mono text-3xl font-bold tabular-nums leading-none tracking-tight"
                      style={{ color: SEVERITY_COLOR[occupant.m3.level] }}
                    >
                      {minutes}:{seconds}
                    </div>
                    <div className="text-[10px] font-mono text-stage-muted mt-1">
                      {t('minSec')}
                    </div>
                  </div>
                </div>

                {incident.position?.roadLabel && (
                  <div className="flex items-center gap-2 text-xs text-muted px-0.5">
                    <EnvironmentOutlined className="text-brand shrink-0" />
                    <span className="truncate font-medium text-ink">
                      {incident.position.roadLabel}
                    </span>
                  </div>
                )}

                <div className="pt-2.5 border-t border-border">
                  <Steps
                    direction="vertical"
                    size="small"
                    current={stepIndex >= 0 ? stepIndex : 0}
                    items={LIFECYCLE.map((status) => ({
                      title: (
                        <span className="text-xs font-medium">
                          {tStatus(status)}
                        </span>
                      ),
                    }))}
                  />
                </div>
              </div>
            </Card>

            {/* 2. Severity (M3) & Crash Mechanism Card */}
            <Card
              size="small"
              className="bg-surface border-border shadow-1"
              title={
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <AlertOutlined className="text-sev-extreme" />
                  <span>{t('severity')}</span>
                </span>
              }
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-2/80 border border-border">
                  <SeverityTag severity={occupant.m3.level} size="large" />
                  <div className="text-end">
                    <div className="text-[11px] font-medium text-muted">
                      {t('rankingScore')}
                    </div>
                    <div
                      className="font-mono text-xl font-bold tabular-nums text-ink mt-0.5"
                      dir="ltr"
                    >
                      {Math.round(occupant.m3.probability * 100)}%
                    </div>
                  </div>
                </div>

                {occupant.m3.escalatedBy &&
                  occupant.m3.escalatedBy.length > 0 && (
                    <div className="px-3 py-2 rounded-md bg-sev-extreme-subtle border border-sev-extreme/30 text-xs font-medium text-sev-extreme flex items-center gap-2">
                      <AlertOutlined className="shrink-0" />
                      <span>
                        {t('raisedBy')}:{' '}
                        <strong>{occupant.m3.escalatedBy.join(', ')}</strong>
                      </span>
                    </div>
                  )}

                <CrashMechanismSummary crash={incident.crash} />

                <p className="text-xs text-muted m-0">
                  {tCommon('medicalDisclaimer')}
                </p>
              </div>
            </Card>

            {/* 3. Patient Clinical Profile Card */}
            <Card
              size="small"
              className="bg-surface border-border shadow-1"
              title={
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <UserOutlined className="text-brand" />
                    <span>{occupant.label}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/35 font-mono text-xs font-bold text-sev-extreme">
                    {occupant.profile.bloodType}
                  </span>
                </div>
              }
            >
              <div className="space-y-2.5">
                {(occupant.profile.onBloodThinners ||
                  occupant.profile.pregnant) && (
                  <div className="flex flex-wrap gap-1.5 pb-2.5 border-b border-border">
                    {occupant.profile.onBloodThinners && (
                      <span className="px-2 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/35 text-sev-extreme text-xs font-semibold">
                        {t('bloodThinners')}
                      </span>
                    )}
                    {occupant.profile.pregnant && (
                      <span className="px-2 py-0.5 rounded-sm bg-sev-medium/15 border border-sev-medium text-ink text-xs font-semibold">
                        {t('pregnant')}
                      </span>
                    )}
                  </div>
                )}

                <div className="divide-y divide-border text-xs">
                  <div className="py-1.5 first:pt-0 flex items-center justify-between gap-3">
                    <span className="text-muted font-medium">{t('ageSex')}</span>
                    <span className="font-semibold text-ink text-end">
                      {t('ageValue', { age: occupant.profile.ageYears })} ·{' '}
                      {t(occupant.profile.sex === 'm' ? 'male' : 'female')}
                    </span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between gap-3">
                    <span className="text-muted font-medium">
                      {t('chronic')}
                    </span>
                    <span className="text-ink text-end">
                      {occupant.profile.chronicDiseases.length > 0
                        ? occupant.profile.chronicDiseases.join(', ')
                        : t('none')}
                    </span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between gap-3">
                    <span className="text-muted font-medium">
                      {t('allergies')}
                    </span>
                    <div className="text-end">
                      {occupant.profile.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {occupant.profile.allergies.map((allergy) => (
                            <span
                              key={allergy}
                              className="px-2 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/30 text-sev-extreme text-[11px] font-semibold"
                            >
                              {allergy}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink">{t('none')}</span>
                      )}
                    </div>
                  </div>
                  <div className="py-1.5 flex items-center justify-between gap-3">
                    <span className="text-muted font-medium">
                      {t('medications')}
                    </span>
                    <span className="text-ink text-end">
                      {occupant.profile.medications.length > 0
                        ? occupant.profile.medications.join(', ')
                        : t('none')}
                    </span>
                  </div>
                  {occupant.profile.emergencyContact && (
                    <div className="py-1.5 last:pb-0 flex items-center justify-between gap-3">
                      <span className="text-muted font-medium">
                        {t('emergencyContact')}
                      </span>
                      <span className="flex items-center gap-1.5 text-ink font-medium">
                        <PhoneOutlined className="text-brand" />
                        <span>{occupant.profile.emergencyContact.label}</span>
                        <span
                          className="font-mono text-xs font-semibold text-ink-2"
                          dir="ltr"
                        >
                          {occupant.profile.emergencyContact.phone}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </aside>

          {/* =========================================================
              CENTER STAGE: 3D ANATOMICAL DIGITAL TWIN VIEWPORT
              ========================================================= */}
          <section className="flex-1 min-w-[340px] min-h-[520px] lg:min-h-0 lg:h-full flex flex-col">
            <div className="relative flex-1 w-full h-full rounded-lg overflow-hidden border border-border-strong bg-stage-bg shadow-2 select-none">
              {/* 1. 48px Stage Grid & Radial Depth Vignette */}
              <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
                style={{
                  backgroundImage: `linear-gradient(to right, var(--stage-grid) 1px, transparent 1px),
                                    linear-gradient(to bottom, var(--stage-grid) 1px, transparent 1px)`,
                  backgroundSize: '48px 48px',
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
                style={{
                  background:
                    'radial-gradient(circle at 50% 48%, rgba(0, 98, 51, 0.14) 0%, rgba(11, 19, 16, 0.45) 58%, rgba(11, 19, 16, 0.88) 100%)',
                }}
              />

              {/* 2. Anatomical Vertical Elevation Scale */}
              <div
                className="absolute inset-y-16 start-4 w-10 hidden sm:flex flex-col justify-between pointer-events-none z-10"
                aria-hidden="true"
                dir="ltr"
              >
                {SCALE_TICKS.map((tick) => (
                  <div key={tick} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-px bg-stage-muted/60" />
                    <span className="font-mono text-[10px] text-stage-muted opacity-75">
                      {tick}
                    </span>
                  </div>
                ))}
              </div>

              {/* 3. WebGL 3D Human Body Twin */}
              <div className="relative z-0 w-full h-full">
                <Body3D
                  key={resetNonce}
                  occupant={occupant}
                  viewMode={viewMode}
                  onReset={resetView}
                />
              </div>

              {/* 4. Unmasked Interactive Stage HUD Overlay */}
              <div className="absolute inset-0 z-10 p-3.5 flex flex-col justify-between pointer-events-none">
                {/* Top HUD Row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                    <Segmented
                      value={viewMode}
                      onChange={(mode) =>
                        setViewMode(mode as 'front' | 'back' | 'free')
                      }
                      options={[
                        { label: t('viewFront'), value: 'front' },
                        { label: t('viewBack'), value: 'back' },
                        { label: t('viewFree'), value: 'free' },
                      ]}
                    />

                    {/* Active Focused Region Chip */}
                    {selectedRegionData && (
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-stage-bg/90 text-stage-ink text-xs font-semibold shadow-2 backdrop-blur-md"
                        style={{
                          borderColor: LEVEL_COLOR[selectedRegionData.level],
                        }}
                      >
                        <AimOutlined
                          style={{
                            color: LEVEL_COLOR[selectedRegionData.level],
                          }}
                        />
                        <span>{tRegions(selectedRegionData.region)}</span>
                        <span
                          className="font-mono font-bold tabular-nums"
                          dir="ltr"
                        >
                          {Math.round(selectedRegionData.probability * 100)}%
                        </span>
                        <button
                          type="button"
                          aria-label={t('resetView')}
                          onClick={() => setSelectedRegion(null)}
                          className="ms-1 p-0.5 rounded-sm hover:bg-white/15 transition-colors"
                        >
                          <CloseOutlined className="text-[10px]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Top-End Model Badge */}
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <Tooltip title={t('m4Tooltip')}>
                      <div className="px-3 py-1.5 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 border border-brand/60 bg-stage-bg/90 text-stage-ink shadow-2 cursor-help backdrop-blur-md">
                        <InfoCircleOutlined className="text-brand" />
                        <span>{t('m4Estimate')}</span>
                      </div>
                    </Tooltip>
                  </div>
                </div>

                {/* Bottom HUD Row */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="pointer-events-auto">
                    <RegionLegend tone="stage" />
                  </div>

                  <div className="hidden md:block px-3.5 py-1.5 rounded-md text-xs border border-white/12 bg-stage-bg/90 text-stage-muted backdrop-blur-md shadow-2">
                    {tCommon('medicalDisclaimer')}
                  </div>

                  <div className="pointer-events-auto">
                    <Button
                      size="middle"
                      icon={<ReloadOutlined />}
                      onClick={resetView}
                      className="shadow-2"
                    >
                      {t('resetView')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================
              RIGHT RAIL: M4 INJURY MAP, LIVE VITALS, ER PREP & BEDS
              ========================================================= */}
          <aside className="w-full lg:w-96 shrink-0 lg:h-full lg:overflow-y-auto space-y-3 ps-0.5">
            {/* 1. M4 Regional Injury Map (All 7 Anatomical Regions) */}
            <Card
              size="small"
              className="bg-surface border-border shadow-1"
              title={
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <HeartOutlined className="text-sev-extreme" />
                    <span>{t('whereToLook')}</span>
                    <Tooltip title={t('m4Tooltip')}>
                      <InfoCircleOutlined className="text-muted text-xs cursor-help" />
                    </Tooltip>
                  </span>
                  <span className="px-2 py-0.5 rounded-sm bg-surface-2 border border-border font-mono text-xs font-semibold text-ink-2 tabular-nums">
                    {ranked.length}
                  </span>
                </div>
              }
            >
              <div className="space-y-1.5">
                {ranked.map(({ region, level, probability }) => (
                  <RegionRow
                    key={region}
                    region={region}
                    level={level}
                    probability={probability}
                    selected={selectedRegion === region}
                    hovered={hoveredRegion === region}
                    onSelect={(reg) =>
                      setSelectedRegion(selectedRegion === reg ? null : reg)
                    }
                    onHover={(reg) => setHoveredRegion(reg)}
                  />
                ))}
              </div>
            </Card>

            {/* 2. Live Patient Vitals */}
            <VitalsCard vitals={occupant.vitals} />

            {/* 3. ER Preparation Checklist */}
            <PrepChecklist key={incident.id} items={incident.prep} />

            {/* 4. Receiving Hospital */}
            {hospital && (
              <Card
                size="small"
                className="bg-surface border-border shadow-1"
                title={
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <MedicineBoxOutlined className="text-brand" />
                    <span>{t('beds')}</span>
                  </span>
                }
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">
                      {hospital.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-sm bg-brand-subtle border border-brand/25 font-mono text-xs font-semibold text-brand tabular-nums">
                      {t('freeBeds')}: <strong>{hospital.freeBeds}</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hospital.specialties.map((spec) => (
                      <span
                        key={spec}
                        className="px-2 py-0.5 rounded-sm bg-surface-2 border border-border text-ink-2 text-[11px] font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* 5. Incident Timeline (single card, no double-wrapping!) */}
            {incident.timeline && incident.timeline.length > 0 && (
              <TimelineList events={incident.timeline} />
            )}
          </aside>
        </main>
      )}
    </div>
  );
}
