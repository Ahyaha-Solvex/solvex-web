'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Drawer,
  Popconfirm,
  Popover,
  Segmented,
  Select,
  Slider,
  Tabs,
  Tooltip,
  notification,
} from 'antd';
import {
  AimOutlined,
  ArrowRightOutlined,
  CarOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MedicineBoxFilled,
  MessageOutlined,
  PhoneOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  StarFilled,
  TeamOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useIncidentSource } from '@/components/app/SourceProvider';
import type {
  ConfidenceStatus,
  HospitalCapacityStatus,
  Incident,
  LifecycleStatus,
  M3Level,
  PhoneReport,
  TriageColor,
} from '@/lib/data/types';

import { SimBadge } from '@/components/app/SimBadge';
import { SeverityTag } from '@/components/app/SeverityTag';
import { StatusTag } from '@/components/app/StatusTag';
import { ConfidenceLadder } from '@/components/app/ConfidenceLadder';
import { AmbulanceTable } from '@/components/app/AmbulanceTable';
import { TimelineList } from '@/components/app/TimelineList';
import { SmsFeed } from '@/components/app/SmsFeed';
import { EmptyState } from '@/components/app/EmptyState';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { NewCallModal } from './NewCallModal';
import { ZoneAlert } from './ZoneAlert';

const MiniMap = dynamic(() => import('@/components/stage/MiniMap'), { ssr: false });

const SEVERITY_COLOR: Record<M3Level, string> = {
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  extreme: 'var(--sev-extreme)',
};
const SEVERITY_RANK: Record<M3Level, number> = { low: 0, medium: 1, high: 2, extreme: 3 };

const CONFIDENCE_COLOR: Record<ConfidenceStatus, string> = {
  suspected: 'var(--conf-suspected)',
  likely: 'var(--conf-likely)',
  witness_confirmed: 'var(--conf-witness)',
  confirmed: 'var(--conf-confirmed)',
};

const TRIAGE: TriageColor[] = ['green', 'yellow', 'red', 'black'];
const TRIAGE_COLOR: Record<TriageColor, string> = {
  green: 'var(--sev-low)',
  yellow: 'var(--sev-medium)',
  red: 'var(--sev-extreme)',
  black: 'var(--ink)',
};

const CAPACITY_COLOR: Record<HospitalCapacityStatus, string> = {
  optimal: 'var(--sev-low)',
  busy: 'var(--sev-medium)',
  saturated: 'var(--sev-high)',
  divert: 'var(--sev-extreme)',
};

const LIFECYCLE: LifecycleStatus[] = [
  'detected',
  'dispatched',
  'on_scene',
  'transporting',
  'at_hospital',
];
const DEFAULT_RADIUS_M = 2000;

type QueueFilter = 'all' | 'needs_action' | 'dispatched';

function worst(incident: Incident): M3Level | null {
  return incident.occupants.reduce<M3Level | null>(
    (level, o) =>
      !level || SEVERITY_RANK[o.m3.level] > SEVERITY_RANK[level] ? o.m3.level : level,
    null
  );
}

function minutes(seconds?: number) {
  return seconds === undefined ? '--' : String(Math.max(1, Math.round(seconds / 60)));
}

/** Section header with sentence-case typography. */
function SectionHeader({
  title,
  extra,
}: {
  title: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2.5">
      <h3 className="text-xs font-semibold text-ink-2 m-0">{title}</h3>
      {extra}
    </div>
  );
}

/** Dark-stage KPI card with tabular-nums readout. */
function StageKpi({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: string;
}) {
  return (
    <div className="px-3.5 py-2 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-white/12 shadow-2 min-w-[96px]">
      <div className="text-[11px] font-medium text-stage-muted truncate">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5" dir="ltr">
        <span
          className="font-mono text-xl font-bold tabular-nums leading-none"
          style={{ color: tone ?? 'var(--stage-ink)' }}
        >
          {value}
        </span>
        {unit && <span className="text-[11px] font-mono text-stage-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function ResponderApp() {
  const t = useTranslations('responder');
  const tw = useTranslations('responder.workspace');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('status');
  const tHospital = useTranslations('hospital');
  const locale = useLocale();
  const router = useRouter();
  const rtl = locale === 'ar';
  const placement = rtl ? 'topLeft' : 'topRight';

  const { incidents, activeIncidentId, ambulances, online, selectIncident } =
    useIncidentStore();
  const source = useIncidentSource();
  const incident: Incident | null = activeIncidentId
    ? incidents[activeIncidentId] ?? null
    : null;

  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [ambulancesOpen, setAmbulancesOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [trackAmbulance, setTrackAmbulance] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  useEffect(() => {
    if (!mapFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMapFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mapFullscreen]);

  const allActive = useMemo(
    () =>
      Object.values(incidents)
        .filter((i) => i.lifecycle !== 'closed')
        .sort(
          (a, b) =>
            b.confidence.score - a.confidence.score ||
            b.createdAt.localeCompare(a.createdAt)
        ),
    [incidents]
  );

  const queue = useMemo(() => {
    if (queueFilter === 'needs_action') {
      return allActive.filter(
        (inc) => inc.confidence.status !== 'confirmed' || inc.lifecycle === 'detected'
      );
    }
    if (queueFilter === 'dispatched') {
      return allActive.filter(
        (inc) => inc.lifecycle !== 'detected' || Boolean(inc.dispatch.ambulanceId)
      );
    }
    return allActive;
  }, [allActive, queueFilter]);

  const confirmed = incident?.confidence.status === 'confirmed';
  const assigned = Boolean(incident?.dispatch.ambulanceId);
  const level = incident ? worst(incident) : null;
  const ambulance = ambulances.find((a) => a.id === incident?.dispatch.ambulanceId);
  const contact = incident?.occupants[0]?.profile.emergencyContact;
  const stepIndex = incident ? LIFECYCLE.indexOf(incident.lifecycle) : -1;

  const alertZone = Object.values(incidents).find(
    (i) =>
      i.deadZone &&
      !i.deadZone.acknowledged &&
      i.deadZone.phase !== 'in_zone' &&
      i.lifecycle !== 'closed'
  );

  const helpers = useMemo(
    () =>
      [...(incident?.nearbyPeople ?? [])]
        .filter((p) => p.kind !== 'staff')
        .sort((a, b) => a.distanceM - b.distanceM),
    [incident]
  );

  const solidarityCounts = useMemo(() => {
    let medics = 0;
    let firstAiders = 0;
    let volunteers = 0;
    for (const p of helpers) {
      if (p.kind === 'helper_medic') medics++;
      else if (p.kind === 'helper_first_aider') firstAiders++;
      else volunteers++;
    }
    return { medics, firstAiders, volunteers };
  }, [helpers]);

  const confirmCrash = () => {
    if (!incident) return;
    source.confirm(incident.id);
    notification.success({
      message: t('actions.confirm'),
      description: incident.position.roadLabel,
      placement,
    });
  };

  const assignAmbulance = (ambulanceId: string) => {
    if (!incident) return;
    source.assignAmbulance(incident.id, ambulanceId);
    setAmbulancesOpen(false);
    setTrackAmbulance(false);
    notification.success({
      message: t('actions.assignAmbulance'),
      description: ambulanceId,
      placement,
    });
  };

  const dispatchUnitToHospital = (hospitalId: string) => {
    if (!incident) return;
    const hospital = incident.hospitalOptions.find((h) => h.id === hospitalId);
    source.dispatchToHospital(incident.id, hospitalId);
    setTrackAmbulance(false);
    notification.success({
      message: tw('dispatchedToHospital'),
      description: hospital?.name ?? hospitalId,
      placement,
    });
  };

  const broadcast = () => {
    if (!incident) return;
    source.callForHelp(incident.id, radiusM);
    setBroadcastOpen(false);
    notification.info({
      message: t('actions.callForHelp'),
      description: `${radiusM} m`,
      placement,
    });
  };

  const closeMission = () => {
    if (!incident) return;
    source.close(incident.id);
    selectIncident(allActive.find((i) => i.id !== incident.id)?.id ?? null);
  };

  const logCall = (report: PhoneReport) => {
    selectIncident(source.reportPhoneCall(report));
    setCallOpen(false);
  };

  const broadcastPanel = (
    <div className="w-64 space-y-3 p-1">
      <p className="text-xs text-muted m-0 leading-relaxed">{t('radiusSliderDesc')}</p>
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-ink-2 font-sans font-medium">{t('radiusSliderTitle')}</span>
        <span className="font-bold text-brand" dir="ltr">
          {radiusM} m
        </span>
      </div>
      <Slider
        min={500}
        max={20000}
        step={500}
        value={radiusM}
        onChange={setRadiusM}
      />
      <Button
        type="primary"
        block
        size="small"
        icon={<SendOutlined />}
        onClick={broadcast}
      >
        {t('broadcastConfirm')}
      </Button>
    </div>
  );

  const steps = [
    {
      key: 'confirm',
      done: confirmed,
      label: t('actions.confirm'),
      icon: <SafetyCertificateOutlined />,
      onClick: confirmCrash,
    },
    {
      key: 'ambulance',
      done: assigned,
      label: assigned
        ? `${t('assignedAmbulance')} · ${ambulance?.unit ?? incident?.dispatch.ambulanceId}`
        : t('actions.assignAmbulance'),
      icon: <CarOutlined />,
      onClick: () => setAmbulancesOpen(true),
    },
  ];
  const nextStep = steps.find((s) => !s.done)?.key;
  const availableAmbulancesCount = ambulances.filter(
    (a) => a.status === 'available'
  ).length;

  return (
    <div className="h-screen overflow-hidden bg-bg flex flex-col text-ink text-sm">
      {/* Unified 56px Top Navigation Bar */}
      <header className="h-14 shrink-0 px-6 flex items-center justify-between gap-4 border-b border-border bg-surface z-30">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-base tracking-tight text-ink shrink-0">
            {tCommon('brand')}
          </span>
          <span className="h-5 w-px bg-border-strong shrink-0" />
          <span className="text-sm font-medium text-ink-2 truncate">
            {tw('title')}
          </span>
          <span className="hidden lg:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-brand-subtle border border-brand/25 text-xs font-medium text-brand whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
            <span>{tw('available', { count: availableAmbulancesCount })}</span>
          </span>
        </div>

        <Segmented
          value="responder"
          onChange={(role) => {
            if (role === 'hospital') router.push(`/${locale}/hospital`);
            if (role === 'breakdown') router.push(`/${locale}/breakdown`);
          }}
          options={[
            { label: tHospital('roleResponder'), value: 'responder' },
            { label: tHospital('roleHospital'), value: 'hospital' },
            { label: tHospital('roleBreakdown'), value: 'breakdown' },
          ]}
        />

        <div className="flex items-center justify-end gap-2.5 shrink-0">
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

      {alertZone?.deadZone && (
        <ZoneAlert
          zone={alertZone.deadZone}
          onWarn={(message) => source.warnDriver(alertZone.id, message)}
          onAcknowledge={() => source.acknowledge(alertZone.id)}
        />
      )}

      {/* Main 3-Column Dispatch Workspace */}
      <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
        {/* =========================================================
            LEFT RAIL: INCIDENT QUEUE & SOLIDARITY NETWORK SUMMARY
            ========================================================= */}
        <aside
          className="w-80 shrink-0 flex flex-col rounded-lg bg-surface border border-border shadow-1 overflow-hidden"
          aria-label={t('queueTitle')}
        >
          <div className="p-3.5 border-b border-border space-y-2.5 bg-surface">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink m-0">
                {t('queueTitle')}
              </h2>
              <span className="px-2 py-0.5 rounded-sm bg-surface-2 border border-border font-mono text-xs font-semibold text-ink-2 tabular-nums">
                {queue.length}
              </span>
            </div>

            <Button
              block
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCallOpen(true)}
            >
              {t('call.open')}
            </Button>

            <Segmented
              block
              size="small"
              value={queueFilter}
              onChange={(val) => setQueueFilter(val as QueueFilter)}
              options={[
                { label: t('filterAll'), value: 'all' },
                { label: t('filterNeedsAction'), value: 'needs_action' },
                { label: t('filterDispatched'), value: 'dispatched' },
              ]}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {queue.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <p className="text-xs text-muted m-0">{t('noIncidents')}</p>
              </div>
            ) : (
              queue.map((item) => {
                const itemLevel = worst(item);
                const selected = item.id === activeIncidentId;
                const originKey = item.deadZone
                  ? 'zone'
                  : item.phoneReport
                  ? 'phone'
                  : 'blackbox';

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={selected}
                    onClick={() => selectIncident(item.id)}
                    className={`relative w-full text-start rounded-md p-3 border transition-all duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                      selected
                        ? 'border-brand bg-brand-subtle shadow-1 ps-4'
                        : 'border-border bg-surface hover:bg-surface-2 hover:border-border-strong'
                    }`}
                  >
                    {selected && (
                      <span
                        className="absolute inset-y-2 start-1 w-1 rounded-full bg-brand"
                        aria-hidden="true"
                      />
                    )}

                    {/* Top meta row: Confidence dot + Origin + Time + Channel */}
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              CONFIDENCE_COLOR[item.confidence.status],
                          }}
                        />
                        <span className="font-medium text-ink-2 truncate">
                          {t(`origin.${originKey}`)}
                        </span>
                      </span>

                      <span
                        className="flex items-center gap-1.5 font-mono text-[11px] text-muted shrink-0 tabular-nums"
                        dir="ltr"
                      >
                        <span>
                          {new Date(item.createdAt).toLocaleTimeString(locale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {item.channel === 'data' ? (
                          <WifiOutlined className="text-brand" />
                        ) : (
                          <MessageOutlined className="text-sev-medium" />
                        )}
                      </span>
                    </span>

                    {/* Road Label */}
                    <span className="mt-1.5 block truncate text-sm font-semibold text-ink">
                      {item.position.roadLabel}
                    </span>

                    {/* Scenario Badge (Isolated vs Multi-Witness) */}
                    {item.scenarioKind === 'isolated' && (
                      <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-sev-medium/15 border border-sev-medium text-[10px] font-semibold text-ink">
                        {tw('isolatedBadge')}
                      </span>
                    )}
                    {item.scenarioKind === 'multi_witness' && (
                      <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/35 text-[10px] font-semibold text-sev-extreme">
                        {tw('witnessesConfirmedBadge', {
                          count: item.witnessCount ?? 5,
                        })}
                      </span>
                    )}

                    {/* Bottom tags row: Severity + Lifecycle + Confidence score */}
                    <span className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {itemLevel && (
                          <SeverityTag
                            severity={itemLevel}
                            size="small"
                            showIcon={false}
                          />
                        )}
                        <StatusTag status={item.lifecycle} size="small" />
                      </span>
                      <span
                        className="font-mono text-[11px] font-bold text-ink-2 tabular-nums shrink-0"
                        dir="ltr"
                      >
                        C{item.confidence.score}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Solidarity Network Summary Footer */}
          <div className="px-3.5 py-3 border-t border-border bg-surface-2/60 shrink-0">
            <div className="text-xs font-semibold text-ink-2 mb-2">
              {t('helpersSummary')}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="px-2.5 py-1.5 rounded-sm bg-surface border border-border">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--sev-extreme)' }}
                  />
                  <span className="font-mono text-sm font-bold text-sev-extreme tabular-nums">
                    {solidarityCounts.medics}
                  </span>
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {t('kind.helper_medic')}
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded-sm bg-surface border border-border">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--sev-high)' }}
                  />
                  <span className="font-mono text-sm font-bold text-ink tabular-nums">
                    {solidarityCounts.firstAiders}
                  </span>
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {t('kind.helper_first_aider')}
                </div>
              </div>
              <div className="px-2.5 py-1.5 rounded-sm bg-surface border border-border">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--brand)' }}
                  />
                  <span className="font-mono text-sm font-bold text-ink tabular-nums">
                    {solidarityCounts.volunteers}
                  </span>
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {t('kind.volunteer')}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* =========================================================
            CENTER WORKSPACE: MAP STAGE & VICTIMS TRIAGE DECK
            ========================================================= */}
        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Map Stage Viewport */}
          <section
            className={`${
              mapFullscreen
                ? 'fixed inset-0 z-50'
                : 'relative flex-1 min-h-0 rounded-lg border border-border-strong'
            } overflow-hidden bg-stage-bg shadow-2`}
          >
            <div className="absolute inset-0">
              <MiniMap
                incident={incident}
                ambulances={ambulances}
                isPip={false}
                trackAmbulance={trackAmbulance}
                onDisableTracking={() => setTrackAmbulance(false)}
              />
            </div>

            {/* Fullscreen Toggle Button (always available even if no incident selected) */}
            <button
              type="button"
              onClick={() => setMapFullscreen((prev) => !prev)}
              aria-label={mapFullscreen ? 'Exit full screen' : 'Full screen'}
              className="absolute bottom-3.5 start-3.5 z-20 px-3 py-1.5 rounded-md bg-stage-bg/90 backdrop-blur-md border border-white/15 text-stage-ink hover:border-white/35 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-2"
            >
              {mapFullscreen ? (
                <FullscreenExitOutlined />
              ) : (
                <FullscreenOutlined />
              )}
              <span>{t('pipMap')}</span>
            </button>

            {!incident ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pointer-events-none">
                <div className="px-5 py-3 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-white/12 text-stage-ink text-sm font-medium shadow-2">
                  {t('selectIncidentPrompt')}
                </div>
              </div>
            ) : (
              <>
                {/* Top HUD Row */}
                <div className="absolute top-3.5 inset-x-3.5 z-10 flex items-start justify-between gap-3 pointer-events-none">
                  {/* Start HUD: Live Ambulance Tracking & Scenario Status */}
                  <div className="pointer-events-auto flex flex-col gap-2 max-w-xs">
                    {incident.scenarioKind === 'isolated' && (
                      <div className="px-3 py-1.5 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-sev-medium/50 text-stage-ink text-xs font-semibold shadow-2 flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--sev-medium)' }}
                        />
                        <span>{tw('isolatedBadge')}</span>
                      </div>
                    )}
                    {incident.scenarioKind === 'multi_witness' && (
                      <div className="px-3 py-1.5 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-sev-extreme/60 text-stage-ink text-xs font-semibold shadow-2 flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--sev-extreme)' }}
                        />
                        <span>
                          {tw('witnessesConfirmedBadge', {
                            count: incident.witnessCount ?? 5,
                          })}
                        </span>
                      </div>
                    )}

                    {ambulance && (
                      <div className="p-3 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-white/12 shadow-2 space-y-2 text-stage-ink">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold font-mono text-stage-ink truncate">
                              🚑 {ambulance.unit}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-sm bg-white/10 font-mono text-[10px] font-semibold text-stage-ink">
                              {tStatus(ambulance.status)}
                            </span>
                          </div>
                          <span
                            className="font-mono text-xs font-bold text-stage-route tabular-nums shrink-0"
                            dir="ltr"
                          >
                            {tw('unitSpeed', {
                              speed: ambulance.speedKmh ?? 0,
                            })}
                          </span>
                        </div>

                        {/* Route Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-stage-muted">
                            <span>{tw('routeProgress')}</span>
                            <span
                              className="font-mono font-bold text-stage-ink tabular-nums"
                              dir="ltr"
                            >
                              {incident.dispatch.routeProgressPct ??
                                ambulance.routeProgressPct ??
                                0}
                              %
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-base"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    incident.dispatch.routeProgressPct ??
                                      ambulance.routeProgressPct ??
                                      0
                                  )
                                )}%`,
                                backgroundColor: 'var(--stage-route)',
                              }}
                            />
                          </div>
                        </div>

                        <Button
                          size="small"
                          type={trackAmbulance ? 'primary' : 'default'}
                          block
                          icon={<AimOutlined />}
                          onClick={() => setTrackAmbulance((prev) => !prev)}
                          className="text-xs font-semibold"
                        >
                          {trackAmbulance
                            ? tw('trackingActive')
                            : tw('trackUnitBtn')}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* End HUD: Stage KPIs + Fullscreen Toggle */}
                  <div className="flex items-start gap-2">
                    <StageKpi
                      label={tw('etaScene')}
                      value={
                        assigned ? minutes(incident.dispatch.etaToSceneS) : '--'
                      }
                      unit="min"
                      tone="var(--stage-route)"
                    />
                    <StageKpi
                      label={tw('etaHospital')}
                      value={
                        assigned
                          ? minutes(incident.dispatch.etaToHospitalS)
                          : '--'
                      }
                      unit="min"
                    />
                    <StageKpi
                      label={tw('helpersOnWay')}
                      value={String(helpers.filter((h) => h.accepted).length)}
                    />
                    <button
                      type="button"
                      onClick={() => setMapFullscreen((prev) => !prev)}
                      aria-label={
                        mapFullscreen ? 'Exit full screen' : 'Full screen'
                      }
                      className="pointer-events-auto h-10 w-10 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-white/12 text-stage-ink hover:border-white/35 transition-colors flex items-center justify-center shadow-2 shrink-0"
                    >
                      {mapFullscreen ? (
                        <FullscreenExitOutlined className="text-sm" />
                      ) : (
                        <FullscreenOutlined className="text-sm" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom HUD Row */}
                {incident.channel === 'sms' && (
                  <div className="absolute bottom-3.5 inset-x-3.5 z-10 flex items-end justify-start gap-3 pointer-events-none">
                    <div className="pointer-events-auto max-w-md rounded-lg bg-stage-bg/90 backdrop-blur-md px-3.5 py-2.5 text-xs text-stage-ink border border-sev-medium/50 shadow-2">
                      {t('smsOnly')}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Victims & Triage Deck */}
          {incident && (
            <section className="shrink-0 rounded-lg bg-surface border border-border shadow-1 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-surface-2/50 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-ink m-0">
                  {tw('victimsTitle')}
                </h3>
                <span className="px-2 py-0.5 rounded-sm bg-surface border border-border font-mono text-xs font-medium text-ink-2">
                  {tw('victims', { count: incident.occupants.length })}
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto divide-y divide-border">
                {incident.occupants.map((o) => (
                  <div
                    key={o.id}
                    className="px-4 py-2.5 flex flex-wrap xl:grid xl:grid-cols-[minmax(140px,1.2fr)_auto_auto_minmax(190px,1.4fr)_auto] items-center justify-between gap-3 hover:bg-surface-2/40 transition-colors"
                  >
                    {/* 1. Occupant Identity & Profile */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-1 h-7 rounded-full shrink-0"
                        style={{ backgroundColor: SEVERITY_COLOR[o.m3.level] }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink truncate">
                            {o.label}
                          </span>
                          {o.profile.bloodType && (
                            <span className="px-1.5 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/30 font-mono text-[11px] font-bold text-sev-extreme leading-none">
                              {o.profile.bloodType}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {o.profile.ageYears > 0 &&
                            `${tHospital('ageValue', {
                              age: o.profile.ageYears,
                            })} · `}
                          {tHospital(
                            o.profile.sex === 'm' ? 'male' : 'female'
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. M3 Severity & Ranking Score */}
                    <div className="flex items-center gap-2 shrink-0">
                      <SeverityTag
                        severity={o.m3.level}
                        size="small"
                        rankingScore={o.m3.probability}
                      />
                    </div>

                    {/* 3. START Triage Color Selector */}
                    <div
                      className="flex items-center gap-1.5 p-1 rounded-md bg-surface-2 border border-border shrink-0"
                      role="radiogroup"
                      aria-label={tw('triage')}
                    >
                      {TRIAGE.map((color) => {
                        const isChecked = o.triageColor === color;
                        return (
                          <Tooltip
                            key={color}
                            title={tw(`triageColor.${color}`)}
                          >
                            <button
                              type="button"
                              role="radio"
                              aria-checked={isChecked}
                              aria-label={tw(`triageColor.${color}`)}
                              onClick={() =>
                                source.setTriage(incident.id, o.id, color)
                              }
                              className={`w-6 h-6 rounded-sm transition-all flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                                isChecked
                                  ? 'ring-2 ring-ink scale-105 opacity-100 shadow-1'
                                  : 'opacity-35 hover:opacity-75'
                              }`}
                              style={{ backgroundColor: TRIAGE_COLOR[color] }}
                            >
                              {isChecked && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              )}
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>

                    {/* 4. Receiving Hospital Assignment */}
                    <div className="min-w-[180px]">
                      <Select
                        size="small"
                        className="w-full"
                        value={
                          o.hospitalId ??
                          incident.dispatch.hospitalId ??
                          incident.hospitalOptions[0]?.id
                        }
                        onChange={(id) =>
                          source.assignHospital(incident.id, o.id, id)
                        }
                        options={incident.hospitalOptions.map((h) => ({
                          value: h.id,
                          label: `${h.name} · ${h.freeBeds} ${t('freeBeds')}`,
                        }))}
                      />
                    </div>

                    {/* 5. Open Digital Twin */}
                    <div className="text-end shrink-0">
                      <Button
                        size="small"
                        type="default"
                        onClick={() => router.push(`/${locale}/hospital`)}
                        className="text-xs font-semibold"
                      >
                        <span>{tw('digitalTwin')}</span>
                        <ArrowRightOutlined className="ms-1 text-[10px] rtl:rotate-180" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* =========================================================
            RIGHT RAIL: INCIDENT DOSSIER, ACTIONS, HELPERS & LOGS
            ========================================================= */}
        <aside className="w-96 shrink-0 flex flex-col rounded-lg bg-surface border border-border shadow-1 overflow-hidden">
          {!incident ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                variant="incidents"
                title={t('queueTitle')}
                description={t('selectIncidentPrompt')}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
              {/* Compact Incident Dossier Header */}
              <div className="p-3 bg-surface space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded-sm bg-surface-2 border border-border font-mono text-[11px] font-semibold text-ink-2 shrink-0">
                      {incident.id}
                    </span>
                    {level && <SeverityTag severity={level} size="small" />}
                  </div>
                  <StatusTag
                    status={incident.lifecycle}
                    size="small"
                    channel={incident.channel}
                  />
                </div>

                <h1 className="text-sm font-bold leading-snug tracking-tight text-ink m-0 truncate">
                  {incident.position.roadLabel}
                </h1>

                <ConfidenceLadder
                  score={incident.confidence.score}
                  status={incident.confidence.status}
                  compact
                />

                {/* 5-Step Lifecycle Progress Bar */}
                <ol
                  className="grid grid-cols-5 gap-1 m-0 list-none"
                  aria-label={tw('progress')}
                >
                  {LIFECYCLE.map((status, i) => {
                    const isDone = i <= stepIndex;
                    const isCurrent = i === stepIndex;
                    return (
                      <li key={status} className="flex flex-col gap-0.5">
                        <span
                          className={`h-1 rounded-full transition-colors ${
                            isDone
                              ? 'bg-brand'
                              : 'bg-surface-2 border border-border'
                          }`}
                        />
                        <span
                          className={`text-[9px] leading-tight truncate ${
                            isCurrent ? 'font-semibold text-ink' : 'text-muted'
                          }`}
                        >
                          {tStatus(status)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Compact Dispatch Actions */}
              <div className="p-3 bg-surface-2/35 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {steps.map((step) => (
                    <Button
                      key={step.key}
                      block
                      size="small"
                      type={step.key === nextStep ? 'primary' : 'default'}
                      icon={
                        step.done ? (
                          <CheckCircleFilled className="text-brand" />
                        ) : (
                          step.icon
                        )
                      }
                      disabled={step.key === 'confirm' && step.done}
                      onClick={step.onClick}
                      className="font-semibold text-xs px-2 truncate"
                    >
                      <span className="truncate">{step.label}</span>
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <Tooltip
                    title={
                      contact ? `${contact.label} · ${contact.phone}` : undefined
                    }
                  >
                    <Button
                      size="small"
                      icon={<PhoneOutlined />}
                      onClick={() => source.callContact(incident.id, 'driver')}
                      className="text-xs px-2 truncate"
                    >
                      {tw('callDriverShort')}
                    </Button>
                  </Tooltip>

                  <Popover
                    content={broadcastPanel}
                    trigger="click"
                    open={broadcastOpen}
                    onOpenChange={setBroadcastOpen}
                  >
                    <Button
                      size="small"
                      icon={<TeamOutlined />}
                      className="text-xs px-2 truncate"
                    >
                      {t('actions.callForHelp')}
                    </Button>
                  </Popover>

                  <Popconfirm
                    title={t('closeConfirmTitle')}
                    description={t('closeConfirmDesc')}
                    onConfirm={closeMission}
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      className="text-xs px-2 truncate"
                    >
                      {t('actions.close')}
                    </Button>
                  </Popconfirm>
                </div>

                {incident.yellowLineDrivers !== undefined && (
                  <div className="rounded-md bg-sev-medium/15 border border-sev-medium px-2.5 py-1.5 text-xs font-semibold text-ink flex items-center gap-2">
                    <CarOutlined className="text-sev-high shrink-0" />
                    <span>
                      {t('yellowLine', { count: incident.yellowLineDrivers })}
                    </span>
                  </div>
                )}
              </div>

              {/* Tabbed Dossier Workspace (Hospitals / Helpers / Timeline / SMS) */}
              <div className="px-3.5 py-2">
                <Tabs
                  size="small"
                  defaultActiveKey="hospitals"
                  items={[
                    {
                      key: 'hospitals',
                      label: tw('hospitalsSectionTitle'),
                      children: (
                        <div className="space-y-2 pb-2">
                          {incident.hospitalOptions.map((h) => {
                            const isSelected =
                              incident.dispatch.hospitalId === h.id;
                            const capStatus: HospitalCapacityStatus =
                              h.capacityStatus ?? 'optimal';
                            const capColor = CAPACITY_COLOR[capStatus];
                            const etaMin = Math.max(
                              1,
                              Math.round(h.etaSeconds / 60)
                            );
                            const shortName = h.name.replace(
                              /\s*\(seed\)\s*/i,
                              ''
                            );

                            return (
                              <div
                                key={h.id}
                                className={`p-2.5 rounded-md border transition-all flex items-center justify-between gap-2.5 ${
                                  isSelected
                                    ? 'border-brand bg-brand-subtle/40 shadow-1'
                                    : h.recommended
                                    ? 'border-brand/50 bg-surface'
                                    : 'border-border bg-surface hover:border-border-strong'
                                }`}
                              >
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <MedicineBoxFilled className="text-brand text-xs shrink-0" />
                                    <span className="text-xs font-bold text-ink truncate">
                                      {shortName}
                                    </span>
                                    {h.recommended && (
                                      <StarFilled className="text-brand text-[11px] shrink-0" />
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-surface-2 border border-border text-[10px] font-semibold text-ink">
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: capColor }}
                                      />
                                      <span>
                                        {tw(`hospitalCapacity.${capStatus}`)}
                                      </span>
                                    </span>
                                    <span
                                      className="font-mono text-muted tabular-nums"
                                      dir="ltr"
                                    >
                                      {h.freeBeds} {t('freeBeds')} · {etaMin}m
                                    </span>
                                  </div>
                                </div>

                                <Tooltip
                                  title={
                                    capStatus === 'divert'
                                      ? tw('diversionWarning')
                                      : undefined
                                  }
                                >
                                  <Button
                                    size="small"
                                    type={isSelected ? 'primary' : 'default'}
                                    disabled={
                                      capStatus === 'divert' && !isSelected
                                    }
                                    icon={
                                      isSelected ? (
                                        <CheckCircleFilled />
                                      ) : (
                                        <CarOutlined />
                                      )
                                    }
                                    onClick={() => dispatchUnitToHospital(h.id)}
                                    className="text-xs font-semibold shrink-0"
                                  >
                                    {isSelected
                                      ? tw('dispatchedToHospital')
                                      : tw('dispatchUnitToHospital')}
                                  </Button>
                                </Tooltip>
                              </div>
                            );
                          })}
                        </div>
                      ),
                    },
                    {
                      key: 'helpers',
                      label: `${t('helpersTitle')} (${helpers.length})`,
                      children: (
                        <div className="pb-2">
                          <SectionHeader
                            title={t('helpersTitle')}
                            extra={
                              <button
                                type="button"
                                className="text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
                                onClick={() => setBroadcastOpen(true)}
                              >
                                {tw('widen')}
                              </button>
                            }
                          />
                          {helpers.length === 0 ? (
                            <p className="text-xs text-muted m-0 leading-relaxed">
                              {tw('noHelpers')}
                            </p>
                          ) : (
                            <ul className="space-y-2 m-0 p-0 list-none">
                              {helpers.map((person) => {
                                const isMedic = person.kind === 'helper_medic';
                                return (
                                  <li
                                    key={person.id}
                                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border ${
                                      isMedic
                                        ? 'bg-sev-extreme-subtle/35 border-sev-extreme/35'
                                        : 'bg-surface-2/70 border-border'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{
                                            backgroundColor: isMedic
                                              ? 'var(--sev-extreme)'
                                              : person.kind ===
                                                'helper_first_aider'
                                              ? 'var(--sev-high)'
                                              : 'var(--brand)',
                                          }}
                                        />
                                        <span className="text-xs font-semibold text-ink truncate">
                                          {person.name ??
                                            t(`kind.${person.kind}`)}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-muted ps-3.5 mt-0.5">
                                        {t(`kind.${person.kind}`)} ·{' '}
                                        <span
                                          className="font-mono font-semibold text-ink-2 tabular-nums"
                                          dir="ltr"
                                        >
                                          {person.distanceM} m
                                        </span>
                                      </div>
                                    </div>

                                    {person.confirmed ? (
                                      <span className="px-2 py-0.5 rounded-sm bg-brand-subtle border border-brand/30 text-brand text-[11px] font-semibold shrink-0">
                                        {tw('cardsSentShort')}
                                      </span>
                                    ) : person.accepted ? (
                                      <Button
                                        size="small"
                                        type="primary"
                                        onClick={() =>
                                          source.confirmHelper(
                                            incident.id,
                                            person.id
                                          )
                                        }
                                        className="text-xs shrink-0"
                                      >
                                        {tw('confirmHelperShort')}
                                      </Button>
                                    ) : (
                                      <Button
                                        size="small"
                                        icon={<PhoneOutlined />}
                                        disabled={person.called}
                                        onClick={() =>
                                          source.callVolunteer(
                                            incident.id,
                                            person.id
                                          )
                                        }
                                        className="text-xs shrink-0"
                                      >
                                        {t(
                                          person.called
                                            ? 'volunteerCalling'
                                            : 'callVolunteer'
                                        )}
                                      </Button>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'timeline',
                      label: t('timelineTitle'),
                      children: (
                        <TimelineList events={incident.timeline} bare />
                      ),
                    },
                    {
                      key: 'sms',
                      label: 'SMS',
                      children: (
                        <SmsFeed
                          messages={incident.sms}
                          networkOnline={online}
                          bare
                        />
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      <Drawer
        open={ambulancesOpen}
        onClose={() => setAmbulancesOpen(false)}
        title={t('ambulanceDrawerTitle')}
        placement={rtl ? 'left' : 'right'}
        width={520}
      >
        <AmbulanceTable
          ambulances={ambulances}
          assignedId={incident?.dispatch.ambulanceId}
          onAssign={assignAmbulance}
        />
      </Drawer>

      <NewCallModal
        open={callOpen}
        onClose={() => setCallOpen(false)}
        onSubmit={logCall}
      />
    </div>
  );
}

export default ResponderApp;
