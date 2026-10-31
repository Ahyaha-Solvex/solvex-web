'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Alert, Button, Drawer, Popconfirm, Popover, Segmented, Slider, Tabs, notification } from 'antd';
import {
  CarOutlined,
  CloseCircleOutlined,
  PhoneOutlined,
  PlusOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useLocale, useTranslations } from 'next-intl';

import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useReplayStore } from '@/lib/stores/replayStore';
import { useIncidentSource } from '@/components/app/SourceProvider';
import type { Incident, M3Level, PhoneReport } from '@/lib/data/types';

import { SimBadge } from '@/components/app/SimBadge';
import { StatusTag } from '@/components/app/StatusTag';
import { ConfidenceLadder } from '@/components/app/ConfidenceLadder';
import { HospitalOptionCard } from '@/components/app/HospitalOptionCard';
import { AmbulanceTable } from '@/components/app/AmbulanceTable';
import { TimelineList } from '@/components/app/TimelineList';
import { SmsFeed } from '@/components/app/SmsFeed';
import { NearbyPeopleList } from '@/components/app/NearbyPeopleList';
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
const DEFAULT_RADIUS_M = 2000;

function worst(incident: Incident): M3Level | null {
  return incident.occupants.reduce<M3Level | null>(
    (level, o) => (!level || SEVERITY_RANK[o.m3.level] > SEVERITY_RANK[level] ? o.m3.level : level),
    null
  );
}

export function ResponderDashboard() {
  const t = useTranslations('responder');
  const tCommon = useTranslations('common');
  const tSeverity = useTranslations('severity');
  const tHospital = useTranslations('hospital');
  const locale = useLocale();
  const router = useRouter();
  const rtl = locale === 'ar';

  const { incidents, activeIncidentId, ambulances, online, selectIncident } = useIncidentStore();
  const source = useIncidentSource();
  const incident: Incident | null = activeIncidentId ? incidents[activeIncidentId] ?? null : null;

  const [stageView, setStageView] = useState<'scene' | 'map'>('scene');
  const [occupantId, setOccupantId] = useState<string | null>(null);
  const [ambulancesOpen, setAmbulancesOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  useEffect(() => setOccupantId(null), [activeIncidentId]);

  const occupant = incident?.occupants.find((o) => o.id === occupantId) ?? incident?.occupants[0] ?? null;
  const placement = rtl ? 'topLeft' : 'topRight';
  const confirmed = incident?.confidence.status === 'confirmed';
  const assigned = Boolean(incident?.dispatch.ambulanceId);
  const hasTelemetry = Boolean(incident?.telemetry) && incident?.channel === 'data';
  // Without telemetry there is no crash to replay: the map is the honest picture.
  const view = hasTelemetry ? stageView : 'map';

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
    () => [...(incident?.nearbyPeople ?? [])].sort((a, b) => a.distanceM - b.distanceM).slice(0, 2),
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
      <Slider min={500} max={5000} step={250} value={radiusM} onChange={setRadiusM} />
      <Button type="primary" block size="small" icon={<SendOutlined />} onClick={broadcast}>
        {t('broadcastConfirm')}
      </Button>
    </div>
  );

  return (
    <div className="relative h-screen overflow-hidden bg-stage-bg text-ink">
      {/* The scene is the page: everything else floats over it */}
      <div className="absolute inset-0">
        {/* The scene stays mounted: rebuilding its WebGL context on every swap is what flickered */}
        <div className={view === 'scene' ? 'absolute inset-0' : 'absolute inset-0 invisible'}>
          <CrashScene incident={incident} active={view === 'scene'} />
        </div>
        {view === 'map' && <MiniMap incident={incident} ambulances={ambulances} isPip={false} />}
      </div>

      <header className="absolute top-0 inset-x-0 h-14 px-4 flex items-center justify-between z-20">
        <span className="font-bold text-base tracking-tight text-stage-ink">{tCommon('brand')}</span>
        <Segmented
          value="responder"
          onChange={(role) => role === 'hospital' && router.push(`/${locale}/hospital`)}
          options={[
            { label: tHospital('roleResponder'), value: 'responder' },
            { label: tHospital('roleHospital'), value: 'hospital' },
          ]}
        />
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <SimBadge />
        </div>
      </header>

      {!online && (
        <div className="absolute top-14 inset-x-0 z-20">
          <Alert type="warning" banner showIcon message={t('offlineBanner')} />
        </div>
      )}

      {alertZone?.deadZone && (
        <ZoneAlert
          zone={alertZone.deadZone}
          onWarn={(message) => source.warnDriver(alertZone.id, message)}
          onAcknowledge={() => source.acknowledge(alertZone.id)}
        />
      )}

      {/* Queue */}
      <nav className="absolute top-16 start-4 z-10 w-[clamp(200px,17vw,250px)]" aria-label={t('queueTitle')}>
        <Button block type="primary" icon={<PlusOutlined />} onClick={() => setCallOpen(true)}>
          {t('call.open')}
        </Button>
        <ul className="mt-2 space-y-1">
          {queue.slice(0, 5).map((item) => {
            const level = worst(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={item.id === activeIncidentId}
                  onClick={() => selectIncident(item.id)}
                  className={`w-full rounded-xl px-3 py-2 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                    item.id === activeIncidentId ? 'bg-surface text-ink' : 'bg-stage-bg/70 text-stage-ink backdrop-blur'
                  }`}
                >
                  <span className="block truncate text-sm font-semibold">{item.position.roadLabel}</span>
                  <span className="flex items-center gap-1.5 text-xs opacity-80">
                    {level && <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLOR[level] }} />}
                    {level ? tSeverity(level) : t(`origin.${item.deadZone ? 'zone' : 'blackbox'}`)}
                    {item.phoneReport && ` · ${t('origin.phone')}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* The decision */}
      {incident && (
        <aside className="absolute top-16 end-4 z-10 w-[clamp(280px,25vw,360px)] rounded-2xl bg-surface p-4 shadow-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-bold tracking-tight leading-tight">{incident.position.roadLabel}</h1>
            <StatusTag status={incident.lifecycle} />
          </div>

          {occupant && (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight" style={{ color: SEVERITY_COLOR[occupant.m3.level] }}>
                {tSeverity(occupant.m3.level)}
              </span>
              <span className="font-mono text-xs text-muted">
                {incident.phoneReport ? t('phoneTriage') : `${t('rankingScore')} ${Math.round(occupant.m3.probability * 100)}%`}
              </span>
            </div>
          )}

          {incident.occupants.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1" role="tablist" aria-label={t('occupantsCount')}>
              {incident.occupants.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  aria-selected={o.id === occupant?.id}
                  onClick={() => setOccupantId(o.id)}
                  className={`h-7 px-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                    o.id === occupant?.id ? 'bg-ink text-white' : 'bg-surface-2 text-ink-2'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLOR[o.m3.level] }} />
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3">
            <ConfidenceLadder score={incident.confidence.score} status={incident.confidence.status} />
          </div>

          {/* One obvious next step, the rest stays quiet */}
          <div className="mt-3 space-y-2">
            {!confirmed ? (
              <Button block size="large" type="primary" icon={<SafetyCertificateOutlined />} onClick={confirmCrash}>
                {t('actions.confirm')}
              </Button>
            ) : (
              <Button
                block
                size="large"
                type={assigned ? 'default' : 'primary'}
                icon={<CarOutlined />}
                onClick={() => setAmbulancesOpen(true)}
              >
                {assigned ? incident.dispatch.ambulanceId : t('actions.assignAmbulance')}
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Popover content={broadcastPanel} trigger="click" open={broadcastOpen} onOpenChange={setBroadcastOpen}>
                <Button block icon={<TeamOutlined />}>
                  {t('actions.callForHelp')}
                </Button>
              </Popover>
              <Popconfirm
                title={t('closeConfirmTitle')}
                description={t('closeConfirmDesc')}
                onConfirm={closeMission}
                okButtonProps={{ danger: true }}
              >
                <Button block danger icon={<CloseCircleOutlined />}>
                  {t('actions.close')}
                </Button>
              </Popconfirm>
            </div>
          </div>

          {incident.yellowLineDrivers !== undefined && (
            <p className="mt-3 rounded-lg bg-sev-medium px-3 py-1.5 text-xs font-semibold text-ink">
              {t('yellowLine', { count: incident.yellowLineDrivers })}
            </p>
          )}

          {helpers.length > 0 && (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {helpers.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{person.name ?? t(`kind.${person.kind}`)}</span>{' '}
                    <span className="font-mono text-xs text-muted">{person.distanceM} m</span>
                  </span>
                  <Button
                    size="small"
                    icon={<PhoneOutlined />}
                    disabled={person.called || person.accepted}
                    onClick={() => source.callVolunteer(incident.id, person.id)}
                  >
                    {t(person.accepted ? 'volunteerOnWay' : person.called ? 'volunteerCalling' : 'callVolunteer')}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button block type="text" className="mt-2" icon={<ProfileOutlined />} onClick={() => setDetailsOpen(true)}>
            {t('details')}
          </Button>
        </aside>
      )}

      {/* Replay, telemetry and map */}
      <div className="absolute bottom-4 inset-x-4 z-10 flex items-end justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-2 items-start">
          {view === 'scene' && (
            <>
              <TelemetryReadout crash={incident?.crash} telemetry={incident?.telemetry} />
              <ReplayControls />
            </>
          )}
        </div>
        <div className="pointer-events-auto pe-14">
          {view === 'scene' ? (
            <MiniMap incident={incident} ambulances={ambulances} isPip onToggleSwap={() => setStageView('map')} />
          ) : (
            hasTelemetry && <Button onClick={() => setStageView('scene')}>{t('viewScene')}</Button>
          )}
        </div>
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

      <Drawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={incident?.position.roadLabel}
        placement={rtl ? 'left' : 'right'}
        width={480}
      >
        {incident && (
          <Tabs
            items={[
              { key: 'timeline', label: t('timelineTitle'), children: <TimelineList events={incident.timeline} /> },
              { key: 'sms', label: t('smsFeedTitle'), children: <SmsFeed messages={incident.sms} networkOnline={online} /> },
              {
                key: 'helpers',
                label: t('helpersTitle'),
                children: <NearbyPeopleList people={incident.nearbyPeople} onCallHelp={() => setBroadcastOpen(true)} />,
              },
              {
                key: 'hospitals',
                label: t('hospitalSuggestion'),
                children: (
                  <div className="space-y-2">
                    {incident.hospitalOptions.map((hospital, i) => (
                      <HospitalOptionCard key={hospital.id} hospital={hospital} recommended={i === 0} />
                    ))}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      <NewCallModal open={callOpen} onClose={() => setCallOpen(false)} onSubmit={logCall} />
    </div>
  );
}

export default ResponderDashboard;
