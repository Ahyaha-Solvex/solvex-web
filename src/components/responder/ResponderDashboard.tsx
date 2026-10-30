'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Segmented,
  Tag,
  Alert,
  Popover,
  Slider,
  Popconfirm,
  Drawer,
  notification,
} from 'antd';
import {
  CarOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
  CloseCircleOutlined,
  AlertOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useTranslations, useLocale } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useIncidentSource } from '@/components/app/SourceProvider';
import type { Incident } from '@/lib/data/types';

import { SimBadge } from '@/components/app/SimBadge';
import { SeverityTag } from '@/components/app/SeverityTag';
import { StatusTag } from '@/components/app/StatusTag';
import { ConfidenceLadder } from '@/components/app/ConfidenceLadder';
import { IncidentRow } from '@/components/app/IncidentRow';
import { HospitalOptionCard } from '@/components/app/HospitalOptionCard';
import { AmbulanceTable } from '@/components/app/AmbulanceTable';
import { TimelineList } from '@/components/app/TimelineList';
import { SmsFeed } from '@/components/app/SmsFeed';
import { NearbyPeopleList } from '@/components/app/NearbyPeopleList';
import { EmptyState } from '@/components/app/EmptyState';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { StageFrame } from '@/components/stage/StageFrame';
import { ReplayControls } from '@/components/stage/ReplayControls';
import { TelemetryReadout } from '@/components/stage/TelemetryReadout';
import { TelemetryTrace } from '@/components/stage/TelemetryTrace';

// Dynamically load 3D and Map components with ssr: false (Rule 11)
const CrashScene = dynamic(() => import('@/components/stage/CrashScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-[#8FA097] font-mono text-xs">
      Loading 3D Crash Scene...
    </div>
  ),
});

const MiniMap = dynamic(() => import('@/components/stage/MiniMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-[#8FA097] font-mono text-xs">
      Loading Map...
    </div>
  ),
});

export function ResponderDashboard() {
  const t = useTranslations('responder');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const { incidents, activeIncidentId, ambulances, online, selectIncident } =
    useIncidentStore();
  const source = useIncidentSource();

  const activeIncident: Incident | null = activeIncidentId
    ? incidents[activeIncidentId] ?? null
    : null;

  // View state: 3D Scene vs Map swap
  const [stageView, setStageView] = useState<'scene' | 'map'>('scene');

  // Left Queue Filter
  const [queueFilter, setQueueFilter] = useState<'all' | 'needs_action' | 'dispatched'>('all');

  // Dispatcher Actions UI state
  const [ambulanceDrawerOpen, setAmbulanceDrawerOpen] = useState(false);
  const [callHelpOpen, setCallHelpOpen] = useState(false);
  const [broadcastRadiusM, setBroadcastRadiusM] = useState(2000);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Filter & sort incident queue: confidence score desc, then newest createdAt desc
  const filteredIncidents = useMemo(() => {
    const list = Object.values(incidents);
    return list
      .filter((inc) => {
        if (queueFilter === 'needs_action') {
          return inc.confidence.status !== 'confirmed' || inc.lifecycle === 'detected';
        }
        if (queueFilter === 'dispatched') {
          return inc.lifecycle === 'dispatched' || !!inc.dispatch.ambulanceId;
        }
        return true;
      })
      .sort((a, b) => {
        if (b.confidence.score !== a.confidence.score) {
          return b.confidence.score - a.confidence.score;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [incidents, queueFilter]);

  // Nearby helpers summary counts
  const helpersSummary = useMemo(() => {
    if (!activeIncident || !activeIncident.nearbyPeople) {
      return { medics: 0, firstAiders: 0, volunteers: 0 };
    }
    let medics = 0;
    let firstAiders = 0;
    let volunteers = 0;

    for (const p of activeIncident.nearbyPeople) {
      if (p.kind === 'helper_medic') medics++;
      else if (p.kind === 'helper_first_aider') firstAiders++;
      else volunteers++;
    }
    return { medics, firstAiders, volunteers };
  }, [activeIncident]);

  // Dispatcher Actions
  const handleConfirmCrash = () => {
    if (!activeIncident) return;
    source.confirm(activeIncident.id);
    notification.success({
      message: t('actions.confirm'),
      description: `${activeIncident.position.roadLabel} · Status updated to Confirmed`,
      placement: locale === 'ar' ? 'topLeft' : 'topRight',
    });
  };

  const handleAssignAmbulance = (ambulanceId: string) => {
    if (!activeIncident) return;
    source.assignAmbulance(activeIncident.id, ambulanceId);
    setAmbulanceDrawerOpen(false);
    notification.success({
      message: t('actions.assignAmbulance'),
      description: `Ambulance ${ambulanceId} dispatched to incident.`,
      placement: locale === 'ar' ? 'topLeft' : 'topRight',
    });
  };

  const handleBroadcastHelp = () => {
    if (!activeIncident) return;
    source.callForHelp(activeIncident.id, broadcastRadiusM);
    setCallHelpOpen(false);
    notification.info({
      message: t('actions.callForHelp'),
      description: `Solidarity alert broadcasted within ${broadcastRadiusM}m radius.`,
      placement: locale === 'ar' ? 'topLeft' : 'topRight',
    });
  };

  const handleCloseMission = () => {
    if (!activeIncident) return;
    source.close(activeIncident.id);
    notification.warning({
      message: t('actions.close'),
      description: `Mission ${activeIncident.id} closed.`,
      placement: locale === 'ar' ? 'topLeft' : 'topRight',
    });
  };

  const handleRoleChange = (role: string) => {
    if (role === 'hospital') {
      router.push(`/${locale}/hospital`);
    }
  };

  const isDegraded = activeIncident?.channel === 'sms' || !activeIncident?.telemetry;

  return (
    <div className="min-h-screen bg-surface-2 flex flex-col text-ink">
      {/* 1. TOP BAR (56px) - Rule 6 & SPEC */}
      <header className="h-14 bg-surface border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brand animate-pulse" />
            <span className="font-bold text-base tracking-tight text-ink">
              {tCommon('brand')}
            </span>
          </div>
          <Tag color="red" className="m-0 font-mono text-[10px] uppercase font-bold tracking-wider">
            Protection Civile
          </Tag>
        </div>

        {/* Center: Role Switcher (Ant Segmented) */}
        <div className="hidden sm:block">
          <Segmented
            value="responder"
            onChange={(val) => handleRoleChange(val as string)}
            options={[
              { label: t('title'), value: 'responder' },
              { label: 'Hôpital (ER)', value: 'hospital' },
            ]}
            className="bg-surface-elevated border border-border shadow-xs text-xs font-medium"
          />
        </div>

        {/* Right: Language Select & SimBadge */}
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <SimBadge />
        </div>
      </header>

      {/* 2. OFFLINE BANNER (SPEC_RESPONDER line 34) */}
      {!online && (
        <Alert
          type="warning"
          banner
          showIcon
          message={
            <span className="text-xs font-semibold">
              Network off — SMS mode: Blackbox telemetry unreachable. Degrading to 160-char raw emergency feeds.
            </span>
          }
          className="border-b border-border shadow-xs"
        />
      )}

      {/* Responsive mobile buttons (< 1280px) */}
      <div className="xl:hidden flex items-center justify-between bg-surface border-b border-border px-4 py-2 text-xs">
        <Button
          size="small"
          icon={<TeamOutlined />}
          onClick={() => setMobileQueueOpen(true)}
        >
          {t('queueTitle')} ({filteredIncidents.length})
        </Button>
        <Button
          size="small"
          type="primary"
          icon={<AlertOutlined />}
          disabled={!activeIncident}
          onClick={() => setMobileDetailOpen(true)}
        >
          Incident Details
        </Button>
      </div>

      {/* 3. MAIN THREE-COLUMN WORKSPACE (≥1280: Left 320, Stage Flex, Right 392) */}
      <div className="flex-1 flex flex-col xl:flex-row p-4 gap-4 max-w-[1920px] mx-auto w-full">
        {/* =========================================================
            LEFT RAIL (320px) — INCIDENT QUEUE
            ========================================================= */}
        <div className="hidden xl:flex w-[320px] shrink-0 flex-col gap-3">
          <Card
            size="small"
            className="bg-surface border-border shadow-1 flex-1 flex flex-col"
            styles={{ body: { padding: '12px', display: 'flex', flexDirection: 'column', height: '100%' } }}
          >
            {/* Queue Header & Filters */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <TeamOutlined className="text-brand" />
                  {t('queueTitle')}
                </span>
                <span className="font-mono text-xs text-muted font-semibold">
                  {filteredIncidents.length}
                </span>
              </div>

              <Segmented
                block
                size="small"
                value={queueFilter}
                onChange={(val) => setQueueFilter(val as 'all' | 'needs_action' | 'dispatched')}
                options={[
                  { label: t('filterAll'), value: 'all' },
                  { label: t('filterNeedsAction'), value: 'needs_action' },
                  { label: t('filterDispatched'), value: 'dispatched' },
                ]}
                className="text-[11px]"
              />
            </div>

            {/* Incident Rows List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[calc(100vh-280px)]">
              {filteredIncidents.length === 0 ? (
                <EmptyState
                  title={t('noIncidents')}
                  description="No incidents match the active filter criteria."
                  className="py-8"
                />
              ) : (
                filteredIncidents.map((inc) => (
                  <IncidentRow
                    key={inc.id}
                    incident={inc}
                    selected={inc.id === activeIncidentId}
                    onClick={() => selectIncident(inc.id)}
                  />
                ))
              )}
            </div>

            {/* Nearby Helpers Summary per SPEC_RESPONDER line 10 */}
            {activeIncident && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-[11px] font-bold text-ink mb-2">
                  {t('helpersSummary')}
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-1.5 rounded bg-surface-2 border border-border">
                    <div className="flex items-center justify-center gap-1 text-[#FF4D5E]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D5E]" />
                      <span className="font-mono text-xs font-bold">{helpersSummary.medics}</span>
                    </div>
                    <span className="text-[9px] text-muted block truncate">{t('medicsCount')}</span>
                  </div>
                  <div className="p-1.5 rounded bg-surface-2 border border-border">
                    <div className="flex items-center justify-center gap-1 text-amber-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="font-mono text-xs font-bold">{helpersSummary.firstAiders}</span>
                    </div>
                    <span className="text-[9px] text-muted block truncate">{t('firstAidersCount')}</span>
                  </div>
                  <div className="p-1.5 rounded bg-surface-2 border border-border">
                    <div className="flex items-center justify-center gap-1 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span className="font-mono text-xs font-bold">{helpersSummary.volunteers}</span>
                    </div>
                    <span className="text-[9px] text-muted block truncate">{t('volunteersCount')}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* =========================================================
            CENTER STAGE — TESLA-STYLE 3D SCENE & PIP MAP
            ========================================================= */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <StageFrame
            height="560px"
            overlay={
              <div className="absolute inset-0 p-3 pointer-events-none flex flex-col justify-between">
                {/* Overlay Top Row: View Selector (Top-Start) & Replay Controls (Top-End) */}
                <div className="flex items-center justify-between w-full pointer-events-auto">
                  {/* Top-Start: Segmented Scene | Map Swap */}
                  <Segmented
                    value={stageView}
                    onChange={(val) => setStageView(val as 'scene' | 'map')}
                    options={[
                      { label: t('viewScene'), value: 'scene' },
                      { label: t('viewMap'), value: 'map' },
                    ]}
                    className="bg-[#0B1310]/80 backdrop-blur-md border border-white/10 text-xs font-medium text-white shadow-lg"
                  />

                  {/* Top-End: ReplayControls (Hidden in degraded SMS mode) */}
                  {!isDegraded && stageView === 'scene' && (
                    <ReplayControls />
                  )}
                </div>

                {/* Overlay Bottom Row: TelemetryReadout (Bottom-Start), Trace (Center), MiniMap (Bottom-End) */}
                <div className="flex flex-col sm:flex-row items-end justify-between gap-3 w-full pointer-events-auto">
                  {/* Bottom-Start: Telemetry Readout */}
                  {!isDegraded && stageView === 'scene' ? (
                    <TelemetryReadout
                      crash={activeIncident?.crash}
                      telemetry={activeIncident?.telemetry}
                    />
                  ) : (
                    <div />
                  )}

                  {/* Bottom-Center: Telemetry Trace Strip */}
                  {!isDegraded && stageView === 'scene' && (
                    <div className="hidden lg:block flex-1 max-w-sm xl:max-w-md mx-2">
                      <TelemetryTrace telemetry={activeIncident?.telemetry} />
                    </div>
                  )}

                  {/* Bottom-End: MiniMap PiP (Click swaps with 3D Scene) */}
                  {stageView === 'scene' ? (
                    <MiniMap
                      incident={activeIncident}
                      ambulances={ambulances}
                      isPip={true}
                      onToggleSwap={() => setStageView('map')}
                    />
                  ) : (
                    /* Mini PiP of 3D Scene when Map is active */
                    <div
                      onClick={() => setStageView('scene')}
                      className="w-[240px] h-[160px] rounded-xl overflow-hidden border border-white/20 shadow-2xl cursor-pointer hover:border-white/40 group relative"
                      title="Click to restore 3D Scene"
                    >
                      <CrashScene incident={activeIncident} />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-white border border-white/20">
                        {t('viewScene')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            }
          >
            {/* Center Stage Body: 3D Scene or Full Map */}
            {stageView === 'scene' ? (
              <CrashScene incident={activeIncident} />
            ) : (
              <MiniMap
                incident={activeIncident}
                ambulances={ambulances}
                isPip={false}
              />
            )}
          </StageFrame>

          {/* Prompt if no active incident */}
          {!activeIncident && (
            <Card className="bg-surface border-border text-center py-6">
              <p className="text-sm text-muted">{t('selectIncidentPrompt')}</p>
            </Card>
          )}
        </div>

        {/* =========================================================
            RIGHT RAIL (392px) — INCIDENT DETAILS & ACTIONS
            ========================================================= */}
        <div className="hidden xl:flex w-[392px] shrink-0 flex-col gap-3">
          {activeIncident ? (
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-80px)] pr-1">
              {/* Card 1: Header with Road label, time, Confidence Ladder, StatusTag */}
              <Card size="small" className="bg-surface border-border shadow-1">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-bold text-ink flex items-center gap-1.5">
                        <EnvironmentOutlined className="text-brand" />
                        {activeIncident.position.roadLabel}
                      </h3>
                      <div className="font-mono text-xs text-muted">
                        {new Date(activeIncident.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </div>
                    <StatusTag status={activeIncident.lifecycle} />
                  </div>

                  {/* Confidence Ladder (4 segments) */}
                  <div className="pt-1 border-t border-border/60">
                    <ConfidenceLadder
                      score={activeIncident.confidence.score}
                      status={activeIncident.confidence.status}
                    />
                  </div>
                </div>
              </Card>

              {/* Card 2: 2x2 Dispatcher Actions Grid per SPEC_RESPONDER line 23 */}
              <Card
                size="small"
                title={
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">
                    Dispatcher Actions
                  </span>
                }
                className="bg-surface border-border shadow-1"
              >
                <div className="grid grid-cols-2 gap-2">
                  {/* Action 1: Confirm Crash */}
                  <Button
                    type="primary"
                    icon={<SafetyCertificateOutlined />}
                    disabled={activeIncident.confidence.status === 'confirmed'}
                    onClick={handleConfirmCrash}
                    className="w-full text-xs font-semibold"
                  >
                    {t('actions.confirm')}
                  </Button>

                  {/* Action 2: Assign Ambulance (Opens Drawer) */}
                  <Button
                    icon={<CarOutlined />}
                    onClick={() => setAmbulanceDrawerOpen(true)}
                    className="w-full text-xs font-semibold"
                  >
                    {t('actions.assignAmbulance')}
                  </Button>

                  {/* Action 3: Call for Help (Solidarity Popover with Slider) */}
                  <Popover
                    content={
                      <div className="w-64 space-y-3 p-1">
                        <div className="text-xs font-bold text-ink">
                          {t('radiusSliderTitle')}
                        </div>
                        <p className="text-[11px] text-muted leading-relaxed">
                          {t('radiusSliderDesc')}
                        </p>
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-muted">Radius</span>
                            <span className="font-bold text-brand">{broadcastRadiusM} m</span>
                          </div>
                          <Slider
                            min={500}
                            max={5000}
                            step={250}
                            value={broadcastRadiusM}
                            onChange={(val) => setBroadcastRadiusM(val)}
                          />
                        </div>
                        <Button
                          type="primary"
                          block
                          size="small"
                          icon={<SendOutlined />}
                          onClick={handleBroadcastHelp}
                        >
                          {t('broadcastConfirm')}
                        </Button>
                      </div>
                    }
                    title={null}
                    trigger="click"
                    open={callHelpOpen}
                    onOpenChange={setCallHelpOpen}
                  >
                    <Button
                      icon={<TeamOutlined />}
                      className="w-full text-xs font-semibold"
                    >
                      {t('actions.callForHelp')}
                    </Button>
                  </Popover>

                  {/* Action 4: Close Mission (Popconfirm) */}
                  <Popconfirm
                    title={t('closeConfirmTitle')}
                    description={t('closeConfirmDesc')}
                    onConfirm={handleCloseMission}
                    okText="Close"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      type="text"
                      icon={<CloseCircleOutlined />}
                      className="w-full text-xs font-semibold"
                    >
                      {t('actions.close')}
                    </Button>
                  </Popconfirm>
                </div>
              </Card>

              {/* Card 3: Severity & Triage (M3) */}
              <Card size="small" className="bg-surface border-border shadow-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">
                      {t('triage')}
                    </span>
                    <SeverityTag
                      severity={activeIncident.occupants[0]?.m3.level ?? 'high'}
                      size="large"
                    />
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-border/60">
                    <span className="text-xs text-muted">{t('rankingScore')}</span>
                    <span className="font-mono text-sm font-bold text-ink">
                      {activeIncident.occupants[0]?.m3.probability
                        ? `${(activeIncident.occupants[0].m3.probability * 100).toFixed(0)}%`
                        : '85%'}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted italic leading-snug">
                    {tCommon('medicalDisclaimer')}
                  </p>

                  {/* Per-occupant triage list */}
                  {activeIncident.occupants.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      <div className="text-[11px] font-bold text-ink">
                        {t('occupantsCount')} ({activeIncident.occupants.length})
                      </div>
                      <div className="space-y-1">
                        {activeIncident.occupants.map((occ) => (
                          <div
                            key={occ.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded bg-surface-2"
                          >
                            <span className="font-medium text-ink flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  occ.triageColor === 'red'
                                    ? 'bg-sev-extreme'
                                    : occ.triageColor === 'yellow'
                                    ? 'bg-sev-medium'
                                    : 'bg-brand'
                                }`}
                              />
                              {occ.label}
                            </span>
                            <span className="font-mono text-[11px] text-muted">
                              {occ.profile.bloodType} · {occ.profile.ageYears}y
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Card 4: Dispatch & Hospital Suggestion */}
              <Card
                size="small"
                title={
                  <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <MedicineBoxOutlined className="text-brand" />
                    {t('hospitalSuggestion')}
                  </span>
                }
                className="bg-surface border-border shadow-1"
              >
                <div className="space-y-3">
                  {/* Recommended Hospital Card */}
                  {activeIncident.hospitalOptions?.[0] && (
                    <HospitalOptionCard
                      hospital={activeIncident.hospitalOptions[0]}
                      recommended={true}
                    />
                  )}

                  {/* Alternative Hospitals Table */}
                  {activeIncident.hospitalOptions && activeIncident.hospitalOptions.length > 1 && (
                    <div className="space-y-1 pt-1 border-t border-border/60">
                      <div className="text-[11px] font-bold text-muted">Alternatives</div>
                      <div className="space-y-1">
                        {activeIncident.hospitalOptions.slice(1).map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded bg-surface-2 border border-border"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-ink block">{h.name}</span>
                              <span className="text-[10px] text-muted">
                                {Math.round(h.etaSeconds / 60)} min · {h.freeBeds} {t('freeBeds')}
                              </span>
                            </div>
                            <Button size="small" type="link" className="text-brand text-xs font-semibold p-0">
                              {t('chooseHospital')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Card 5: Incident Timeline */}
              <TimelineList events={activeIncident.timeline} />

              {/* Card 6: SMS Radio & Fallback Feed */}
              <SmsFeed messages={activeIncident.sms} networkOnline={online} />

              {/* Card 7: Nearby People List */}
              <NearbyPeopleList
                people={activeIncident.nearbyPeople}
                onCallHelp={() => setCallHelpOpen(true)}
              />
            </div>
          ) : (
            <EmptyState
              title={t('noIncidents')}
              description="Select an incident from the left queue to view telemetry, dispatch actions, and triage."
            />
          )}
        </div>
      </div>

      {/* Ambulance Fleet Drawer (SPEC_RESPONDER line 23) */}
      <Drawer
        title={t('ambulanceDrawerTitle')}
        placement={locale === 'ar' ? 'left' : 'right'}
        width={460}
        open={ambulanceDrawerOpen}
        onClose={() => setAmbulanceDrawerOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Select an available Protection Civile mobile unit to dispatch to{' '}
            <strong className="text-ink">{activeIncident?.position.roadLabel}</strong>.
          </p>

          <AmbulanceTable
            ambulances={ambulances}
            assignedId={activeIncident?.dispatch.ambulanceId}
            onAssign={handleAssignAmbulance}
          />
        </div>
      </Drawer>

      {/* Mobile Drawers (< 1280px) */}
      <Drawer
        title={t('queueTitle')}
        placement={locale === 'ar' ? 'right' : 'left'}
        width={320}
        open={mobileQueueOpen}
        onClose={() => setMobileQueueOpen(false)}
      >
        <div className="space-y-2">
          {filteredIncidents.map((inc) => (
            <IncidentRow
              key={inc.id}
              incident={inc}
              selected={inc.id === activeIncidentId}
              onClick={() => {
                selectIncident(inc.id);
                setMobileQueueOpen(false);
              }}
            />
          ))}
        </div>
      </Drawer>

      <Drawer
        title="Incident Detail"
        placement={locale === 'ar' ? 'left' : 'right'}
        width={380}
        open={mobileDetailOpen}
        onClose={() => setMobileDetailOpen(false)}
      >
        {activeIncident && (
          <div className="space-y-3">
            <ConfidenceLadder
              score={activeIncident.confidence.score}
              status={activeIncident.confidence.status}
            />
            <TimelineList events={activeIncident.timeline} />
            <SmsFeed messages={activeIncident.sms} networkOnline={online} />
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default ResponderDashboard;
