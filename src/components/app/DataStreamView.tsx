'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card,
  Tag,
  Button,
  Switch,
  Descriptions,
  Badge,
} from 'antd';
import {
  WifiOutlined,
  DisconnectOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CarOutlined,
  DeleteOutlined,
  SendOutlined,
  InboxOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useIncidentSource } from '@/components/app/SourceProvider';

export function DataStreamView() {
  const t = useTranslations('lab.data');
  const source = useIncidentSource();
  const online = useIncidentStore((s) => s.online);
  const eventLog = useIncidentStore((s) => s.eventLog);
  const activeIncident = useIncidentStore((s) => s.getActiveIncident());
  const clearEvents = useIncidentStore((s) => s.clearEvents);

  const [expandedEventIdx, setExpandedEventIdx] = useState<number | null>(null);

  const getEventTagColor = (type: string) => {
    switch (type) {
      case 'incident_upsert':
        return '#006233'; // brand
      case 'ambulances':
        return 'blue';
      case 'sms':
        return 'gold';
      case 'vitals':
        return 'purple';
      case 'network':
        return 'volcano';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="border-b border-border pb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mb-1 flex items-center gap-3">
            {t('title')}
            {online ? (
              <Tag color="success" icon={<WifiOutlined />} className="text-xs">
                {t('online')}
              </Tag>
            ) : (
              <Tag color="error" icon={<DisconnectOutlined />} className="text-xs">
                {t('offline')}
              </Tag>
            )}
          </h1>
          <p className="text-sm text-muted">
            {t('subtitle')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-lg text-xs">
            <span className="font-semibold text-ink">Network:</span>
            <Switch
              checked={online}
              onChange={(checked) => source.toggleNetwork(checked)}
              size="small"
              checkedChildren="Online"
              unCheckedChildren="Offline"
            />
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => source.restart()}
          >
            Restart Scenario
          </Button>

          <Button
            danger
            icon={<ThunderboltOutlined />}
            onClick={() => source.triggerSos()}
          >
            SOS Trigger
          </Button>

          <Button
            icon={<CheckCircleOutlined />}
            onClick={() => source.triggerUserOk()}
          >
            Citizen OK
          </Button>
        </div>
      </div>

      {/* Incident Summary Card */}
      {activeIncident ? (
        <Card size="small" className="bg-surface border-border shadow-1">
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2, md: 4 }}
            bordered
            className="text-xs"
          >
            <Descriptions.Item label="Incident ID">
              <span className="font-mono font-bold text-ink">{activeIncident.id}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Localisation">
              <span>{activeIncident.position.roadLabel}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Canal Réseau">
              <Tag color={activeIncident.channel === 'data' ? 'green' : 'orange'}>
                {activeIncident.channel === 'data' ? '100 Hz Blackbox Stream' : 'SMS 2G Fallback'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Confiance">
              <span className="font-mono font-bold text-brand">
                {activeIncident.confidence.score}% ({activeIncident.confidence.status})
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Statut Cycle de Vie">
              <Tag color="processing">{activeIncident.lifecycle}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Gravité M3">
              <Tag color="volcano">{activeIncident.occupants[0]?.m3.level.toUpperCase()} (score {activeIncident.occupants[0]?.m3.probability})</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Télémétrie">
              {activeIncident.telemetry ? (
                <Tag color="green">1600 samples @ 100 Hz</Tag>
              ) : (
                <Tag color="default">Absent (Mode SMS)</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Action Rapide">
              <Button
                size="small"
                type="primary"
                icon={<CarOutlined />}
                disabled={activeIncident.lifecycle !== 'detected'}
                onClick={() => source.assignAmbulance(activeIncident.id, 'amb-102')}
              >
                Assigner PC-102
              </Button>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        <Card className="text-center py-6 bg-surface border-border text-muted">
          {t('noIncident')}
        </Card>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Live Event Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Badge status="processing" />
              {t('eventStream')}
              <span className="text-xs font-mono font-normal text-muted">
                ({eventLog.length} events)
              </span>
            </h2>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={clearEvents}
            >
              {t('clear')}
            </Button>
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pe-1">
            {eventLog.map((ev, idx) => {
              const isExpanded = expandedEventIdx === idx;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-surface border border-border shadow-1 hover:border-border-strong transition-all cursor-pointer"
                  onClick={() => setExpandedEventIdx(isExpanded ? null : idx)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Tag color={getEventTagColor(ev.type)} className="font-mono text-[11px] font-semibold m-0">
                      {ev.type}
                    </Tag>
                    <span className="text-[10px] font-mono text-muted">
                      #{eventLog.length - idx}
                    </span>
                  </div>

                  <p className="text-xs text-ink-2 leading-relaxed">
                    {ev.type === 'incident_upsert' && `Incident ${ev.incident.id} updated (${ev.incident.lifecycle}, ${ev.incident.confidence.score}% conf, channel ${ev.incident.channel})`}
                    {ev.type === 'ambulances' && `${ev.ambulances.length} ambulance units updated`}
                    {ev.type === 'sms' && `SMS ${ev.message.dir.toUpperCase()}: ${ev.message.raw}`}
                    {ev.type === 'vitals' && `Vitals update: HR ${ev.vitals.hr} bpm, SpO2 ${ev.vitals.spo2}%, BP ${ev.vitals.bpSys}/${ev.vitals.bpDia}`}
                    {ev.type === 'network' && `Network state changed: ${ev.online ? 'ONLINE' : 'OFFLINE'}`}
                  </p>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <pre className="text-[11px] font-mono bg-surface-2 p-2.5 rounded border border-border overflow-x-auto text-ink max-h-48">
                        {JSON.stringify(ev, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: SMS Feed & JSON Inspector */}
        <div className="space-y-6">
          {/* SMS Feed Section */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <SendOutlined className="text-brand" />
              {t('smsFeed')}
            </h2>

            <div className="space-y-3 max-h-64 overflow-y-auto pe-1">
              {activeIncident && activeIncident.sms.length > 0 ? (
                activeIncident.sms.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-lg bg-surface border border-border shadow-1 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {msg.dir === 'in' ? (
                          <Tag color="cyan" icon={<InboxOutlined />}>INBOUND</Tag>
                        ) : (
                          <Tag color="green" icon={<SendOutlined />}>OUTBOUND</Tag>
                        )}
                        <span className="font-mono text-muted text-[11px]">{msg.t}</span>
                      </span>
                      <Tag color="default" className="text-[10px] font-mono">
                        {msg.delivery || 'delivered'}
                      </Tag>
                    </div>

                    {/* Raw string rendered strictly dir="ltr" in mono per DATA_CONTRACT.md */}
                    <div
                      dir="ltr"
                      className="font-mono text-xs bg-surface-2 p-2 rounded border border-border text-ink break-all select-all"
                    >
                      {msg.raw}
                    </div>

                    {/* Parsed Chips */}
                    {msg.parsed ? (
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        <Tag color="purple">ID: {msg.parsed.id}</Tag>
                        <Tag color="blue">{msg.parsed.lat}, {msg.parsed.lng}</Tag>
                        <Tag color="volcano">SEV: {msg.parsed.severity}</Tag>
                        <Tag color="gold">C{msg.parsed.confidence}</Tag>
                        <Tag color="cyan">OCC: {msg.parsed.occupants}</Tag>
                        {msg.parsed.bloodType && (
                          <Tag color="red">BLOOD: {msg.parsed.bloodType}</Tag>
                        )}
                      </div>
                    ) : (
                      <Tag color="default" className="text-[10px]">
                        Text payload (no sensor tags)
                      </Tag>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-lg bg-surface border border-border text-xs text-muted text-center">
                  Aucun message SMS reçu.
                </div>
              )}
            </div>
          </div>

          {/* Current Incident JSON Inspector */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <CodeOutlined className="text-muted" />
              {t('currentIncident')}
            </h2>

            <div className="rounded-lg bg-surface border border-border shadow-1 p-3">
              <pre
                dir="ltr"
                className="text-[11px] font-mono bg-surface-2 p-3 rounded border border-border overflow-x-auto text-ink max-h-80"
              >
                {activeIncident
                  ? JSON.stringify(
                      {
                        ...activeIncident,
                        // Truncate telemetry samples array for clean view if present
                        telemetry: activeIncident.telemetry
                          ? {
                              ...activeIncident.telemetry,
                              accel: `[${activeIncident.telemetry.accel.length} samples @ 100Hz]`,
                              gyro: `[${activeIncident.telemetry.gyro.length} samples @ 100Hz]`,
                            }
                          : undefined,
                      },
                      null,
                      2
                    )
                  : '// No active incident'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
