'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Descriptions, Segmented, Steps, Tag, Tooltip } from 'antd';
import { ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useUiStore } from '@/lib/stores/uiStore';
import type { BodyRegion, CrashFacts, Incident, LifecycleStatus, M3Level, M4Level, Occupant } from '@/lib/data/types';

import { SimBadge } from '@/components/app/SimBadge';
import { SeverityTag } from '@/components/app/SeverityTag';
import { VitalsCard } from '@/components/app/VitalsCard';
import { PrepChecklist } from '@/components/app/PrepChecklist';
import { TimelineList } from '@/components/app/TimelineList';
import { EmptyState } from '@/components/app/EmptyState';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { HospitalDashboard } from './HospitalDashboard';

const REGIONS: BodyRegion[] = ['head', 'face', 'spine_neck', 'thorax', 'abdomen', 'arms', 'legs'];
const LEVEL_RANK: Record<M4Level, number> = { likely: 3, check: 2, unlikely: 1 };
const LEVEL_COLOR: Record<M4Level, string> = {
  likely: 'var(--reg-likely)',
  check: 'var(--reg-check)',
  unlikely: 'var(--reg-unlikely)',
};
const SEVERITY_RANK: Record<M3Level, number> = { extreme: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_COLOR: Record<M3Level, string> = {
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  extreme: 'var(--sev-extreme)',
};
const LIFECYCLE: LifecycleStatus[] = ['detected', 'dispatched', 'on_scene', 'transporting', 'at_hospital'];
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
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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
  const yesNo = (v: boolean | null) => (v === null ? t('unknown') : t(v ? 'yes' : 'no'));
  return (
    <Card size="small" title={t('crashTitle')}>
      {!crash ? (
        <p className="text-sm text-muted">{t('noCrashData')}</p>
      ) : (
        <Descriptions size="small" column={2} colon={false}>
          <Descriptions.Item label={t('speedBefore')}>
            <span className="font-mono whitespace-nowrap">{crash.speedBeforeKmh} km/h</span>
          </Descriptions.Item>
          <Descriptions.Item label={t('deltaV')}>
            <span className="font-mono whitespace-nowrap">{crash.deltaVKmh} km/h</span>
          </Descriptions.Item>
          <Descriptions.Item label={t('impact')}>{t(`impactSide.${impactSide(crash.impactDirectionDeg)}`)}</Descriptions.Item>
          <Descriptions.Item label={t('rollover')}>{yesNo(crash.rollover)}</Descriptions.Item>
          <Descriptions.Item label={t('belt')}>{yesNo(crash.beltUsed)}</Descriptions.Item>
          <Descriptions.Item label={t('airbag')}>{yesNo(crash.airbagDeployed)}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}

function InjuriesCard({ occupant, onOpenTwin }: { occupant: Occupant; onOpenTwin: () => void }) {
  const t = useTranslations('hospital');
  const tRegions = useTranslations('regions');
  const ranked = REGIONS.map((region) => ({ region, ...(occupant.m4[region] ?? { level: 'unlikely' as M4Level, probability: 0 }) })).sort(
    (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.probability - a.probability
  );
  return (
    <Card
      size="small"
      title={
        <span className="flex items-center gap-2">
          {t('whereToLook')}
          <Tooltip title={t('m4Tooltip')}>
            <InfoCircleOutlined className="text-muted" />
          </Tooltip>
        </span>
      }
      extra={
        <Button type="link" size="small" onClick={onOpenTwin}>
          {t('viewOnBody')}
        </Button>
      }
    >
      <ul className="space-y-2">
        {ranked.map(({ region, level, probability }) => (
          <li key={region} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
            <span className={level === 'unlikely' ? 'text-muted' : 'font-medium'}>{tRegions(region)}</span>
            <span className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.round(probability * 100)}%`, background: LEVEL_COLOR[level] }}
              />
            </span>
            <span className="font-mono text-xs text-end tabular-nums">{Math.round(probability * 100)}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProfileCard({ occupant }: { occupant: Occupant }) {
  const t = useTranslations('hospital');
  const { profile } = occupant;
  const list = (items?: string[]) => (items?.length ? items.join(', ') : t('none'));
  return (
    <Card size="small" title={t('patient')}>
      <Descriptions size="small" column={2} colon={false}>
        <Descriptions.Item label={t('ageSex')}>
          {t('ageValue', { age: profile.ageYears })} · {t(profile.sex === 'm' ? 'male' : 'female')}
        </Descriptions.Item>
        <Descriptions.Item label={t('bloodType')}>
          <span className="font-mono font-bold text-sev-extreme">{profile.bloodType}</span>
        </Descriptions.Item>
        <Descriptions.Item label={t('chronic')} span={2}>{list(profile.chronicDiseases)}</Descriptions.Item>
        <Descriptions.Item label={t('allergies')} span={2}>{list(profile.allergies)}</Descriptions.Item>
        <Descriptions.Item label={t('medications')} span={2}>{list(profile.medications)}</Descriptions.Item>
        {profile.emergencyContact && (
          <Descriptions.Item label={t('emergencyContact')} span={2}>
            {profile.emergencyContact.label}{' '}
            <span className="font-mono" dir="ltr">{profile.emergencyContact.phone}</span>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
}

function ArrivalRow({ arrival, eta, selected, onSelect }: { arrival: Arrival; eta: number; selected: boolean; onSelect: () => void }) {
  const t = useTranslations('hospital');
  const tStatus = useTranslations('status');
  const tSeverity = useTranslations('severity');
  const { incident, occupant } = arrival;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full text-start flex gap-3 px-4 py-3 border-b border-border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
        selected ? 'bg-brand-subtle' : 'hover:bg-surface-2'
      }`}
    >
      <span className="w-1 self-stretch rounded-full" style={{ background: SEVERITY_COLOR[occupant.m3.level] }} />
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-semibold truncate">{occupant.label}</span>
          <span className="font-mono text-sm font-semibold tabular-nums" dir="ltr">{formatEta(eta)}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">
            {t('ageValue', { age: occupant.profile.ageYears })} · {t(occupant.profile.sex === 'm' ? 'male' : 'female')} ·{' '}
            <span style={{ color: SEVERITY_COLOR[occupant.m3.level] }} className="font-semibold">
              {tSeverity(occupant.m3.level)}
            </span>
          </span>
          <span className="shrink-0">{tStatus(incident.lifecycle)}</span>
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
  const elapsed = useElapsed();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [twinOpen, setTwinOpen] = useState(false);

  // Most severe first, then soonest arrival
  const arrivals = useMemo(() => {
    const list: Arrival[] = Object.values(incidents)
      .filter((incident) => incident.lifecycle !== 'closed')
      .flatMap((incident) => incident.occupants.map((occupant) => ({ incident, occupant })));
    return list.sort(
      (a, b) =>
        SEVERITY_RANK[b.occupant.m3.level] - SEVERITY_RANK[a.occupant.m3.level] ||
        (a.incident.dispatch?.etaToHospitalS ?? DEFAULT_ETA_S) - (b.incident.dispatch?.etaToHospitalS ?? DEFAULT_ETA_S)
    );
  }, [incidents]);

  const current = arrivals.find((a) => a.occupant.id === selectedId) ?? arrivals[0] ?? null;
  const etaOf = (incident: Incident) => (incident.dispatch?.etaToHospitalS ?? DEFAULT_ETA_S) - elapsed;

  if (current && twinOpen) {
    return (
      <HospitalDashboard
        incidentId={current.incident.id}
        occupantId={current.occupant.id}
        onBack={() => setTwinOpen(false)}
      />
    );
  }

  const incident = current?.incident;
  const occupant = current?.occupant;
  const hospital =
    incident?.hospitalOptions?.find((h) => h.id === incident.dispatch?.hospitalId) ?? incident?.hospitalOptions?.[0] ?? null;
  const flags = occupant
    ? [
        ...(occupant.profile.onBloodThinners ? [t('bloodThinners')] : []),
        ...(occupant.profile.pregnant ? [t('pregnant')] : []),
        ...occupant.profile.allergies.map((a) => `${t('allergyTo')} ${a}`),
      ]
    : [];

  return (
    <div className="h-screen overflow-hidden bg-bg flex flex-col text-ink">
      <header className="h-14 shrink-0 px-5 flex items-center justify-between gap-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-base tracking-tight">{tCommon('brand')}</span>
          <span className="h-5 w-px bg-border-strong" />
          <span className="text-sm font-medium truncate">{hospital?.name ?? t('department')}</span>
          {hospital && (
            <Tag className="m-0" bordered={false}>
              {t('freeBeds')}: <strong>{hospital.freeBeds}</strong>
            </Tag>
          )}
        </div>
        <Segmented
          value="hospital"
          onChange={(role) => role === 'responder' && router.push(`/${locale}/responder`)}
          options={[
            { label: t('roleResponder'), value: 'responder' },
            { label: t('roleHospital'), value: 'hospital' },
          ]}
        />
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <SimBadge />
        </div>
      </header>

      {!online && <Alert type="warning" banner showIcon message={t('offlineBanner')} />}

      {!current || !incident || !occupant ? (
        <main className="flex-1 flex items-center justify-center">
          <EmptyState
            variant="patients"
            title={t('emptyTitle')}
            description={t('emptyDesc')}
            action={
              <Button type="primary" onClick={() => setScenarioDrawerOpen(true)}>
                {t('scenarioHint')}
              </Button>
            }
          />
        </main>
      ) : (
        <div className="flex-1 min-h-0 flex">
          <aside className="w-72 shrink-0 border-e border-border bg-surface flex flex-col">
            <div className="h-11 px-4 flex items-center justify-between border-b border-border">
              <h2 className="text-sm font-semibold">{t('incomingTitle')}</h2>
              <span className="text-xs text-muted">{arrivals.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
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

          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-6 py-5 space-y-4">
              {/* Record header */}
              <section className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight">{occupant.label}</h1>
                    <SeverityTag severity={occupant.m3.level} size="small" />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {t('ageValue', { age: occupant.profile.ageYears })} · {t(occupant.profile.sex === 'm' ? 'male' : 'female')} ·{' '}
                    <span className="font-mono">{incident.id}</span> · {incident.position?.roadLabel}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-end">
                    <div className="text-xs text-muted">{t('etaTitle')}</div>
                    <div className="font-mono text-3xl font-bold tabular-nums leading-tight" dir="ltr">
                      {formatEta(etaOf(incident))}
                    </div>
                    {incident.dispatch?.ambulanceId && (
                      <div className="text-xs text-muted">
                        {t('ambulance')} <span className="font-mono">{incident.dispatch.ambulanceId}</span>
                      </div>
                    )}
                  </div>
                  <Button type="primary" size="large" onClick={() => setTwinOpen(true)}>
                    {t('openTwin')} <ArrowRightOutlined className="rtl:rotate-180" />
                  </Button>
                </div>
              </section>

              <Card size="small">
                <Steps
                  size="small"
                  current={LIFECYCLE.indexOf(incident.lifecycle)}
                  items={LIFECYCLE.map((status) => ({ title: tStatus(status) }))}
                />
              </Card>

              {flags.length > 0 && (
                <Alert
                  type="error"
                  showIcon
                  message={t('alertsTitle')}
                  description={
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {flags.map((f) => (
                        <Tag key={f} color="error" className="m-0">{f}</Tag>
                      ))}
                    </div>
                  }
                />
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-4">
                  <ProfileCard occupant={occupant} />
                  {occupant.vitals ? (
                    <VitalsCard vitals={occupant.vitals} />
                  ) : (
                    <Card size="small" title={t('liveVitals')}>
                      <p className="text-sm text-muted">{t('noVitals')}</p>
                    </Card>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <CrashCard crash={incident.crash} />
                    <InjuriesCard occupant={occupant} onOpenTwin={() => setTwinOpen(true)} />
                  </div>
                </div>
                <div className="space-y-4">
                  <PrepChecklist key={incident.id} items={incident.prep} />
                  <Card size="small" title={t('timelineTitle')}>
                    <TimelineList events={incident.timeline} />
                  </Card>
                </div>
              </div>

              <p className="text-center text-xs text-muted">{tCommon('medicalDisclaimer')}</p>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
