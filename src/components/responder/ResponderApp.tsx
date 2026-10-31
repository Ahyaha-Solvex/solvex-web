'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Alert, Button, Drawer, Empty, Popconfirm, Popover, Segmented, Select, Slider, Tabs, Tag, Tooltip, notification } from 'antd';
import {
  CarOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  PhoneOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useReplayStore } from '@/lib/stores/replayStore';
import { useIncidentSource } from '@/components/app/SourceProvider';
import type { Incident, LifecycleStatus, M3Level, PhoneReport, TriageColor } from '@/lib/data/types';

import { SimBadge } from '@/components/app/SimBadge';
import { ConfidenceLadder } from '@/components/app/ConfidenceLadder';
import { AmbulanceTable } from '@/components/app/AmbulanceTable';
import { TimelineList } from '@/components/app/TimelineList';
import { SmsFeed } from '@/components/app/SmsFeed';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { ReplayControls } from '@/components/stage/ReplayControls';
import { TelemetryReadout } from '@/components/stage/TelemetryReadout';
import { NewCallModal } from './NewCallModal';
import { ZoneAlert } from './ZoneAlert';

const CrashScene = dynamic(() => import('@/components/stage/CrashScene'), { ssr: false });
const MiniMap = dynamic(() => import('@/components/stage/MiniMap'), { ssr: false });

const SEVERITY_COLOR: Record<M3Level, string> = {
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  extreme: 'var(--sev-extreme)',
};
const SEVERITY_RANK: Record<M3Level, number> = { low: 0, medium: 1, high: 2, extreme: 3 };
const TRIAGE: TriageColor[] = ['green', 'yellow', 'red', 'black'];
const TRIAGE_COLOR: Record<TriageColor, string> = {
  green: '#2A7F6F',
  yellow: '#D9A400',
  red: '#D21034',
  black: '#14201A',
};
const LIFECYCLE: LifecycleStatus[] = ['detected', 'dispatched', 'on_scene', 'transporting', 'at_hospital'];
const DEFAULT_RADIUS_M = 2000;

function worst(incident: Incident): M3Level | null {
  return incident.occupants.reduce<M3Level | null>(
    (level, o) => (!level || SEVERITY_RANK[o.m3.level] > SEVERITY_RANK[level] ? o.m3.level : level),
    null
  );
}

function minutes(seconds?: number) {
  return seconds === undefined ? '--' : String(Math.max(1, Math.round(seconds / 60)));
}

/** Small uppercase heading used by every panel section. */
function SectionTitle({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">{children}</h3>
      {extra}
    </div>
  );
}

/** A figure laid over the stage: label above, big mono value. */
function StageFigure({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-[#0B1310]/80 backdrop-blur-md border border-white/10">
      <div className="text-[10px] uppercase font-mono tracking-wider text-[#8FA097]">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-xl font-bold tabular-nums" style={{ color: tone ?? '#E8EEEA' }}>
          {value}
        </span>
        {unit && <span className="text-[10px] font-mono text-[#8FA097]">{unit}</span>}
      </div>
    </div>
  );
}

export function ResponderApp() {
  const t = useTranslations('responder');
  const tw = useTranslations('responder.workspace');
  const tCommon = useTranslations('common');
  const tSeverity = useTranslations('severity');
  const tStatus = useTranslations('status');
  const tHospital = useTranslations('hospital');
  const locale = useLocale();
  const router = useRouter();
  const rtl = locale === 'ar';
  const placement = rtl ? 'topLeft' : 'topRight';

  const { incidents, activeIncidentId, ambulances, online, selectIncident } = useIncidentStore();
  const source = useIncidentSource();
  const incident: Incident | null = activeIncidentId ? incidents[activeIncidentId] ?? null : null;

  const [stageView, setStageView] = useState<'scene' | 'map'>('scene');
  const [ambulancesOpen, setAmbulancesOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);

  const queue = useMemo(
    () =>
      Object.values(incidents)
        .filter((i) => i.lifecycle !== 'closed')
        .sort((a, b) => b.confidence.score - a.confidence.score || b.createdAt.localeCompare(a.createdAt)),
    [incidents]
  );

  const confirmed = incident?.confidence.status === 'confirmed';
  const assigned = Boolean(incident?.dispatch.ambulanceId);
  const hasTelemetry = Boolean(incident?.telemetry) && incident?.channel === 'data';
  // Without telemetry there is no crash to replay: the map is the honest picture.
  const view = hasTelemetry ? stageView : 'map';
  const level = incident ? worst(incident) : null;
  const ambulance = ambulances.find((a) => a.id === incident?.dispatch.ambulanceId);
  const contact = incident?.occupants[0]?.profile.emergencyContact;
  const stepIndex = incident ? LIFECYCLE.indexOf(incident.lifecycle) : -1;

  // Opening an incident plays its crash once, from the drive up to the wreck at rest.
  useEffect(() => {
    if (!hasTelemetry || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const replay = useReplayStore.getState();
    replay.setTime(0);
    replay.play();
  }, [activeIncidentId, hasTelemetry]);

  const alertZone = Object.values(incidents).find(
    (i) => i.deadZone && !i.deadZone.acknowledged && i.deadZone.phase !== 'in_zone' && i.lifecycle !== 'closed'
  );
  const helpers = useMemo(
    () => [...(incident?.nearbyPeople ?? [])].filter((p) => p.kind !== 'staff').sort((a, b) => a.distanceM - b.distanceM),
    [incident]
  );

  const confirmCrash = () => {
    if (!incident) return;
    source.confirm(incident.id);
    notification.success({ message: t('actions.confirm'), description: incident.position.roadLabel, placement });
  };

  const assignAmbulance = (ambulanceId: string) => {
    if (!incident) return;
    source.assignAmbulance(incident.id, ambulanceId);
    setAmbulancesOpen(false);
    notification.success({ message: t('actions.assignAmbulance'), description: ambulanceId, placement });
  };

  const broadcast = () => {
    if (!incident) return;
    source.callForHelp(incident.id, radiusM);
    setBroadcastOpen(false);
    notification.info({ message: t('actions.callForHelp'), description: `${radiusM} m`, placement });
  };

  const closeMission = () => {
    if (!incident) return;
    source.close(incident.id);
    selectIncident(queue.find((i) => i.id !== incident.id)?.id ?? null);
  };

  const logCall = (report: PhoneReport) => {
    selectIncident(source.reportPhoneCall(report));
    setCallOpen(false);
  };

  const broadcastPanel = (
    <div className="w-64 space-y-3">
      <p className="text-xs text-muted">{t('radiusSliderDesc')}</p>
      <div className="flex justify-between font-mono text-xs">
        <span className="text-muted">{t('radiusSliderTitle')}</span>
        <span className="font-bold text-brand">{radiusM} m</span>
      </div>
      <Slider min={500} max={20000} step={500} value={radiusM} onChange={setRadiusM} />
      <Button type="primary" block size="small" icon={<SendOutlined />} onClick={broadcast}>
        {t('broadcastConfirm')}
      </Button>
    </div>
  );

  // The three dispatcher steps, done in order; the first open one is the highlighted button.
  const steps = [
    { key: 'confirm', done: confirmed, label: t('actions.confirm'), icon: <SafetyCertificateOutlined />, onClick: confirmCrash },
    {
      key: 'ambulance',
      done: assigned,
      label: assigned ? `${t('assignedAmbulance')} · ${ambulance?.unit ?? incident?.dispatch.ambulanceId}` : t('actions.assignAmbulance'),
      icon: <CarOutlined />,
      onClick: () => setAmbulancesOpen(true),
    },
  ];
  const nextStep = steps.find((s) => !s.done)?.key;

  return (
    <div className="h-screen overflow-hidden bg-bg flex flex-col text-ink text-[13px]">
      <header className="h-12 shrink-0 px-4 flex items-center justify-between gap-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-sm tracking-tight">{tCommon('brand')}</span>
          <span className="h-4 w-px bg-border-strong" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{tw('title')}</span>
        </div>
        <Segmented
          size="small"
          value="responder"
          onChange={(role) => role === 'hospital' && router.push(`/${locale}/hospital`)}
          options={[
            { label: tHospital('roleResponder'), value: 'responder' },
            { label: tHospital('roleHospital'), value: 'hospital' },
          ]}
        />
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-brand" />
            {tw('available', { count: ambulances.filter((a) => a.status === 'available').length })}
          </span>
          <LangSwitcher />
          <SimBadge />
        </div>
      </header>

      {!online && <Alert type="warning" banner showIcon message={t('offlineBanner')} />}

      {alertZone?.deadZone && (
        <ZoneAlert
          zone={alertZone.deadZone}
          onWarn={(message) => source.warnDriver(alertZone.id, message)}
          onAcknowledge={() => source.acknowledge(alertZone.id)}
        />
      )}

      <div className="flex-1 min-h-0 flex gap-3 p-3">
        {/* Queue */}
        <aside className="w-60 shrink-0 flex flex-col rounded-2xl bg-surface border border-border overflow-hidden" aria-label={t('queueTitle')}>
          <div className="p-2.5">
            <Button block type="primary" icon={<PlusOutlined />} onClick={() => setCallOpen(true)}>
              {t('call.open')}
            </Button>
          </div>
          <div className="px-3 pb-1.5 flex items-center justify-between">
            <SectionTitle>{t('queueTitle')}</SectionTitle>
            <span className="text-[11px] font-mono text-muted mb-2">{queue.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {queue.length === 0 && <p className="p-3 text-xs text-muted">{t('noIncidents')}</p>}
            {queue.map((item) => {
              const itemLevel = worst(item);
              const selected = item.id === activeIncidentId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={selected}
                  onClick={() => selectIncident(item.id)}
                  className={`w-full text-start rounded-xl px-3 py-2 border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                    selected ? 'border-brand bg-brand-subtle' : 'border-transparent hover:bg-surface-2'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: itemLevel ? SEVERITY_COLOR[itemLevel] : 'var(--muted)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                      {itemLevel ? tSeverity(itemLevel) : '--'}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {new Date(item.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] font-semibold">{item.position.roadLabel}</span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted">
                    <span className="truncate">{t(`origin.${item.deadZone ? 'zone' : item.phoneReport ? 'phone' : 'blackbox'}`)}</span>
                    <span className="shrink-0">{tStatus(item.lifecycle)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Stage and victims */}
        <main className="flex-1 min-w-0 flex flex-col gap-3">
          <section className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-stage-bg">
            {/* Both stay mounted: rebuilding a WebGL context on every swap flickers */}
            <div className={view === 'scene' ? 'absolute inset-0' : 'absolute inset-0 invisible'}>
              {hasTelemetry && <CrashScene incident={incident} active={view === 'scene'} />}
            </div>
            <div className={view === 'map' ? 'absolute inset-0' : 'absolute inset-0 invisible'}>
              <MiniMap incident={incident} ambulances={ambulances} isPip={false} />
            </div>

            {incident && (
              <>
                <div className="absolute top-3 start-3 end-3 flex items-start justify-between gap-3 pointer-events-none">
                  <div className="pointer-events-auto flex items-center gap-2">
                    {hasTelemetry && (
                      <Segmented
                        size="small"
                        value={view}
                        onChange={(v) => setStageView(v as 'scene' | 'map')}
                        options={[
                          { label: tw('replay3d'), value: 'scene' },
                          { label: t('viewMap'), value: 'map' },
                        ]}
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <StageFigure
                      label={tw('etaScene')}
                      value={assigned ? minutes(incident.dispatch.etaToSceneS) : '--'}
                      unit="min"
                      tone="#F2B705"
                    />
                    <StageFigure label={tw('etaHospital')} value={assigned ? minutes(incident.dispatch.etaToHospitalS) : '--'} unit="min" />
                    <StageFigure label={tw('helpersOnWay')} value={String(helpers.filter((h) => h.accepted).length)} />
                  </div>
                </div>

                {view === 'scene' && (
                  <div className="absolute bottom-3 start-3 flex flex-col gap-2 items-start">
                    <TelemetryReadout crash={incident.crash} telemetry={incident.telemetry} />
                    <ReplayControls />
                  </div>
                )}
              </>
            )}

            {incident?.channel === 'sms' && (
              <div className="absolute bottom-3 start-3 max-w-md rounded-xl bg-[#0B1310]/85 px-3 py-2 text-xs text-amber-300 border border-amber-500/30">
                {t('smsOnly')}
              </div>
            )}
          </section>

          {/* Victims */}
          {incident && (
            <section className="shrink-0 rounded-2xl bg-surface border border-border px-4 pt-3 pb-2">
              <SectionTitle extra={<span className="text-[11px] text-muted">{tw('victims', { count: incident.occupants.length })}</span>}>
                {tw('victimsTitle')}
              </SectionTitle>
              <div className="max-h-36 overflow-y-auto">
                <table className="w-full">
                  <tbody>
                    {incident.occupants.map((o) => (
                      <tr key={o.id} className="border-t border-border first:border-t-0">
                        <td className="py-1.5 pe-3 w-1">
                          <span className="block w-1 h-7 rounded-full" style={{ background: SEVERITY_COLOR[o.m3.level] }} />
                        </td>
                        <td className="py-1.5 pe-3 whitespace-nowrap">
                          <span className="font-semibold">{o.label}</span>
                          <span className="ms-2 text-[11px] text-muted">
                            {o.profile.ageYears > 0 && `${tHospital('ageValue', { age: o.profile.ageYears })} · `}
                            {tHospital(o.profile.sex === 'm' ? 'male' : 'female')}
                            {o.profile.bloodType && ` · ${o.profile.bloodType}`}
                          </span>
                        </td>
                        <td className="py-1.5 pe-3 whitespace-nowrap">
                          <span className="font-semibold" style={{ color: SEVERITY_COLOR[o.m3.level] }}>
                            {tSeverity(o.m3.level)}
                          </span>
                          <span className="ms-1.5 font-mono text-[11px] text-muted">{Math.round(o.m3.probability * 100)}%</span>
                        </td>
                        <td className="py-1.5 pe-3">
                          <div className="flex gap-1" role="radiogroup" aria-label={tw('triage')}>
                            {TRIAGE.map((color) => (
                              <Tooltip key={color} title={tw(`triageColor.${color}`)}>
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={o.triageColor === color}
                                  aria-label={tw(`triageColor.${color}`)}
                                  onClick={() => source.setTriage(incident.id, o.id, color)}
                                  className={`w-5 h-5 rounded-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                                    o.triageColor === color ? 'ring-2 ring-offset-1 ring-ink' : 'opacity-30 hover:opacity-70'
                                  }`}
                                  style={{ background: TRIAGE_COLOR[color] }}
                                />
                              </Tooltip>
                            ))}
                          </div>
                        </td>
                        <td className="py-1.5 pe-3">
                          <Select
                            size="small"
                            variant="borderless"
                            className="w-52"
                            value={o.hospitalId ?? incident.dispatch.hospitalId ?? incident.hospitalOptions[0]?.id}
                            onChange={(id) => source.assignHospital(incident.id, o.id, id)}
                            options={incident.hospitalOptions.map((h) => ({
                              value: h.id,
                              label: `${h.name} · ${h.freeBeds} ${t('freeBeds')}`,
                            }))}
                          />
                        </td>
                        <td className="py-1.5 text-end">
                          <Button size="small" type="link" onClick={() => router.push(`/${locale}/hospital`)}>
                            {tw('digitalTwin')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>

        {/* Incident panel */}
        <aside className="w-[360px] shrink-0 flex flex-col rounded-2xl bg-surface border border-border overflow-hidden">
          {!incident ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <Empty description={t('selectIncidentPrompt')} />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-muted">
                  <span>{incident.id}</span>
                  <span>{t(`origin.${incident.deadZone ? 'zone' : incident.phoneReport ? 'phone' : 'blackbox'}`)}</span>
                </div>
                <h1 className="mt-1 text-lg font-bold leading-tight tracking-tight">{incident.position.roadLabel}</h1>
                {level && (
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight" style={{ color: SEVERITY_COLOR[level] }}>
                      {tSeverity(level)}
                    </span>
                    <span className="text-[11px] text-muted">{incident.phoneReport ? t('phoneTriage') : tw('worstVictim')}</span>
                  </div>
                )}
                <div className="mt-3">
                  <ConfidenceLadder score={incident.confidence.score} status={incident.confidence.status} />
                </div>

                {/* Mission progress */}
                <ol className="mt-3 grid grid-cols-5 gap-1" aria-label={tw('progress')}>
                  {LIFECYCLE.map((status, i) => (
                    <li key={status} className="flex flex-col gap-1">
                      <span className={`h-1 rounded-full ${i <= stepIndex ? 'bg-brand' : 'bg-surface-2'}`} />
                      <span className={`text-[10px] leading-tight ${i === stepIndex ? 'font-semibold text-ink' : 'text-muted'}`}>
                        {tStatus(status)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                {/* Steps */}
                <div className="p-4 space-y-2 border-b border-border">
                  {steps.map((step) => (
                    <Button
                      key={step.key}
                      block
                      type={step.key === nextStep ? 'primary' : 'default'}
                      icon={step.done ? <CheckCircleFilled className="text-brand" /> : step.icon}
                      disabled={step.key === 'confirm' && step.done}
                      onClick={step.onClick}
                      className="!justify-start"
                    >
                      {step.label}
                    </Button>
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <Popover content={broadcastPanel} trigger="click" open={broadcastOpen} onOpenChange={setBroadcastOpen}>
                      <Button block size="small" icon={<TeamOutlined />}>
                        {t('actions.callForHelp')}
                      </Button>
                    </Popover>
                    <Popconfirm
                      title={t('closeConfirmTitle')}
                      description={t('closeConfirmDesc')}
                      onConfirm={closeMission}
                      okButtonProps={{ danger: true }}
                    >
                      <Button block size="small" danger icon={<CloseCircleOutlined />}>
                        {t('actions.close')}
                      </Button>
                    </Popconfirm>
                  </div>
                  {incident.yellowLineDrivers !== undefined && (
                    <p className="rounded-lg bg-sev-medium px-3 py-1.5 text-[11px] font-semibold text-ink">
                      {t('yellowLine', { count: incident.yellowLineDrivers })}
                    </p>
                  )}
                </div>

                {/* Calls */}
                <div className="p-4 border-b border-border">
                  <SectionTitle>{tw('contactsTitle')}</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="small" icon={<PhoneOutlined />} onClick={() => source.callContact(incident.id, 'driver')}>
                      {tw('callDriverShort')}
                    </Button>
                    <Tooltip title={contact ? `${contact.label} · ${contact.phone}` : undefined}>
                      <Button size="small" icon={<PhoneOutlined />} disabled={!contact} onClick={() => source.callContact(incident.id, 'contact')}>
                        {tw('callContactShort')}
                      </Button>
                    </Tooltip>
                  </div>
                </div>

                {/* Helpers */}
                <div className="p-4 border-b border-border">
                  <SectionTitle
                    extra={
                      <button type="button" className="text-[11px] font-semibold text-brand" onClick={() => setBroadcastOpen(true)}>
                        {tw('widen')}
                      </button>
                    }
                  >
                    {t('helpersTitle')}
                  </SectionTitle>
                  {helpers.length === 0 ? (
                    <p className="text-xs text-muted">{tw('noHelpers')}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {helpers.map((person) => (
                        <li key={person.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">
                            <span className="font-medium">{person.name ?? t(`kind.${person.kind}`)}</span>
                            <span className="ms-1.5 text-[11px] text-muted">
                              {t(`kind.${person.kind}`)} · <span className="font-mono">{person.distanceM} m</span>
                            </span>
                          </span>
                          {person.confirmed ? (
                            <Tag color="success" className="m-0 text-[11px]">
                              {tw('cardsSentShort')}
                            </Tag>
                          ) : person.accepted ? (
                            <Button size="small" type="primary" onClick={() => source.confirmHelper(incident.id, person.id)}>
                              {tw('confirmHelperShort')}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              icon={<PhoneOutlined />}
                              disabled={person.called}
                              onClick={() => source.callVolunteer(incident.id, person.id)}
                            >
                              {t(person.called ? 'volunteerCalling' : 'callVolunteer')}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Log */}
                <div className="px-4 pb-4">
                  <Tabs
                    size="small"
                    items={[
                      { key: 'timeline', label: t('timelineTitle'), children: <TimelineList events={incident.timeline} /> },
                      { key: 'sms', label: 'SMS', children: <SmsFeed messages={incident.sms} networkOnline={online} /> },
                    ]}
                  />
                </div>
              </div>
            </>
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
        <AmbulanceTable ambulances={ambulances} assignedId={incident?.dispatch.ambulanceId} onAssign={assignAmbulance} />
      </Drawer>

      <NewCallModal open={callOpen} onClose={() => setCallOpen(false)} onSubmit={logCall} />
    </div>
  );
}

export default ResponderApp;
