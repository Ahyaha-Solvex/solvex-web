'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Segmented, Steps, Tooltip } from 'antd';
import {
  AlertOutlined,
  ArrowRightOutlined,
  CarOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  MedicineBoxOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useUiStore } from '@/lib/stores/uiStore';
import type {
  BodyRegion,
  CrashFacts,
  Incident,
  LifecycleStatus,
  M3Level,
  M4Level,
  Occupant,
} from '@/lib/data/types';

import { SimBadge } from '@/components/app/SimBadge';
import { SeverityTag } from '@/components/app/SeverityTag';
import { StatusTag } from '@/components/app/StatusTag';
import { RegionRow } from '@/components/app/RegionRow';
import { VitalsCard } from '@/components/app/VitalsCard';
import { PrepChecklist } from '@/components/app/PrepChecklist';
import { TimelineList } from '@/components/app/TimelineList';
import { EmptyState } from '@/components/app/EmptyState';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { HospitalDashboard } from './HospitalDashboard';

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
const SEVERITY_RANK: Record<M3Level, number> = {
  extreme: 4,
  high: 3,
  medium: 2,
  low: 1,
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
const DEFAULT_ETA_S = 420;

interface Arrival {
  incident: Incident;
  occupant: Occupant;
}

/** One clock for every row: seconds elapsed since the page opened. */
function useElapsed() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return elapsed;
}

function formatEta(seconds: number) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
    s % 60
  ).padStart(2, '0')}`;
}

function impactSide(deg: number): 'front' | 'right' | 'rear' | 'left' {
  const d = ((deg % 360) + 360) % 360;
  if (d < 45 || d >= 315) return 'front';
  if (d < 135) return 'right';
  if (d < 225) return 'rear';
  return 'left';
}

function CrashCard({ crash }: { crash?: CrashFacts }) {
  const t = useTranslations('hospital');
  const yesNo = (v: boolean | null) =>
    v === null ? t('unknown') : t(v ? 'yes' : 'no');

  const items = crash
    ? [
        {
          label: t('speedBefore'),
          value: `${crash.speedBeforeKmh} km/h`,
          mono: true,
          highlight: false,
        },
        {
          label: t('deltaV'),
          value: `${crash.deltaVKmh} km/h`,
          mono: true,
          highlight: crash.deltaVKmh >= 40,
        },
        {
          label: t('impact'),
          value: t(`impactSide.${impactSide(crash.impactDirectionDeg)}`),
          mono: false,
          highlight: false,
        },
        {
          label: t('rollover'),
          value: yesNo(crash.rollover),
          mono: false,
          highlight: Boolean(crash.rollover),
        },
        {
          label: t('belt'),
          value: yesNo(crash.beltUsed),
          mono: false,
          highlight: crash.beltUsed === false,
        },
        {
          label: t('airbag'),
          value: yesNo(crash.airbagDeployed),
          mono: false,
          highlight: false,
        },
      ]
    : [];

  return (
    <Card
      size="small"
      className="bg-surface border-border shadow-1"
      title={
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CarOutlined className="text-brand" />
          <span>{t('crashTitle')}</span>
        </span>
      }
    >
      {!crash ? (
        <p className="text-xs text-muted m-0">{t('noCrashData')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className={`px-3 py-2.5 rounded-md border ${
                item.highlight
                  ? 'bg-sev-extreme-subtle/35 border-sev-extreme/30'
                  : 'bg-surface-2/70 border-border'
              }`}
            >
              <div className="text-[11px] font-medium text-muted truncate">
                {item.label}
              </div>
              <div
                className={`text-sm font-bold mt-0.5 truncate ${
                  item.mono ? 'font-mono tabular-nums' : ''
                } ${item.highlight ? 'text-sev-extreme' : 'text-ink'}`}
                dir={item.mono ? 'ltr' : undefined}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function InjuriesCard({
  occupant,
  onOpenTwin,
  onSelectRegion,
}: {
  occupant: Occupant;
  onOpenTwin: () => void;
  onSelectRegion: (region: BodyRegion) => void;
}) {
  const t = useTranslations('hospital');
  const ranked = REGIONS.map((region) => ({
    region,
    ...(occupant.m4[region] ?? {
      level: 'unlikely' as M4Level,
      probability: 0,
    }),
  })).sort(
    (a, b) =>
      LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.probability - a.probability
  );

  return (
    <Card
      size="small"
      className="bg-surface border-border shadow-1"
      title={
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <HeartOutlined className="text-sev-extreme" />
          <span>{t('whereToLook')}</span>
          <Tooltip title={t('m4Tooltip')}>
            <InfoCircleOutlined className="text-muted text-xs cursor-help" />
          </Tooltip>
        </span>
      }
      extra={
        <Button
          type="link"
          size="small"
          onClick={onOpenTwin}
          className="!px-1 text-xs font-semibold"
        >
          {t('viewOnBody')} <ArrowRightOutlined className="ms-1 text-[10px] rtl:rotate-180" />
        </Button>
      }
    >
      <div className="space-y-1.5">
        {ranked.map(({ region, level, probability }) => (
          <RegionRow
            key={region}
            region={region}
            level={level}
            probability={probability}
            onSelect={onSelectRegion}
          />
        ))}
      </div>
    </Card>
  );
}

function PatientRecordCard({ occupant }: { occupant: Occupant }) {
  const t = useTranslations('hospital');
  const { profile } = occupant;
  const list = (items?: string[]) =>
    items?.length ? items.join(', ') : t('none');

  const rows = [
    {
      label: t('ageSex'),
      value: (
        <span className="font-semibold text-ink">
          {t('ageValue', { age: profile.ageYears })} ·{' '}
          {t(profile.sex === 'm' ? 'male' : 'female')}
        </span>
      ),
    },
    {
      label: t('bloodType'),
      value: (
        <span className="px-2 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/30 font-mono text-xs font-bold text-sev-extreme">
          {profile.bloodType}
        </span>
      ),
    },
    {
      label: t('chronic'),
      value: <span className="text-ink">{list(profile.chronicDiseases)}</span>,
    },
    {
      label: t('allergies'),
      value:
        profile.allergies.length > 0 ? (
          <div className="flex flex-wrap gap-1 justify-end">
            {profile.allergies.map((allergy) => (
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
        ),
    },
    {
      label: t('medications'),
      value: <span className="text-ink">{list(profile.medications)}</span>,
    },
  ];

  return (
    <Card
      size="small"
      className="bg-surface border-border shadow-1"
      title={
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <UserOutlined className="text-brand" />
          <span>{t('patient')}</span>
        </span>
      }
    >
      <div className="divide-y divide-border text-xs">
        {rows.map((r) => (
          <div
            key={r.label}
            className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
          >
            <span className="text-muted font-medium shrink-0">{r.label}</span>
            <div className="text-end min-w-0">{r.value}</div>
          </div>
        ))}
        {profile.emergencyContact && (
          <div className="py-2 last:pb-0 flex items-center justify-between gap-4">
            <span className="text-muted font-medium shrink-0">
              {t('emergencyContact')}
            </span>
            <span className="flex items-center gap-1.5 text-ink font-medium">
              <PhoneOutlined className="text-brand" />
              <span>{profile.emergencyContact.label}</span>
              <span
                className="font-mono text-xs font-semibold text-ink-2"
                dir="ltr"
              >
                {profile.emergencyContact.phone}
              </span>
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function ArrivalRow({
  arrival,
  eta,
  selected,
  onSelect,
}: {
  arrival: Arrival;
  eta: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations('hospital');
  const { incident, occupant } = arrival;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
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

      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: SEVERITY_COLOR[occupant.m3.level] }}
          />
          <span className="font-semibold text-sm text-ink truncate">
            {occupant.label}
          </span>
          {occupant.profile.bloodType && (
            <span className="px-1.5 py-0.5 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/30 font-mono text-[10px] font-bold text-sev-extreme leading-none">
              {occupant.profile.bloodType}
            </span>
          )}
        </span>
        <span
          className="font-mono text-sm font-bold tabular-nums text-ink shrink-0"
          dir="ltr"
        >
          {formatEta(eta)}
        </span>
      </span>

      <span className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted">
        <span className="truncate">
          {t('ageValue', { age: occupant.profile.ageYears })} ·{' '}
          {t(occupant.profile.sex === 'm' ? 'male' : 'female')}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <SeverityTag
            severity={occupant.m3.level}
            size="small"
            showIcon={false}
          />
          <StatusTag status={incident.lifecycle} size="small" />
        </span>
      </span>
    </button>
  );
}

export function HospitalApp() {
  const t = useTranslations('hospital');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('status');
  const locale = useLocale();
  const router = useRouter();

  const { incidents, online } = useIncidentStore();
  const setScenarioDrawerOpen = useUiStore((s) => s.setScenarioDrawerOpen);
  const setSelectedRegion = useUiStore((s) => s.setSelectedRegion);
  const elapsed = useElapsed();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [twinOpen, setTwinOpen] = useState(false);

  // Most severe first, then soonest arrival
  const arrivals = useMemo(() => {
    const list: Arrival[] = Object.values(incidents)
      .filter((incident) => incident.lifecycle !== 'closed')
      .flatMap((incident) =>
        incident.occupants.map((occupant) => ({ incident, occupant }))
      );
    return list.sort(
      (a, b) =>
        SEVERITY_RANK[b.occupant.m3.level] -
          SEVERITY_RANK[a.occupant.m3.level] ||
        (a.incident.dispatch?.etaToHospitalS ?? DEFAULT_ETA_S) -
          (b.incident.dispatch?.etaToHospitalS ?? DEFAULT_ETA_S)
    );
  }, [incidents]);

  const current =
    arrivals.find((a) => a.occupant.id === selectedId) ?? arrivals[0] ?? null;
  const etaOf = (incident: Incident) =>
    (incident.dispatch?.etaToHospitalS ?? DEFAULT_ETA_S) - elapsed;

  if (current && twinOpen) {
    return (
      <HospitalDashboard
        incidentId={current.incident.id}
        occupantId={current.occupant.id}
        elapsed={elapsed}
        onSelectOccupant={(id) => setSelectedId(id)}
        onBack={() => setTwinOpen(false)}
      />
    );
  }

  const incident = current?.incident;
  const occupant = current?.occupant;
  const hospital =
    incident?.hospitalOptions?.find(
      (h) => h.id === incident.dispatch?.hospitalId
    ) ??
    incident?.hospitalOptions?.[0] ??
    null;

  const flags = occupant
    ? [
        ...(occupant.profile.onBloodThinners ? [t('bloodThinners')] : []),
        ...(occupant.profile.pregnant ? [t('pregnant')] : []),
        ...occupant.profile.allergies.map((a) => `${t('allergyTo')} ${a}`),
      ]
    : [];

  return (
    <div className="h-screen overflow-hidden bg-bg flex flex-col text-ink text-sm">
      {/* Unified 56px Top Navigation Bar */}
      <header className="h-14 shrink-0 px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-surface z-30">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-base tracking-tight text-ink shrink-0">
            {tCommon('brand')}
          </span>
          <span className="h-5 w-px bg-border-strong shrink-0" />
          <span className="text-sm font-medium text-ink-2 truncate">
            {hospital?.name ?? t('department')}
          </span>
          {hospital && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm bg-brand-subtle border border-brand/25 text-xs font-medium text-brand shrink-0">
              <MedicineBoxOutlined />
              <span>{t('freeBeds')}:</span>
              <strong className="font-mono tabular-nums">
                {hospital.freeBeds}
              </strong>
            </span>
          )}
        </div>

        <Segmented
          value="hospital"
          onChange={(role) => {
            if (role === 'responder') router.push(`/${locale}/responder`);
            if (role === 'breakdown') router.push(`/${locale}/breakdown`);
          }}
          options={[
            { label: t('roleResponder'), value: 'responder' },
            { label: t('roleHospital'), value: 'hospital' },
            { label: t('roleBreakdown'), value: 'breakdown' },
          ]}
        />

        <div className="flex items-center justify-end gap-3 shrink-0">
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

      {!current || !incident || !occupant ? (
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
        <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
          {/* Left Rail: Incoming Patients Queue */}
          <aside className="w-80 shrink-0 flex flex-col rounded-lg bg-surface border border-border shadow-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 bg-surface">
              <h2 className="text-sm font-semibold text-ink m-0">
                {t('incomingTitle')}
              </h2>
              <span className="px-2 py-0.5 rounded-sm bg-surface-2 border border-border font-mono text-xs font-semibold text-ink-2 tabular-nums">
                {arrivals.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {arrivals.map((arrival) => (
                <ArrivalRow
                  key={arrival.occupant.id}
                  arrival={arrival}
                  eta={etaOf(arrival.incident)}
                  selected={arrival.occupant.id === occupant.id}
                  onSelect={() => setSelectedId(arrival.occupant.id)}
                />
              ))}
            </div>
          </aside>

          {/* Main Patient Dossier Workspace */}
          <main className="flex-1 min-w-0 overflow-y-auto pe-0.5">
            <div className="max-w-6xl mx-auto space-y-4 pb-6">
              {/* Patient Dossier Header Card */}
              <section className="rounded-lg bg-surface border border-border shadow-1 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl font-bold tracking-tight text-ink m-0">
                        {occupant.label}
                      </h1>
                      <SeverityTag
                        severity={occupant.m3.level}
                        size="middle"
                        rankingScore={occupant.m3.probability}
                      />
                      {occupant.profile.bloodType && (
                        <span className="px-2.5 py-1 rounded-sm bg-sev-extreme-subtle border border-sev-extreme/35 font-mono text-xs font-bold text-sev-extreme">
                          {occupant.profile.bloodType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
                      <span className="font-medium text-ink-2">
                        {t('ageValue', { age: occupant.profile.ageYears })} ·{' '}
                        {t(occupant.profile.sex === 'm' ? 'male' : 'female')}
                      </span>
                      <span>·</span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-surface-2 border border-border font-mono text-[11px] font-semibold text-ink-2">
                        {incident.id}
                      </span>
                      {incident.position?.roadLabel && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-ink-2">
                            <EnvironmentOutlined className="text-brand" />
                            <span>{incident.position.roadLabel}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Dark Telemetry Countdown + Digital Twin CTA */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="px-4 py-2 rounded-lg bg-stage-bg border border-border-strong text-stage-ink flex items-center gap-4 shadow-1">
                      <div>
                        <div className="text-[11px] font-medium text-stage-muted">
                          {t('etaTitle')}
                        </div>
                        {incident.dispatch?.ambulanceId ? (
                          <div className="text-xs font-mono font-semibold text-stage-ink mt-0.5">
                            {incident.dispatch.ambulanceId}
                          </div>
                        ) : (
                          <div className="text-xs text-stage-muted mt-0.5">
                            {tStatus(incident.lifecycle)}
                          </div>
                        )}
                      </div>
                      <div
                        className="font-mono text-2xl font-bold tabular-nums leading-none"
                        style={{ color: SEVERITY_COLOR[occupant.m3.level] }}
                        dir="ltr"
                      >
                        {formatEta(etaOf(incident))}
                      </div>
                    </div>

                    <Button
                      type="primary"
                      size="large"
                      onClick={() => setTwinOpen(true)}
                      className="font-semibold"
                    >
                      <span>{t('openTwin')}</span>
                      <ArrowRightOutlined className="ms-1.5 rtl:rotate-180" />
                    </Button>
                  </div>
                </div>

                {/* Lifecycle Steps Strip */}
                <div className="pt-3.5 border-t border-border">
                  <Steps
                    size="small"
                    current={LIFECYCLE.indexOf(incident.lifecycle)}
                    items={LIFECYCLE.map((status) => ({
                      title: (
                        <span className="text-xs font-medium">
                          {tStatus(status)}
                        </span>
                      ),
                    }))}
                  />
                </div>
              </section>

              {/* Critical Pre-Treatment Warnings Banner */}
              {flags.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg bg-sev-extreme-subtle/50 border border-sev-extreme/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 text-sev-extreme font-semibold text-xs">
                    <AlertOutlined className="text-sm shrink-0" />
                    <span>{t('alertsTitle')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {flags.map((f) => (
                      <span
                        key={f}
                        className="px-2.5 py-1 rounded-sm bg-surface border border-sev-extreme/40 text-sev-extreme text-xs font-bold"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 12-Column Clinical Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <PatientRecordCard occupant={occupant} />
                    <CrashCard crash={incident.crash} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <InjuriesCard
                      occupant={occupant}
                      onOpenTwin={() => {
                        setSelectedRegion(null);
                        setTwinOpen(true);
                      }}
                      onSelectRegion={(region) => {
                        setSelectedRegion(region);
                        setTwinOpen(true);
                      }}
                    />
                    <VitalsCard vitals={occupant.vitals} />
                  </div>
                </div>

                <div className="xl:col-span-4 space-y-4">
                  <PrepChecklist key={incident.id} items={incident.prep} />
                  <TimelineList events={incident.timeline} />
                </div>
              </div>

              <p className="text-center text-xs text-muted m-0">
                {tCommon('medicalDisclaimer')}
              </p>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
