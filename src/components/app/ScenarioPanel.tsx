'use client';

import React from 'react';
import {
  FloatButton,
  Drawer,
  Switch,
  Button,
  Tag,
  Segmented,
  Divider,
  Space,
  Descriptions,
} from 'antd';
import {
  ControlOutlined,
  ReloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { useIncidentSource } from './SourceProvider';
import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useUiStore } from '@/lib/stores/uiStore';

export function ScenarioPanel() {
  const source = useIncidentSource();
  const tZone = useTranslations('responder.zone');
  const online = useIncidentStore((s) => s.online);
  const activeIncident = useIncidentStore((s) => s.getActiveIncident());
  const drawerOpen = useUiStore((s) => s.scenarioDrawerOpen);
  const setDrawerOpen = useUiStore((s) => s.setScenarioDrawerOpen);
  const speed = useUiStore((s) => s.speedMultiplier);
  const setSpeed = useUiStore((s) => s.setSpeedMultiplier);
  const witnesses = useUiStore((s) => s.witnessesEnabled);
  const setWitnesses = useUiStore((s) => s.setWitnessesEnabled);

  const handleNetworkChange = (checked: boolean) => {
    source.toggleNetwork(checked);
  };

  const handleWitnessesChange = (checked: boolean) => {
    setWitnesses(checked);
    source.toggleWitnesses(checked);
  };

  const handleSpeedChange = (value: string | number) => {
    const s = Number(value);
    setSpeed(s);
    source.setSpeed(s);
  };

  const handleRestart = () => {
    source.restart();
  };

  return (
    <>
      <FloatButton
        icon={<ControlOutlined />}
        type="primary"
        tooltip="Panneau de scénario (Simulation)"
        style={{ insetInlineEnd: 24, bottom: 24 }}
        onClick={() => setDrawerOpen(true)}
      />

      <Drawer
        title={
          <div className="flex items-center justify-between w-full pe-4">
            <span className="font-semibold text-sm">Contrôle du Scénario</span>
            <Tag color="#006233" className="m-0">
              Scénario RN5
            </Tag>
          </div>
        }
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-6">
          {/* Rule 9 Honesty Label */}
          <div className="p-3 rounded-lg bg-surface-2 border border-border flex items-center justify-between">
            <span className="text-xs font-medium text-ink">Mode source :</span>
            <Tag color="magenta" className="m-0 font-mono text-xs">
              Simulated blackbox stream
            </Tag>
          </div>

          {/* Network Switch */}
          <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink flex items-center gap-2">
                {online ? (
                  <WifiOutlined className="text-brand" />
                ) : (
                  <DisconnectOutlined className="text-sev-extreme" />
                )}
                Connectivité Réseau
              </span>
              <Switch
                checked={online}
                onChange={handleNetworkChange}
                checkedChildren="Online"
                unCheckedChildren="2G / SMS"
              />
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {online
                ? 'Données blackbox complètes (100 Hz télémétrie + GPS + M1-M4).'
                : 'Mode dégradé hors-ligne : alerte transmise uniquement par SMS direct.'}
            </p>
          </div>

          {/* Witness Confirmation */}
          <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">
                Appel Témoin (t=40s)
              </span>
              <Switch
                checked={witnesses}
                onChange={handleWitnessesChange}
              />
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Déclenche la confirmation d’un témoin sur place via appel 14 (Protection Civile).
            </p>
          </div>

          {/* Speed Multiplier */}
          <div className="p-4 rounded-lg bg-surface border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">
                Vitesse de Simulation
              </span>
              <span className="text-xs font-mono font-bold text-brand">
                {speed}x
              </span>
            </div>
            <Segmented
              block
              value={speed}
              onChange={handleSpeedChange}
              options={[
                { label: '0.5x', value: 0.5 },
                { label: '1.0x', value: 1.0 },
                { label: '2.0x', value: 2.0 },
                { label: '5.0x', value: 5.0 },
              ]}
            />
          </div>

          {/* Quick Triggers */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Déclencheurs Événements
            </h4>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  block
                  icon={<ReloadOutlined />}
                  onClick={handleRestart}
                  className="px-3 text-xs font-semibold h-10"
                >
                  Recommencer (t=0)
                </Button>
                <Button
                  block
                  danger
                  icon={<ThunderboltOutlined />}
                  onClick={() => source.triggerSos()}
                  className="px-3 text-xs font-semibold h-10"
                >
                  Bouton SOS (100%)
                </Button>
              </div>
              <Button block onClick={() => source.startDeadZone()} className="text-xs font-semibold h-10">
                {tZone('simulate')}
              </Button>
              <Button
                block
                onClick={() => source.triggerUserOk()}
                icon={<CheckCircleOutlined />}
                className="px-4 text-xs font-semibold h-10"
              >
                Simuler Conducteur : &ldquo;Je vais bien&rdquo; (0%)
              </Button>
            </div>
          </div>

          <Divider className="my-2 border-border" />

          {/* Active Incident Dispatcher Actions */}
          {activeIncident ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Actions Régulateur Protection Civile
              </h4>

              <Descriptions
                size="small"
                column={1}
                bordered
                className="bg-surface"
              >
                <Descriptions.Item label="Statut">
                  <Tag color="blue">{activeIncident.lifecycle}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Canal">
                  <Tag color={activeIncident.channel === 'data' ? 'green' : 'orange'}>
                    {activeIncident.channel.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Confiance">
                  <span className="font-mono font-bold">
                    {activeIncident.confidence.score}% ({activeIncident.confidence.status})
                  </span>
                </Descriptions.Item>
              </Descriptions>

              <Space direction="vertical" className="w-full">
                <Button
                  block
                  type="primary"
                  disabled={activeIncident.confidence.status === 'confirmed'}
                  onClick={() => source.confirm(activeIncident.id)}
                  icon={<AlertOutlined />}
                >
                  Confirmer le crash (Régulateur)
                </Button>

                <Button
                  block
                  disabled={activeIncident.lifecycle !== 'detected'}
                  onClick={() => source.assignAmbulance(activeIncident.id, 'amb-102')}
                >
                  Dépêcher Ambulance PC-102 (11 min)
                </Button>

                <Button
                  block
                  onClick={() => source.callForHelp(activeIncident.id, 1500)}
                >
                  Diffuser Appel à Solidarité (1500 m)
                </Button>

                <Button
                  block
                  danger
                  onClick={() => source.close(activeIncident.id)}
                >
                  Clôturer l’intervention
                </Button>
              </Space>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-muted">
              Aucun incident actif en mémoire.
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
