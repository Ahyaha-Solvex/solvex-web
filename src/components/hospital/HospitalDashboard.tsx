'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Alert, Button, Descriptions, Drawer, Segmented, Tag, Tooltip, notification } from 'antd';
import { ArrowLeftOutlined, FileTextOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useUiStore } from '@/lib/stores/uiStore';
import type { BodyRegion, LifecycleStatus, M3Level, M4Level, Occupant, Vitals } from '@/lib/data/types';
import type { RegionPoints } from '@/components/stage/Body3D';

import { SimBadge } from '@/components/app/SimBadge';
import { PrepChecklist } from '@/components/app/PrepChecklist';
import { EmptyState } from '@/components/app/EmptyState';
import { LangSwitcher } from '@/components/ui/LangSwitcher';

const Body3D = dynamic(() => import('@/components/stage/Body3D'), { ssr: false });

const REGIONS: BodyRegion[] = ['head', 'face', 'spine_neck', 'thorax', 'abdomen', 'arms', 'legs'];
const LEVEL_RANK: Record<M4Level, number> = { likely: 3, check: 2, unlikely: 1 };
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
const LIFECYCLE: LifecycleStatus[] = ['detected', 'dispatched', 'on_scene', 'transporting', 'at_hospital'];
const LEADER_ELBOW = 20;
const DEFAULT_ETA_S = 420;

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);
  return left;
}

function Trace({ data, alarm }: { data: number[]; alarm: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const range = Math.max(...data) - min || 1;
  const points = data
    .map((v, i) => `${((i / (data.length - 1)) * 100).toFixed(1)},${(26 - ((v - min) / range) * 24).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="w-20 h-7" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={alarm ? 'var(--sev-high)' : 'var(--brand)'}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Vital({ label, value, unit, alarm, trace }: { label: string; value: string; unit: string; alarm: boolean; trace?: number[] }) {
  return (
    <div className="flex items-end gap-3">
      <div>
        <div className="text-xs font-medium text-muted">{label}</div>
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-3xl font-bold tabular-nums ${alarm ? 'text-sev-high' : 'text-ink'}`}>{value}</span>
          <span className="text-xs text-muted">{unit}</span>
        </div>
      </div>
      {trace && <Trace data={trace} alarm={alarm} />}
    </div>
  );
}

function VitalsStrip({ vitals }: { vitals?: Vitals }) {
  const t = useTranslations('hospital');
  if (!vitals) return <p className="text-sm text-muted">{t('noVitals')}</p>;
  const history = vitals.history ?? [];
  const series = (key: 'hr' | 'spo2') => history.flatMap((p) => (p[key] === undefined ? [] : [p[key] as number]));
  const { hr, spo2, bpSys, bpDia } = vitals;
  const hrAlarm = hr !== undefined && (hr < 50 || hr > 120);
  const spo2Alarm = spo2 !== undefined && spo2 < 92;
  const bpAlarm = bpSys !== undefined && bpSys < 90;

  return (
    <div className="flex items-end gap-8" title={t('displayHint')}>
      <Vital label={t('hr')} value={hr === undefined ? '--' : String(hr)} unit="bpm" alarm={hrAlarm} trace={series('hr')} />
      <Vital label={t('spo2')} value={spo2 === undefined ? '--' : String(spo2)} unit="%" alarm={spo2Alarm} trace={series('spo2')} />
      <Vital label={t('bp')} value={bpSys === undefined ? '--' : `${bpSys}/${bpDia ?? '--'}`} unit="mmHg" alarm={bpAlarm} />
      <span className="pb-1 text-xs text-muted">{t(`vitalsSource.${vitals.source}`)}</span>
    </div>
  );
}

function PatientFile({ occupant }: { occupant: Occupant }) {
  const t = useTranslations('hospital');
  const { profile } = occupant;
  const list = (items?: string[]) => (items?.length ? items.join(', ') : t('none'));
  return (
    <Descriptions size="small" column={1} bordered>
      <Descriptions.Item label={t('ageSex')}>
        {t('ageValue', { age: profile.ageYears })} · {t(profile.sex === 'm' ? 'male' : 'female')}
      </Descriptions.Item>
      <Descriptions.Item label={t('bloodType')}>{profile.bloodType}</Descriptions.Item>
      <Descriptions.Item label={t('chronic')}>{list(profile.chronicDiseases)}</Descriptions.Item>
      <Descriptions.Item label={t('allergies')}>{list(profile.allergies)}</Descriptions.Item>
      <Descriptions.Item label={t('medications')}>{list(profile.medications)}</Descriptions.Item>
      {profile.emergencyContact && (
        <Descriptions.Item label={t('emergencyContact')}>
          {profile.emergencyContact.label}{' '}
          <span className="font-mono" dir="ltr">{profile.emergencyContact.phone}</span>
        </Descriptions.Item>
      )}
    </Descriptions>
  );
}

export interface HospitalDashboardProps {
  incidentId?: string;
  occupantId?: string;
  onBack?: () => void;
}

export function HospitalDashboard({ incidentId, occupantId: initialOccupant, onBack }: HospitalDashboardProps = {}) {
  const t = useTranslations('hospital');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('status');
  const tRegions = useTranslations('regions');
  const tSeverity = useTranslations('severity');
  const locale = useLocale();
  const router = useRouter();
  const rtl = locale === 'ar';

  const { incidents, activeIncidentId, online } = useIncidentStore();
  const { hoveredRegion, selectedRegion, setHoveredRegion, setSelectedRegion, setScenarioDrawerOpen } = useUiStore();
  const shownId = incidentId ?? activeIncidentId;
  const incident = shownId ? incidents[shownId] : null;

  const [occupantId, setOccupantId] = useState<string | null>(initialOccupant ?? null);
  const [viewMode, setViewMode] = useState<'front' | 'back' | 'free'>('front');
  const [resetNonce, setResetNonce] = useState(0);
  const [fileOpen, setFileOpen] = useState(false);

  const occupant = incident?.occupants.find((o) => o.id === occupantId) ?? incident?.occupants[0] ?? null;

  const previousIncident = useRef<string | null>(null);
  useEffect(() => {
    if (activeIncidentId && previousIncident.current && previousIncident.current !== activeIncidentId) {
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
    return REGIONS.map((region) => ({ region, ...(occupant.m4[region] ?? { level: 'unlikely' as M4Level, probability: 0 }) })).sort(
      (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.probability - a.probability
    );
  }, [occupant]);
  const flagged = ranked.filter((r) => r.level !== 'unlikely');
  const quiet = ranked.filter((r) => r.level === 'unlikely');

  const hospital =
    incident?.hospitalOptions?.find((h) => h.id === incident.dispatch?.hospitalId) ?? incident?.hospitalOptions?.[0] ?? null;

  const left = useCountdown(incident?.dispatch?.etaToHospitalS ?? DEFAULT_ETA_S);
  const minutes = String(Math.floor(left / 60)).padStart(2, '0');
  const seconds = String(left % 60).padStart(2, '0');
  const stepIndex = incident ? LIFECYCLE.indexOf(incident.lifecycle) : -1;

  // The lines are written straight to the DOM: they follow the camera on every frame.
  const stage = useRef<HTMLDivElement>(null);
  const rows = useRef<Partial<Record<BodyRegion, HTMLElement | null>>>({});
  const leaders = useRef<Partial<Record<BodyRegion, SVGPathElement | null>>>({});
  const handleProject = useCallback(
    (points: RegionPoints) => {
      const box = stage.current?.getBoundingClientRect();
      if (!box) return;
      for (const region of REGIONS) {
        const row = rows.current[region];
        const line = leaders.current[region];
        const point = points[region];
        if (!row || !line || !point) continue;
        const rect = row.getBoundingClientRect();
        const x = (rtl ? rect.right : rect.left) - box.left;
        const y = rect.top + rect.height / 2 - box.top;
        const elbow = x + (rtl ? LEADER_ELBOW : -LEADER_ELBOW);
        line.setAttribute('d', `M${x} ${y} H${elbow} L${point[0]} ${point[1]}`);
      }
    },
    [rtl]
  );

  const resetView = () => {
    setViewMode('front');
    setSelectedRegion(null);
    setResetNonce((n) => n + 1);
  };

  return (
    <div className="h-screen overflow-hidden bg-bg flex flex-col text-ink">
      <header className="h-16 shrink-0 px-6 flex items-center justify-between z-30">
        {onBack ? (
          <Button
            type="primary"
            size="large"
            icon={<ArrowLeftOutlined className="rtl:rotate-180" />}
            onClick={onBack}
          >
            {t('backToRecord')}
          </Button>
        ) : (
          <span className="font-bold text-base tracking-tight">{tCommon('brand')}</span>
        )}
        {onBack ? (
          <span className="font-semibold text-sm">{occupant?.label}</span>
        ) : (
        <Segmented
          value="hospital"
          onChange={(role) => role === 'responder' && router.push(`/${locale}/responder`)}
          options={[
            { label: t('roleResponder'), value: 'responder' },
            { label: t('roleHospital'), value: 'hospital' },
          ]}
        />
        )}
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <SimBadge />
        </div>
      </header>

      {!online && <Alert type="warning" banner showIcon message={t('offlineBanner')} />}

      {!incident || !occupant ? (
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
        <main ref={stage} className="relative flex-1 min-h-0 overflow-hidden">
          {/* The countdown is the page: the body stands in front of it */}
          <div
            dir="ltr"
            role="timer"
            aria-label={t('etaTitle')}
            className="absolute inset-x-0 top-6 flex justify-center font-mono font-bold leading-none tracking-tighter tabular-nums select-none pointer-events-none"
            style={{ fontSize: 'var(--type-eta)', color: SEVERITY_COLOR[occupant.m3.level] }}
          >
            {minutes}
            <span className="opacity-20">:</span>
            {seconds}
          </div>

          <div className="absolute inset-0">
            <Body3D
              key={resetNonce}
              occupant={occupant}
              viewMode={viewMode}
              onReset={resetView}
              onProject={handleProject}
              projectSide={rtl ? 'l' : 'r'}
            />
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            {flagged.map(({ region, level }) => (
              <path
                key={region}
                ref={(node) => {
                  leaders.current[region] = node;
                }}
                fill="none"
                stroke={LEVEL_COLOR[level]}
                strokeWidth={hoveredRegion === region || selectedRegion === region ? 2 : 1}
                strokeOpacity={level === 'likely' || hoveredRegion === region || selectedRegion === region ? 1 : 0}
              />
            ))}
          </svg>

          {/* Arrival line and journey */}
          <div className="absolute top-0 inset-x-6 flex items-center justify-between gap-6 text-xs font-medium text-muted">
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-ink font-semibold">{t('arrival')}</span>
              {incident.dispatch?.ambulanceId && <span className="font-mono">{incident.dispatch.ambulanceId}</span>}
              <span className="truncate">{incident.position?.roadLabel}</span>
            </span>
            <ol className="flex items-center gap-3" aria-label={t('arrival')}>
              {LIFECYCLE.map((status, i) => (
                <li key={status} className={`flex items-center gap-1.5 ${i <= stepIndex ? 'text-ink' : ''}`}>
                  <span className={`w-2 h-2 rounded-full ${i <= stepIndex ? 'bg-brand' : 'bg-border-strong'}`} />
                  {i === stepIndex && tStatus(status)}
                </li>
              ))}
            </ol>
          </div>

          {/* Who is coming */}
          <section className="absolute bottom-28 start-6 w-[clamp(240px,23vw,340px)]">
            {incident.occupants.length > 1 && (
              <div className="flex gap-1 mb-3" role="tablist">
                {incident.occupants.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="tab"
                    aria-selected={o.id === occupant.id}
                    onClick={() => {
                      setOccupantId(o.id);
                      setSelectedRegion(null);
                    }}
                    className={`h-8 px-3 rounded-full text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                      o.id === occupant.id ? 'bg-ink text-white' : 'bg-surface-2 text-ink-2'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold tracking-tight" style={{ color: SEVERITY_COLOR[occupant.m3.level] }}>
                {tSeverity(occupant.m3.level)}
              </span>
              <span className="font-mono text-sm text-muted">
                {t('rankingScore')} {Math.round(occupant.m3.probability * 100)}%
              </span>
            </div>
            {occupant.m3.escalatedBy && occupant.m3.escalatedBy.length > 0 && (
              <p className="mt-1 text-xs text-sev-high">
                {t('raisedBy')}: {occupant.m3.escalatedBy.join(', ')}
              </p>
            )}
            <p className="mt-3 text-lg font-semibold">
              {occupant.label}
              {occupant.profile.ageYears > 0 &&
                ` · ${t('ageValue', { age: occupant.profile.ageYears })} · ${t(occupant.profile.sex === 'm' ? 'male' : 'female')}`}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-bold text-sev-extreme">{occupant.profile.bloodType}</span>
              {occupant.profile.onBloodThinners && <Tag color="error" className="m-0">{t('bloodThinners')}</Tag>}
              {occupant.profile.pregnant && <Tag color="purple" className="m-0">{t('pregnant')}</Tag>}
              {occupant.profile.allergies?.map((a) => <Tag key={a} color="warning" className="m-0">{a}</Tag>)}
            </div>
          </section>

          {/* Where to look first */}
          <section className="absolute bottom-28 end-6 w-[clamp(240px,23vw,340px)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">{t('whereToLook')}</h2>
              <Tooltip title={t('m4Tooltip')}>
                <span className="flex items-center gap-1 text-xs text-muted cursor-help">
                  <InfoCircleOutlined />
                  {t('m4Estimate')}
                </span>
              </Tooltip>
            </div>
            <ul>
              {flagged.map(({ region, level, probability }) => (
                <li key={region}>
                  <button
                    type="button"
                    ref={(node) => {
                      rows.current[region] = node;
                    }}
                    aria-pressed={selectedRegion === region}
                    onClick={() => setSelectedRegion(selectedRegion === region ? null : region)}
                    onMouseEnter={() => setHoveredRegion(region)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    className={`w-full py-2 text-start border-t border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                      selectedRegion === region ? 'bg-surface-2' : ''
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-xl font-bold tracking-tight">{tRegions(region)}</span>
                      <span className="text-xs font-semibold" style={{ color: level === 'likely' ? LEVEL_COLOR.likely : 'var(--ink-2)' }}>
                        {tRegions(level)} <span className="font-mono">{Math.round(probability * 100)}%</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {quiet.length > 0 && (
              <p className="pt-2 border-t border-border-strong text-xs text-muted">
                {tRegions('unlikely')}: {quiet.map((r) => tRegions(r.region)).join(', ')}
              </p>
            )}
          </section>

          {/* Vitals and controls */}
          <div className="absolute bottom-0 inset-x-6 h-24 flex items-center justify-between gap-6 pointer-events-none">
            <div className="pointer-events-auto">
              <VitalsStrip vitals={occupant.vitals} />
            </div>
            <div className="flex items-center gap-2 pe-14 pointer-events-auto">
              <Segmented
                value={viewMode}
                onChange={(mode) => setViewMode(mode as 'front' | 'back' | 'free')}
                options={[
                  { label: t('viewFront'), value: 'front' },
                  { label: t('viewBack'), value: 'back' },
                  { label: t('viewFree'), value: 'free' },
                ]}
              />
              <Tooltip title={t('resetView')}>
                <Button aria-label={t('resetView')} icon={<ReloadOutlined />} onClick={resetView} />
              </Tooltip>
              <Button type="primary" icon={<FileTextOutlined />} onClick={() => setFileOpen(true)}>
                {t('patientFile')}
              </Button>
            </div>
          </div>

          <p className="absolute bottom-1 inset-x-0 text-center text-xs text-muted pointer-events-none">
            {tCommon('medicalDisclaimer')}
          </p>

          <Drawer
            open={fileOpen}
            onClose={() => setFileOpen(false)}
            placement={rtl ? 'left' : 'right'}
            width={440}
            title={occupant.label}
          >
            <div className="space-y-6">
              <PatientFile occupant={occupant} />
              {incident.prep?.length > 0 && <PrepChecklist items={incident.prep} />}
              {hospital && (
                <section>
                  <h3 className="text-sm font-semibold">{hospital.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {t('freeBeds')}: <strong className="text-ink">{hospital.freeBeds}</strong>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hospital.specialties.map((s) => <Tag key={s} className="m-0">{s}</Tag>)}
                  </div>
                </section>
              )}
            </div>
          </Drawer>
        </main>
      )}
    </div>
  );
}
