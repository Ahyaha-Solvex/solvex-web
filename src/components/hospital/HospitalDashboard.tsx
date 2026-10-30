'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Card,
  Tabs,
  Steps,
  Descriptions,
  Tag,
  Alert,
  Statistic,
  Button,
  Segmented,
  Tooltip,
  notification,
} from 'antd';
import {
  CarOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  HeartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useTranslations, useLocale } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useUiStore } from '@/lib/stores/uiStore';
import type { BodyRegion, Occupant, M4Level, LifecycleStatus } from '@/lib/data/types';

import { SimBadge } from '@/components/app/SimBadge';
import { SeverityTag } from '@/components/app/SeverityTag';
import { RegionRow } from '@/components/app/RegionRow';
import { RegionLegend } from '@/components/app/RegionLegend';
import { VitalsCard } from '@/components/app/VitalsCard';
import { PrepChecklist } from '@/components/app/PrepChecklist';
import { EmptyState } from '@/components/app/EmptyState';
import { ScenarioPanel } from '@/components/app/ScenarioPanel';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { StageFrame } from '@/components/stage/StageFrame';

// Dynamically import Body3D with ssr: false per Rule 11
const Body3D = dynamic(() => import('@/components/stage/Body3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-muted font-mono text-xs">
      Loading 3D Body Canvas...
    </div>
  ),
});

export function HospitalDashboard() {
  const t = useTranslations('hospital');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('status');
  const locale = useLocale();
  const router = useRouter();

  const { incidents, activeIncidentId, online } = useIncidentStore();
  const { hoveredRegion, selectedRegion, setHoveredRegion, setSelectedRegion, setScenarioDrawerOpen } =
    useUiStore();

  const activeIncident = activeIncidentId ? incidents[activeIncidentId] : null;

  // Selected occupant tab state
  const [selectedOccupantId, setSelectedOccupantId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'front' | 'back' | 'free'>('front');
  const [resetNonce, setResetNonce] = useState(0);

  // Track previous incident to trigger notification on new arrival
  const prevIncidentIdRef = useRef<string | null>(null);
  const [pulseTabs, setPulseTabs] = useState(false);

  // Sync active occupant when incident changes
  useEffect(() => {
    if (activeIncident && activeIncident.occupants.length > 0) {
      if (!selectedOccupantId || !activeIncident.occupants.find((o) => o.id === selectedOccupantId)) {
        setSelectedOccupantId(activeIncident.occupants[0].id);
      }
    }
  }, [activeIncident, selectedOccupantId]);

  // Check for new incident arrival while page is open (SPEC_HOSPITAL line 32)
  useEffect(() => {
    if (activeIncidentId && prevIncidentIdRef.current && prevIncidentIdRef.current !== activeIncidentId) {
      setPulseTabs(true);
      notification.info({
        message: t('newPatientNotification'),
        description: t('newPatientDesc'),
        placement: locale === 'ar' ? 'topLeft' : 'topRight',
        duration: 4.5,
      });
      const timer = setTimeout(() => setPulseTabs(false), 2000);
      return () => clearTimeout(timer);
    }
    prevIncidentIdRef.current = activeIncidentId;
  }, [activeIncidentId, t, locale]);

  const activeOccupant: Occupant | null = useMemo(() => {
    if (!activeIncident || activeIncident.occupants.length === 0) return null;
    return activeIncident.occupants.find((o) => o.id === selectedOccupantId) ?? activeIncident.occupants[0];
  }, [activeIncident, selectedOccupantId]);

  // Order regions: likely first, then check, then unlikely; tie-break by probability desc
  const sortedRegions = useMemo(() => {
    if (!activeOccupant) return [];
    const allRegions: BodyRegion[] = [
      'head',
      'face',
      'spine_neck',
      'thorax',
      'abdomen',
      'arms',
      'legs',
    ];

    const levelRank: Record<M4Level, number> = {
      likely: 3,
      check: 2,
      unlikely: 1,
    };

    return allRegions
      .map((region) => {
        const data = activeOccupant.m4[region] ?? { level: 'unlikely', probability: 0 };
        return {
          region,
          level: data.level,
          probability: data.probability,
        };
      })
      .sort((a, b) => {
        if (levelRank[b.level] !== levelRank[a.level]) {
          return levelRank[b.level] - levelRank[a.level];
        }
        return b.probability - a.probability;
      });
  }, [activeOccupant]);

  // Lifecycle steps calculation
  const lifecycleStepIndex = useMemo(() => {
    if (!activeIncident) return 0;
    const map: Record<LifecycleStatus, number> = {
      detected: 0,
      dispatched: 1,
      on_scene: 2,
      transporting: 3,
      at_hospital: 4,
      closed: 5,
    };
    return map[activeIncident.lifecycle] ?? 0;
  }, [activeIncident]);

  // Receiving hospital information
  const receivingHospital = useMemo(() => {
    if (!activeIncident || !activeIncident.hospitalOptions?.length) return null;
    const match = activeIncident.hospitalOptions.find(
      (h) => h.id === activeIncident.dispatch?.hospitalId
    );
    return match || activeIncident.hospitalOptions[0];
  }, [activeIncident]);

  const handleRoleChange = (role: string) => {
    if (role === 'responder') {
      router.push(`/${locale}/responder`);
    }
  };

  const handleResetView = () => {
    setViewMode('front');
    setSelectedRegion(null);
    setResetNonce((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-surface-2 flex flex-col text-ink">
      {/* 1. TOP BAR (56px) - Rule 6: brand left, role switch, LangSwitcher, SimBadge */}
      <header className="h-14 bg-surface border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brand animate-pulse" />
            <span className="font-bold text-base tracking-tight text-ink">
              {tCommon('brand')}
            </span>
          </div>
          <Tag color="cyan" className="m-0 font-mono text-[10px] uppercase font-bold tracking-wider">
            {t('roleHospital')}
          </Tag>
        </div>

        {/* Center: Role Switcher (Ant Segmented) */}
        <div className="hidden sm:block">
          <Segmented
            value="hospital"
            onChange={(val) => handleRoleChange(val as string)}
            options={[
              { label: t('roleResponder'), value: 'responder' },
              { label: t('roleHospital'), value: 'hospital' },
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

      {/* 2. OFFLINE BANNER (SPEC_HOSPITAL line 32) */}
      {!online && (
        <Alert
          type="warning"
          banner
          showIcon
          message={
            <span className="text-xs font-semibold">
              {t('offlineBanner')}
            </span>
          }
          className="border-b border-border shadow-xs"
        />
      )}

      {/* 3. PATIENT TAB STRIP (SPEC_HOSPITAL line 6) */}
      {activeIncident && activeIncident.occupants.length > 0 && (
        <div className={`bg-surface border-b border-border px-4 sm:px-6 py-1 ${pulseTabs ? 'animate-pulse' : ''}`}>
          <Tabs
            type="card"
            size="small"
            activeKey={selectedOccupantId ?? activeIncident.occupants[0].id}
            onChange={(key) => {
              setSelectedOccupantId(key);
              setSelectedRegion(null);
            }}
            items={activeIncident.occupants.map((occ) => {
              const triageBg =
                occ.triageColor === 'red'
                  ? 'bg-sev-extreme'
                  : occ.triageColor === 'yellow'
                  ? 'bg-sev-medium'
                  : occ.triageColor === 'black'
                  ? 'bg-black'
                  : 'bg-brand';

              return {
                key: occ.id,
                label: (
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <span className={`w-2 h-2 rounded-full ${triageBg}`} />
                    <span>{occ.label}</span>
                    <span className="font-mono text-[10px] text-muted ms-1">
                      {occ.profile.bloodType}
                    </span>
                  </span>
                ),
              };
            })}
            className="patient-tabs mb-0"
          />
        </div>
      )}

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 max-w-[1720px] w-full mx-auto">
        {!activeIncident ? (
          /* Full Page Empty State when No Incident */
          <div className="py-16">
            <EmptyState
              variant="patients"
              title={t('emptyTitle')}
              description={t('emptyDesc')}
              action={
                <Button
                  type="primary"
                  className="bg-brand text-white"
                  onClick={() => setScenarioDrawerOpen(true)}
                >
                  {t('scenarioHint')}
                </Button>
              }
            />
          </div>
        ) : (
          /* 3-COLUMN LAYOUT (≥1280): Left rail 320 · Center stage · Right rail 392 */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* ----------------- LEFT RAIL (320px / 3 cols) ----------------- */}
            <div className="xl:col-span-3 space-y-4">
              {/* Card 1: Arrival & ETA */}
              <Card
                size="small"
                title={
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-muted">
                      <ClockCircleOutlined className="text-brand" />
                      <span>{t('arrival')}</span>
                    </span>
                    {activeIncident.dispatch?.ambulanceId && (
                      <Tag color="#006233" className="m-0 font-mono text-xs">
                        <CarOutlined className="me-1" />
                        {activeIncident.dispatch.ambulanceId}
                      </Tag>
                    )}
                  </div>
                }
                className="bg-surface border-border shadow-xs"
              >
                <div className="space-y-4">
                  {/* Big ETA Countdown in mm:ss */}
                  <div className="p-3 bg-surface-elevated rounded-xl border border-border text-center">
                    <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight tabular-nums text-ink">
                      {(() => {
                        const s = activeIncident.dispatch?.etaToHospitalS ?? 420;
                        const min = Math.floor(s / 60);
                        const sec = s % 60;
                        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                      })()}
                    </div>
                    <span className="text-xs text-muted font-medium">{t('minSec')}</span>
                  </div>

                  {/* Origin Road Label */}
                  {activeIncident.position?.roadLabel && (
                    <div className="text-xs text-muted border-t border-border pt-2.5">
                      {t('from')}:{' '}
                      <strong className="text-ink font-medium">
                        {activeIncident.position.roadLabel}
                      </strong>
                    </div>
                  )}

                  {/* Small Lifecycle Steps */}
                  <div className="border-t border-border pt-3">
                    <Steps
                      size="small"
                      direction="vertical"
                      current={lifecycleStepIndex}
                      items={[
                        { title: tStatus('detected') },
                        { title: tStatus('dispatched') },
                        { title: tStatus('on_scene') },
                        { title: tStatus('transporting') },
                        { title: tStatus('at_hospital') },
                      ]}
                      className="text-xs"
                    />
                  </div>
                </div>
              </Card>

              {/* Card 2: Patient Demographic & Medical Profile */}
              {activeOccupant && (
                <Card
                  size="small"
                  title={
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <UserOutlined className="text-brand" />
                        <span>{activeOccupant.label}</span>
                      </span>
                      <Tag color="magenta" className="m-0 font-mono font-bold text-xs">
                        {activeOccupant.profile.bloodType}
                      </Tag>
                    </div>
                  }
                  className="bg-surface border-border shadow-xs"
                >
                  <div className="space-y-3">
                    {/* Alert Tags: Blood thinners / Pregnant */}
                    {(activeOccupant.profile.onBloodThinners || activeOccupant.profile.pregnant) && (
                      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border">
                        {activeOccupant.profile.onBloodThinners && (
                          <Tag color="error" className="m-0 font-semibold flex items-center gap-1 text-xs">
                            <AlertOutlined />
                            Blood thinners
                          </Tag>
                        )}
                        {activeOccupant.profile.pregnant && (
                          <Tag color="purple" className="m-0 font-semibold flex items-center gap-1 text-xs">
                            <MedicineBoxOutlined />
                            Pregnant
                          </Tag>
                        )}
                      </div>
                    )}

                    {/* Descriptions table (1 col, small) */}
                    <Descriptions
                      size="small"
                      column={1}
                      bordered
                      className="bg-surface text-xs"
                      labelStyle={{ width: '40%', color: 'var(--muted)', fontWeight: 500 }}
                      contentStyle={{ color: 'var(--ink)' }}
                    >
                      <Descriptions.Item label="Age / Sex">
                        {activeOccupant.profile.ageYears} yrs ·{' '}
                        {activeOccupant.profile.sex === 'm' ? 'Male' : 'Female'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Blood Type">
                        <span className="font-mono font-bold text-sev-extreme">
                          {activeOccupant.profile.bloodType}
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="Chronic Diseases">
                        {activeOccupant.profile.chronicDiseases?.length
                          ? activeOccupant.profile.chronicDiseases.join(', ')
                          : 'None'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Allergies">
                        {activeOccupant.profile.allergies?.length ? (
                          <span className="text-sev-high font-medium">
                            {activeOccupant.profile.allergies.join(', ')}
                          </span>
                        ) : (
                          'None'
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Medications">
                        {activeOccupant.profile.medications?.length
                          ? activeOccupant.profile.medications.join(', ')
                          : 'None'}
                      </Descriptions.Item>
                      {activeOccupant.profile.emergencyContact && (
                        <Descriptions.Item label="Emergency Contact">
                          <div className="flex items-center gap-1 flex-wrap">
                            <PhoneOutlined className="text-brand" />
                            <span>{activeOccupant.profile.emergencyContact.label}</span>
                            <span className="font-mono text-xs text-muted ms-1" dir="ltr">
                              {activeOccupant.profile.emergencyContact.phone}
                            </span>
                          </div>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </div>
                </Card>
              )}

              {/* Card 3: Severity & Ranking Score */}
              {activeOccupant && (
                <Card
                  size="small"
                  title={
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {t('severity')}
                    </span>
                  }
                  className="bg-surface border-border shadow-xs"
                >
                  <div className="space-y-3">
                    <SeverityTag
                      severity={activeOccupant.m3.level}
                      rankingScore={activeOccupant.m3.probability}
                      escalatedBy={activeOccupant.m3.escalatedBy}
                      size="large"
                    />

                    {/* Ranking score caption */}
                    <div className="text-xs text-muted flex items-center justify-between border-t border-border pt-2">
                      <span>{t('rankingScore')}:</span>
                      <strong className="font-mono text-ink">
                        {Math.round(activeOccupant.m3.probability * 100)}%
                      </strong>
                    </div>

                    {/* EscalatedBy line */}
                    {activeOccupant.m3.escalatedBy && activeOccupant.m3.escalatedBy.length > 0 && (
                      <div className="text-[11px] text-sev-high bg-sev-high/10 p-2 rounded border border-sev-high/20">
                        <strong>{t('raisedBy')}:</strong> {activeOccupant.m3.escalatedBy.join(', ')}
                      </div>
                    )}

                    {/* Medical disclaimer */}
                    <div className="text-[11px] text-muted italic border-t border-border pt-2">
                      {tCommon('medicalDisclaimer')}
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* ----------------- CENTER STAGE (5 cols, sticky) ----------------- */}
            <div className="xl:col-span-5 sticky top-20">
              <Card
                className="bg-surface border-border overflow-hidden p-0 shadow-sm"
                styles={{ body: { padding: 0 } }}
              >
                <StageFrame
                  height="640px"
                  showGrid={true}
                  overlay={
                    <div className="w-full h-full p-4 flex flex-col justify-between pointer-events-none">
                      {/* Top Overlay Controls: View switcher (start) & M4 Tag (end) */}
                      <div className="flex items-center justify-between w-full pointer-events-auto">
                        <Segmented
                          value={viewMode}
                          onChange={(val) => setViewMode(val as 'front' | 'back' | 'free')}
                          options={[
                            { label: t('viewFront'), value: 'front' },
                            { label: t('viewBack'), value: 'back' },
                            { label: t('viewFree'), value: 'free' },
                          ]}
                          className="bg-surface/90 backdrop-blur-md border border-border shadow-md text-xs"
                        />

                        <Tooltip title={t('m4Tooltip')}>
                          <Tag
                            color="#006233"
                            className="m-0 text-xs px-2.5 py-1 font-mono rounded-full border-none shadow-md flex items-center gap-1 cursor-help"
                          >
                            <InfoCircleOutlined />
                            <span>M4 estimate</span>
                          </Tag>
                        </Tooltip>
                      </div>

                      {/* Bottom Overlay Controls: Legend (start), Disclaimer (center), Reset (end) */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-2 w-full pointer-events-auto">
                        <div className="bg-surface/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border shadow-md">
                          <RegionLegend vertical={false} />
                        </div>

                        <div className="text-[11px] text-muted italic bg-surface/85 backdrop-blur-md px-2.5 py-1 rounded border border-border hidden md:block">
                          Estimate of where to look first — not a diagnosis.
                        </div>

                        <Button
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={handleResetView}
                          className="bg-surface/90 backdrop-blur-md border-border shadow-md text-xs"
                        >
                          {t('resetView')}
                        </Button>
                      </div>
                    </div>
                  }
                >
                  <Body3D
                    key={resetNonce}
                    occupant={activeOccupant}
                    viewMode={viewMode}
                    onReset={handleResetView}
                  />
                </StageFrame>
              </Card>
            </div>

            {/* ----------------- RIGHT RAIL (392px / 4 cols) ----------------- */}
            <div className="xl:col-span-4 space-y-4">
              {/* Card 1: Injury Map (7 RegionRows ordered by level then probability) */}
              <Card
                size="small"
                title={
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-muted">
                      <HeartOutlined className="text-brand" />
                      <span>{t('injuryMap')}</span>
                    </span>
                    <span className="font-mono text-muted text-[11px]">7 regions</span>
                  </div>
                }
                className="bg-surface border-border shadow-xs"
              >
                <div className="space-y-1.5">
                  {sortedRegions.map(({ region, level, probability }) => (
                    <RegionRow
                      key={region}
                      region={region}
                      level={level}
                      probability={probability}
                      selected={selectedRegion === region}
                      hovered={hoveredRegion === region}
                      onSelect={(reg) => {
                        setSelectedRegion(selectedRegion === reg ? null : reg);
                      }}
                      onHover={(reg) => setHoveredRegion(reg)}
                    />
                  ))}
                </div>
              </Card>

              {/* Card 2: Live Vitals */}
              {activeOccupant && (
                <VitalsCard
                  vitals={activeOccupant.vitals}
                  loading={false}
                />
              )}

              {/* Card 3: Emergency Preparation Checklist */}
              {activeIncident.prep && activeIncident.prep.length > 0 && (
                <Card
                  size="small"
                  title={
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {t('prepare')}
                    </span>
                  }
                  className="bg-surface border-border shadow-xs"
                >
                  <PrepChecklist items={activeIncident.prep} />
                </Card>
              )}

              {/* Card 4: Beds & Specialties */}
              {receivingHospital && (
                <Card
                  size="small"
                  title={
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate">{receivingHospital.name}</span>
                      <Tag color="green" className="m-0 text-xs font-mono">
                        {t('beds')}
                      </Tag>
                    </div>
                  }
                  className="bg-surface border-border shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 p-3 bg-surface-elevated rounded-lg border border-border">
                      <Statistic
                        title={<span className="text-xs text-muted">{t('freeBeds')}</span>}
                        value={receivingHospital.freeBeds}
                        valueStyle={{ color: 'var(--brand)', fontWeight: 700 }}
                      />
                      <Statistic
                        title={<span className="text-xs text-muted">{t('etaTitle')}</span>}
                        value={Math.round(receivingHospital.etaSeconds / 60)}
                        suffix="min"
                        valueStyle={{ fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
                        {t('specialties')}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {receivingHospital.specialties.map((spec) => (
                          <Tag key={spec} color="blue" className="text-xs m-0">
                            {spec}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Simulation Drawer Shortcut */}
      <ScenarioPanel />
    </div>
  );
}
