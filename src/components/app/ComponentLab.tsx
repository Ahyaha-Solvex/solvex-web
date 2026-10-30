'use client';

import React, { useState } from 'react';
import { Card, Tabs, Button, Divider } from 'antd';
import {
  SafetyCertificateFilled,
  HeartFilled,
  SendOutlined,
  CompassFilled,
  InboxOutlined,
  AppstoreOutlined,
  ControlOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';

// Components under test
import { SimBadge } from './SimBadge';
import { SeverityTag } from './SeverityTag';
import { StatusTag } from './StatusTag';
import { ConfidenceLadder } from './ConfidenceLadder';
import { RegionRow } from './RegionRow';
import { RegionLegend } from './RegionLegend';
import { Eta } from './Eta';
import { VitalsCard } from './VitalsCard';
import { ProfileCard } from './ProfileCard';
import { PrepChecklist } from './PrepChecklist';
import { IncidentRow } from './IncidentRow';
import { IncidentPanel } from './IncidentPanel';
import { TimelineList } from './TimelineList';
import { SmsFeed } from './SmsFeed';
import { AmbulanceTable } from './AmbulanceTable';
import { HospitalOptionCard } from './HospitalOptionCard';
import { NearbyPeopleList } from './NearbyPeopleList';
import { EmptyState } from './EmptyState';
import { StageFrame } from '@/components/stage/StageFrame';
import { StageControls } from '@/components/stage/StageControls';
import { TelemetryTrace } from '@/components/stage/TelemetryTrace';
import { LangSwitcher } from '@/components/ui/LangSwitcher';

// Mock & Seed Data
import {
  SEED_OCCUPANT_A,
  SEED_HOSPITALS,
  SEED_AMBULANCES,
  SEED_NEARBY_PEOPLE,
  SEED_POSITION,
} from '@/lib/data/sim/seed';
import type {
  BodyRegion,
  Incident,
  SmsMessage,
  TimelineEvent,
  Vitals,
} from '@/lib/data/types';
import { useUiStore } from '@/lib/stores/uiStore';

export function ComponentLab() {
  const t = useTranslations('lab.components');
  const setDrawerOpen = useUiStore((s) => s.setScenarioDrawerOpen);

  // Local interactive states for verification
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion>('thorax');
  const [hoveredRegion, setHoveredRegion] = useState<BodyRegion | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<string>('inc-rn5-1');
  const [assignedAmbulance, setAssignedAmbulance] = useState<string>('amb-102');
  const [selectedHospital, setSelectedHospital] = useState<string>('hosp-bouira');
  const [stageView, setStageView] = useState<'front' | 'back' | 'free'>('front');
  const [replayTime, setReplayTime] = useState<number>(5.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1.0);

  // Mock Incident
  const mockIncident: Incident = {
    id: 'inc-rn5-1',
    createdAt: new Date().toISOString(),
    lifecycle: 'dispatched',
    channel: 'data',
    position: SEED_POSITION,
    confidence: {
      score: 85,
      status: 'likely',
    },
    m2: { p: 0.98, level: 'crash' },
    crash: {
      speedBeforeKmh: 94,
      deltaVKmh: 55.4,
      impactDirectionDeg: 270,
      rollover: true,
      multipleImpacts: false,
      beltUsed: true,
      airbagDeployed: true,
    },
    dispatch: {
      ambulanceId: 'amb-102',
      hospitalId: 'hosp-bouira',
      etaToSceneS: 660,
    },
    hospitalOptions: SEED_HOSPITALS,
    prep: [],
    nearbyPeople: SEED_NEARBY_PEOPLE,
    nearbyVehicles: [],
    timeline: [],
    sms: [],
    occupants: [
      {
        id: 'occ-1',
        label: 'Driver',
        profile: SEED_OCCUPANT_A.profile,
        m3: { level: 'high', probability: 0.88 },
        m4: SEED_OCCUPANT_A.m4,
        triageColor: 'red',
      },
      {
        id: 'occ-2',
        label: 'Passenger',
        profile: {
          ageYears: 36,
          sex: 'f',
          bloodType: 'A+',
          chronicDiseases: [],
          allergies: [],
          medications: [],
          onBloodThinners: false,
          pregnant: false,
        },
        m3: { level: 'medium', probability: 0.42 },
        m4: SEED_OCCUPANT_A.m4,
        triageColor: 'yellow',
      },
    ],
  };

  // Mock Vitals
  const mockVitalsNormal: Vitals = {
    updatedAt: new Date().toISOString(),
    hr: 82,
    spo2: 98,
    bpSys: 122,
    bpDia: 78,
    source: 'watch',
  };

  const mockVitalsAlert: Vitals = {
    updatedAt: new Date().toISOString(),
    hr: 135, // High alert
    spo2: 89, // High alert (<92)
    bpSys: 84, // High alert (<90)
    bpDia: 52,
    source: 'paramedic_cuff',
  };

  // Mock Timeline
  const mockTimeline: TimelineEvent[] = [
    { t: new Date(Date.now() - 400000).toISOString(), kind: 'detected', label: 'Blackbox impact detected (ΔV 55 km/h)' },
    { t: new Date(Date.now() - 350000).toISOString(), kind: 'alert_sent', label: 'Data stream uplink established (RN5 km 112)' },
    { t: new Date(Date.now() - 280000).toISOString(), kind: 'witness_confirm', label: 'Witness phone call 14 confirms overturned sedan' },
    { t: new Date(Date.now() - 180000).toISOString(), kind: 'dispatcher_confirm', label: 'Civil Protection dispatcher confirmed crash' },
    { t: new Date(Date.now() - 120000).toISOString(), kind: 'ambulance_assigned', label: 'Ambulance PC-102 dispatched (ETA 11m)' },
    { t: new Date(Date.now() - 60000).toISOString(), kind: 'helper_called', label: 'Solidarity broadcast sent to 5 nearby first-aiders' },
  ];

  // Mock SMS
  const mockSms: SmsMessage[] = [
    {
      id: 'sms-1',
      dir: 'in',
      t: new Date(Date.now() - 300000).toISOString(),
      raw: 'SOS|36.3741,3.9012|14:02|C85|SEV:HIGH|OCC:2|O+|ID4821',
      delivery: 'delivered',
      parsed: {
        lat: 36.3741,
        lng: 3.9012,
        time: '14:02',
        confidence: 85,
        severity: 'HIGH',
        occupants: 2,
        bloodType: 'O+',
        id: '4821',
      },
    },
    {
      id: 'sms-2',
      dir: 'out',
      t: new Date(Date.now() - 120000).toISOString(),
      raw: 'Ambulance PC-102 dispatched to RN5 km 112. ETA 11 min.',
      delivery: 'delivered',
    },
    {
      id: 'sms-3',
      dir: 'out',
      t: new Date(Date.now() - 60000).toISOString(),
      raw: 'Protection Civile: Are you OK? Reply 1 if conscious.',
      delivery: 'sent',
    },
  ];

  // Mock Prep Items
  const mockPrep = [
    { id: 'prep-1', label: 'Trauma Bay 1 Alert & Warm fluids', reason: 'High delta-V rollover with suspected chest trauma', priority: 'immediate' as const },
    { id: 'prep-2', label: '2 units O-negative PRBC on standby', reason: 'Patient on anticoagulant therapy (blood thinners)', priority: 'immediate' as const },
    { id: 'prep-3', label: 'Whole-body CT polytrauma protocol', reason: 'Thorax and spine high injury score estimate', priority: 'urgent' as const },
    { id: 'prep-4', label: 'Orthopedic reduction set prepared', reason: 'Upper and lower limb check rating', priority: 'routine' as const },
  ];

  const bodyRegionsList: { region: BodyRegion; level: 'unlikely' | 'check' | 'likely'; prob: number }[] = [
    { region: 'thorax', level: 'likely', prob: 0.94 },
    { region: 'spine_neck', level: 'likely', prob: 0.86 },
    { region: 'head', level: 'check', prob: 0.72 },
    { region: 'abdomen', level: 'check', prob: 0.58 },
    { region: 'legs', level: 'check', prob: 0.44 },
    { region: 'arms', level: 'unlikely', prob: 0.22 },
    { region: 'face', level: 'unlikely', prob: 0.15 },
  ];

  const tabItems = [
    {
      key: 'badges',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <SafetyCertificateFilled /> {t('badges')}
        </span>
      ),
      children: (
        <div className="space-y-6">
          {/* SimBadge */}
          <Card size="small" title="1. SimBadge (Rule 9 Honesty Tag)" className="bg-surface border-border">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1">
                <span className="text-xs text-muted block">Normal persistent state:</span>
                <SimBadge forceShow />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted block">Inside pill container:</span>
                <div className="p-2 rounded-lg bg-surface-2 border border-border inline-flex items-center gap-2">
                  <span className="text-xs font-medium text-ink">Source Mode:</span>
                  <SimBadge forceShow />
                </div>
              </div>
            </div>
          </Card>

          {/* SeverityTag */}
          <Card size="small" title="2. SeverityTag (M3 Algorithm Ratings)" className="bg-surface border-border">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                  All Severity Levels (Small, Middle, Large):
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  <SeverityTag severity="low" size="small" />
                  <SeverityTag severity="medium" size="small" />
                  <SeverityTag severity="high" size="small" />
                  <SeverityTag severity="extreme" size="small" />
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-2">
                  <SeverityTag severity="low" size="middle" />
                  <SeverityTag severity="medium" size="middle" />
                  <SeverityTag severity="high" size="middle" />
                  <SeverityTag severity="extreme" size="middle" />
                </div>
              </div>

              <Divider className="my-2 border-border" />

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                  Large with Ranking Score, Escalated By, and Medical Disclaimer:
                </span>
                <div className="p-4 rounded-lg bg-surface-2 border border-border">
                  <SeverityTag
                    severity="extreme"
                    size="large"
                    rankingScore={0.96}
                    escalatedBy={['Blood thinners', 'Unresponsive t>30s']}
                    showCaption
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                  Disabled state:
                </span>
                <SeverityTag severity="high" disabled size="middle" />
              </div>
            </div>
          </Card>

          {/* StatusTag */}
          <Card size="small" title="3. StatusTag (Incident Lifecycle - Brand Green Progress)" className="bg-surface border-border">
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                Lifecycle Stages (Progress never uses red per DESIGN.md line 115):
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <StatusTag status="detected" channel="data" />
                <StatusTag status="dispatched" channel="data" />
                <StatusTag status="on_scene" channel="data" />
                <StatusTag status="transporting" channel="sms" />
                <StatusTag status="at_hospital" channel="sms" />
                <StatusTag status="closed" />
                <StatusTag status="detected" disabled />
              </div>
            </div>
          </Card>

          {/* ConfidenceLadder */}
          <Card size="small" title="4. ConfidenceLadder (4-Segment Mathematical Progression)" className="bg-surface border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <span className="text-xs text-muted block mb-2 font-mono">Stage 1: Suspected (Score 40-70)</span>
                <ConfidenceLadder score={45} status="suspected" />
              </div>

              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <span className="text-xs text-muted block mb-2 font-mono">Stage 2: Likely (Score 70-90)</span>
                <ConfidenceLadder score={85} status="likely" />
              </div>

              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <span className="text-xs text-muted block mb-2 font-mono">Stage 3: Witness Confirmed</span>
                <ConfidenceLadder score={100} status="witness_confirmed" />
              </div>

              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <span className="text-xs text-muted block mb-2 font-mono">Stage 4: Confirmed (Dispatcher with Pulse Ring)</span>
                <ConfidenceLadder score={100} status="confirmed" />
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: 'medical',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <MedicineBoxOutlined /> {t('medical')}
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Injury Map: RegionRow list */}
          <Card size="small" title="5. RegionRow & RegionLegend (Two-Way 3D Sync)" className="bg-surface border-border">
            <div className="space-y-3">
              <RegionLegend />

              <div className="space-y-1.5 pt-2">
                {bodyRegionsList.map((item) => (
                  <RegionRow
                    key={item.region}
                    region={item.region}
                    level={item.level}
                    probability={item.prob}
                    selected={selectedRegion === item.region}
                    hovered={hoveredRegion === item.region}
                    onSelect={(r) => setSelectedRegion(r)}
                    onHover={(r) => setHoveredRegion(r)}
                  />
                ))}
              </div>

              <div className="p-2.5 rounded bg-surface-2 border border-border text-xs flex items-center justify-between">
                <span className="text-muted">Currently Selected:</span>
                <span className="font-mono font-bold text-brand uppercase">{selectedRegion}</span>
              </div>
            </div>
          </Card>

          {/* ProfileCard & PrepChecklist */}
          <div className="space-y-6">
            <Card size="small" title="6. ProfileCard (Demographics & High-Risk Alerts)" className="bg-surface border-border">
              <div className="space-y-4">
                <ProfileCard profile={SEED_OCCUPANT_A.profile} label="Patient A (Driver)" />
                <div className="border-t border-border pt-3">
                  <span className="text-xs text-muted block mb-2">Skeleton Loading State:</span>
                  <ProfileCard loading />
                </div>
              </div>
            </Card>

            <Card size="small" title="7. PrepChecklist (ER Immediate Protocol)" className="bg-surface border-border">
              <PrepChecklist items={mockPrep} />
            </Card>
          </div>
        </div>
      ),
    },
    {
      key: 'vitals',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <HeartFilled /> {t('vitals')}
        </span>
      ),
      children: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                Normal In-Range Vitals (Smartwatch 60-point sparkline):
              </span>
              <VitalsCard vitals={mockVitalsNormal} />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                Threshold Alert Vitals (Paramedic Cuff - HR &gt; 120, SpO₂ &lt; 92, BP &lt; 90):
              </span>
              <VitalsCard vitals={mockVitalsAlert} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                Loading State:
              </span>
              <VitalsCard loading />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                Empty State:
              </span>
              <VitalsCard />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                Error State with Retry:
              </span>
              <VitalsCard error="Sensor Bluetooth connection lost" onRetry={() => {}} />
            </div>
          </div>

          {/* Eta Component */}
          <Card size="small" title="8. Eta Countdown (mm:ss)" className="bg-surface border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <span className="text-xs text-muted block mb-1">Large Standard:</span>
                <Eta secondsRemaining={660} ambulanceId="amb-102" origin="RN5 km 112" size="large" />
              </div>
              <div>
                <span className="text-xs text-muted block mb-1">Urgent (&lt; 3 mins):</span>
                <Eta secondsRemaining={115} ambulanceId="amb-102" origin="RN5 km 112" size="large" />
              </div>
              <div>
                <span className="text-xs text-muted block mb-1">Compact in-rail badge:</span>
                <div className="p-4 rounded-xl bg-surface-2 border border-border">
                  <Eta secondsRemaining={420} ambulanceId="amb-102" compact />
                </div>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: 'dispatch',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <SendOutlined /> {t('dispatch')}
        </span>
      ),
      children: (
        <div className="space-y-6">
          {/* IncidentRow */}
          <Card size="small" title="9. IncidentRow (Queue items)" className="bg-surface border-border">
            <div className="space-y-2.5 max-w-lg">
              <IncidentRow
                incident={mockIncident}
                selected={selectedIncident === 'inc-rn5-1'}
                onClick={() => setSelectedIncident('inc-rn5-1')}
              />
              <IncidentRow
                incident={{
                  ...mockIncident,
                  id: 'inc-rn5-2',
                  position: { lat: 36.35, lng: 3.88, roadLabel: 'RN5, Exit Bouira South' },
                  confidence: { score: 95, status: 'confirmed' },
                  occupants: [
                    {
                      ...mockIncident.occupants[0],
                      m3: { level: 'extreme', probability: 0.96 },
                    },
                  ],
                  channel: 'sms',
                }}
                selected={selectedIncident === 'inc-rn5-2'}
                onClick={() => setSelectedIncident('inc-rn5-2')}
              />
              <IncidentRow
                incident={{
                  ...mockIncident,
                  id: 'inc-rn5-3',
                  position: { lat: 36.42, lng: 3.95, roadLabel: 'RN12, Junction Tizi Ouzou' },
                  confidence: { score: 45, status: 'suspected' },
                  occupants: [
                    {
                      ...mockIncident.occupants[0],
                      m3: { level: 'low', probability: 0.25 },
                    },
                  ],
                  lifecycle: 'detected',
                }}
                isNew
                selected={selectedIncident === 'inc-rn5-3'}
                onClick={() => setSelectedIncident('inc-rn5-3')}
              />
            </div>
          </Card>

          {/* IncidentPanel */}
          <Card size="small" title="10. IncidentPanel (Dispatcher Right Rail Details & 2x2 Actions)" className="bg-surface border-border">
            <div className="max-w-md">
              <IncidentPanel
                incident={mockIncident}
                onConfirm={() => {}}
                onAssignAmbulance={() => {}}
                onCallForHelp={() => {}}
                onCloseIncident={() => {}}
              />
            </div>
          </Card>

          {/* AmbulanceTable */}
          <Card size="small" title="11. AmbulanceTable (Protection Civile Units)" className="bg-surface border-border">
            <AmbulanceTable
              ambulances={SEED_AMBULANCES}
              assignedId={assignedAmbulance}
              onAssign={(id) => setAssignedAmbulance(id)}
            />
          </Card>

          {/* HospitalOptionCard */}
          <Card size="small" title="12. HospitalOptionCard (Recommended & Alternatives)" className="bg-surface border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HospitalOptionCard
                hospital={SEED_HOSPITALS[0]}
                recommended
                selected={selectedHospital === SEED_HOSPITALS[0].id}
                onSelect={(id) => setSelectedHospital(id)}
              />
              <HospitalOptionCard
                hospital={SEED_HOSPITALS[1]}
                selected={selectedHospital === SEED_HOSPITALS[1].id}
                onSelect={(id) => setSelectedHospital(id)}
              />
            </div>
          </Card>

          {/* NearbyPeopleList */}
          <Card size="small" title="13. NearbyPeopleList (Medics highlighted in red)" className="bg-surface border-border">
            <NearbyPeopleList
              people={SEED_NEARBY_PEOPLE}
              onCallHelp={() => {}}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'feed',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <InboxOutlined /> {t('feed')}
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
              TimelineList (Newest on top):
            </span>
            <TimelineList events={mockTimeline} />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
              SmsFeed (Inbound / Outbound with mono dir=&quot;ltr&quot;):
            </span>
            <SmsFeed messages={mockSms} networkOnline={true} />
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <CompassFilled /> {t('stage')}
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card size="small" title="14. StageFrame & StageControls (Signature Dark Stage with 96px Fade)" className="bg-surface border-border">
            <div className="space-y-2">
              <p className="text-xs text-muted">
                Rule 140: Dark background (--stage-bg: #0B1310), 48px grid, double gradient fade mask. Overlay controls are unmasked siblings and never clipped.
              </p>
              <StageFrame
                height="400px"
                overlay={
                  <StageControls
                    viewMode={stageView}
                    onViewChange={(v) => setStageView(v)}
                    onReset={() => setStageView('front')}
                  />
                }
              >
                <div className="text-center space-y-2 text-stage-ink">
                  <div className="text-3xl font-mono font-bold text-stage-ink">
                    3D SCENE STAGE
                  </div>
                  <p className="text-xs text-stage-muted max-w-xs mx-auto">
                    Active View: <span className="font-mono text-brand font-bold uppercase">{stageView}</span>
                  </p>
                </div>
              </StageFrame>
            </div>
          </Card>

          <Card size="small" title="15. TelemetryTrace (Resultant g Curve & Impact Scrubber)" className="bg-surface border-border">
            <TelemetryTrace
              currentTime={replayTime}
              impactTime={5.0}
              totalDuration={16.0}
              isPlaying={isPlaying}
              speed={replaySpeed}
              onSeek={(t) => setReplayTime(t)}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onGoToImpact={() => setReplayTime(5.0)}
              onSpeedChange={(s) => setReplaySpeed(s)}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'utilities',
      label: (
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <AppstoreOutlined /> Utilities &amp; States
        </span>
      ),
      children: (
        <div className="space-y-6">
          {/* EmptyState variants */}
          <Card size="small" title="16. EmptyState Variants (Minimal, one line, one icon per DESIGN.md)" className="bg-surface border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <EmptyState variant="incidents" title="No active incidents" description="Incoming blackbox crash alerts will appear automatically." />
              <EmptyState variant="patients" title="No incoming patients" description="Hospital emergency triage is currently clear." />
              <EmptyState variant="vitals" title="No vitals available" description="Wearable watch or paramedic cuff not connected." />
            </div>
          </Card>

          {/* LangSwitcher */}
          <Card size="small" title="17. LangSwitcher (Pill language switcher with RTL flip)" className="bg-surface border-border">
            <div className="p-4 rounded-lg bg-surface-2 border border-border flex items-center justify-between">
              <span className="text-xs font-medium text-ink">Active Locale Switcher:</span>
              <LangSwitcher />
            </div>
          </Card>

          {/* ScenarioPanel shortcut */}
          <Card size="small" title="18. ScenarioPanel (Simulation Drawer Controller)" className="bg-surface border-border">
            <div className="p-4 rounded-lg bg-surface-2 border border-border flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-ink">Floating Drawer Controls</h4>
                <p className="text-xs text-muted">Controls network toggle, witness confirmation, speed, and SOS triggers.</p>
              </div>
              <Button type="primary" icon={<ControlOutlined />} onClick={() => setDrawerOpen(true)}>
                Open Scenario Panel
              </Button>
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="border-b border-border pb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {t('title')}
            </h1>
            <SimBadge forceShow />
          </div>
          <p className="text-sm text-muted">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LangSwitcher />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs defaultActiveKey="badges" items={tabItems} className="bg-transparent" />
    </div>
  );
}
