'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Tag, Table, Card, Space, Divider, Switch } from 'antd';
import {
  CheckCircleFilled,
  InfoCircleFilled,
  WarningFilled,
  ExclamationCircleFilled,
  QuestionCircleFilled,
  SafetyCertificateFilled,
  PlayCircleOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  CheckOutlined,
} from '@ant-design/icons';

interface ColorSwatchProps {
  label: string;
  variable: string;
  hex: string;
  textColor?: string;
  border?: boolean;
  icon?: React.ReactNode;
}

function ColorSwatch({
  label,
  variable,
  hex,
  textColor = 'text-ink',
  border = false,
  icon,
}: ColorSwatchProps) {
  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-md bg-surface border border-border">
      <div
        className={`h-12 w-full rounded flex items-center justify-center gap-1 font-mono text-xs font-semibold ${textColor} ${
          border ? 'border border-border' : ''
        }`}
        style={{ backgroundColor: `var(${variable})` }}
      >
        {icon}
        <span>{hex}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-ink truncate">{label}</span>
        <span className="text-[10px] font-mono text-muted truncate">{variable}</span>
      </div>
    </div>
  );
}

export function TokensShowcase() {
  const t = useTranslations('lab.tokens');
  const tSev = useTranslations('severity');
  const tReg = useTranslations('regions');
  const tStat = useTranslations('status');

  const [motionTrigger, setMotionTrigger] = useState(false);

  // Table Data for Ant Theme Verification
  const tableData = [
    {
      key: '1',
      property: 'colorPrimary',
      value: '#006233',
      usage: 'Brand actions, active tabs, outline rings',
      sample: <Tag color="#006233">Primary Brand</Tag>,
    },
    {
      key: '2',
      property: 'colorSuccess',
      value: '#2A7F6F',
      usage: 'Low severity (M3), operational status',
      sample: <Tag color="#2A7F6F">Success / Low</Tag>,
    },
    {
      key: '3',
      property: 'colorWarning',
      value: '#D9A400',
      usage: 'Medium severity (M3), likely confidence',
      sample: <Tag color="#D9A400" className="text-ink">Warning / Likely</Tag>,
    },
    {
      key: '4',
      property: 'colorError',
      value: '#D21034',
      usage: 'Extreme severity (M3), confirmed critical',
      sample: <Tag color="#D21034">Error / Extreme</Tag>,
    },
    {
      key: '5',
      property: 'borderRadius',
      value: '10px (--r-md)',
      usage: 'Standard cards, dialogs, buttons',
      sample: <span className="text-xs font-mono">10px / 14px (LG)</span>,
    },
  ];

  const tableColumns = [
    {
      title: t('antTableColName'),
      dataIndex: 'property',
      key: 'property',
      render: (text: string) => <span className="font-mono text-xs font-bold">{text}</span>,
    },
    {
      title: t('antTableColVal'),
      dataIndex: 'value',
      key: 'value',
      render: (text: string) => <span className="font-mono text-xs text-muted">{text}</span>,
    },
    {
      title: t('antTableColDesc'),
      dataIndex: 'usage',
      key: 'usage',
      render: (text: string) => <span className="text-xs">{text}</span>,
    },
    {
      title: 'Sample',
      dataIndex: 'sample',
      key: 'sample',
    },
  ];

  const spacingScale = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink mb-2">
          {t('title')}
        </h1>
        <p className="text-sm text-muted">
          {t('subtitle')}
        </p>
      </div>

      {/* Section 1: Ant Design Component Verification */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {t('antVerification')}
          </h2>
          <span className="text-xs font-mono text-muted">src/lib/antdTheme.ts</span>
        </div>

        <Card className="bg-surface border-border">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Buttons (Variants &amp; States)
              </h3>
              <div className="space-y-4">
                <Space wrap size="middle">
                  <Button type="primary" icon={<ArrowRightOutlined />}>
                    {t('antButtonPrimary')}
                  </Button>
                  <Button type="primary" danger>
                    Primary Danger
                  </Button>
                  <Button>{t('antButtonDefault')}</Button>
                  <Button danger>{t('antButtonDanger')}</Button>
                  <Button type="dashed">Dashed Action</Button>
                  <Button type="text">Text Action</Button>
                  <Button type="link">Link Action</Button>
                  <Button disabled>Disabled Action</Button>
                  <Button type="primary" loading>Loading Action</Button>
                </Space>

                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs font-mono text-muted">Sizes:</span>
                  <Button size="small" type="primary" icon={<CheckOutlined />}>Small (32px)</Button>
                  <Button size="middle" type="primary" icon={<CheckOutlined />}>Middle (40px)</Button>
                  <Button size="large" type="primary" icon={<CheckOutlined />}>Large (48px)</Button>
                </div>
              </div>
            </div>

            <Divider className="my-4 border-border" />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Switches &amp; Toggles (High-Contrast States)
              </h3>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Checked (ON):</span>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Unchecked (OFF):</span>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Labeled:</span>
                  <Switch
                    defaultChecked
                    checkedChildren="Online"
                    unCheckedChildren="Offline"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Small:</span>
                  <Switch size="small" defaultChecked />
                  <Switch size="small" defaultChecked={false} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">Disabled:</span>
                  <Switch disabled defaultChecked />
                  <Switch disabled defaultChecked={false} />
                </div>
              </div>
            </div>

            <Divider className="my-4 border-border" />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Tags
              </h3>
              <Space wrap size="small">
                <Tag color="#006233">{t('antTagText')}</Tag>
                <Tag color="#2A7F6F">Low Sev</Tag>
                <Tag color="#D9A400" className="text-ink">Medium Sev</Tag>
                <Tag color="#C9560F">High Sev</Tag>
                <Tag color="#D21034">Extreme Sev</Tag>
                <Tag>Neutral</Tag>
              </Space>
            </div>

            <Divider className="my-4 border-border" />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Table Verification (Checking Theme Tokens &amp; Tailwind Boundary)
              </h3>
              <Table
                dataSource={tableData}
                columns={tableColumns}
                pagination={false}
                size="small"
                bordered
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Section 2: Palette & Colors */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-ink">
          {t('colors')}
        </h2>

        {/* Surfaces & Ink */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t('surfaces')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            <ColorSwatch label="Background" variable="--bg" hex="#FAF8F3" border />
            <ColorSwatch label="Surface" variable="--surface" hex="#FFFFFF" border />
            <ColorSwatch label="Surface 2" variable="--surface-2" hex="#F3F0E8" border />
            <ColorSwatch label="Border" variable="--border" hex="#E6E1D5" border />
            <ColorSwatch label="Border Strong" variable="--border-strong" hex="#D3CCBB" />
            <ColorSwatch label="Ink (Text)" variable="--ink" hex="#14201A" textColor="text-white" />
            <ColorSwatch label="Ink 2" variable="--ink-2" hex="#3B4740" textColor="text-white" />
            <ColorSwatch label="Muted" variable="--muted" hex="#5C675F" textColor="text-white" />
          </div>
        </div>

        {/* Brand */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t('brand')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ColorSwatch label="Brand Primary" variable="--brand" hex="#006233" textColor="text-white" />
            <ColorSwatch label="Brand Hover" variable="--brand-hover" hex="#007A41" textColor="text-white" />
            <ColorSwatch label="Brand Press" variable="--brand-press" hex="#004D28" textColor="text-white" />
            <ColorSwatch label="Brand Subtle" variable="--brand-subtle" hex="#E6F1EA" border />
          </div>
        </div>

        {/* Severity M3 */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t('severity')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <ColorSwatch label={`M3 ${tSev('low')}`} variable="--sev-low" hex="#2A7F6F" textColor="text-white" icon={<CheckCircleFilled />} />
            <ColorSwatch label={`M3 ${tSev('medium')}`} variable="--sev-medium" hex="#D9A400" textColor="text-ink" icon={<InfoCircleFilled />} />
            <ColorSwatch label={`M3 ${tSev('high')}`} variable="--sev-high" hex="#C9560F" textColor="text-white" icon={<WarningFilled />} />
            <ColorSwatch label={`M3 ${tSev('extreme')}`} variable="--sev-extreme" hex="#D21034" textColor="text-white" icon={<ExclamationCircleFilled />} />
            <ColorSwatch label="Extreme Subtle" variable="--sev-extreme-subtle" hex="#FBE5E9" border />
          </div>
        </div>

        {/* Body Regions M4 */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t('regions')}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <ColorSwatch label={`M4 ${tReg('unlikely')}`} variable="--reg-unlikely" hex="#C9C4B6" />
            <ColorSwatch label={`M4 ${tReg('check')}`} variable="--reg-check" hex="#E0A100" textColor="text-ink" />
            <ColorSwatch label={`M4 ${tReg('likely')}`} variable="--reg-likely" hex="#D21034" textColor="text-white" />
          </div>
        </div>

        {/* Confidence Ladder */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t('confidence')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ColorSwatch label={`40-70 ${tStat('suspected')}`} variable="--conf-suspected" hex="#8A9189" textColor="text-white" icon={<QuestionCircleFilled />} />
            <ColorSwatch label={`70-90 ${tStat('likely')}`} variable="--conf-likely" hex="#D9A400" textColor="text-ink" />
            <ColorSwatch label={`Witness ${tStat('witness_confirmed')}`} variable="--conf-witness" hex="#C9560F" textColor="text-white" />
            <ColorSwatch label={`90+ ${tStat('confirmed')}`} variable="--conf-confirmed" hex="#D21034" textColor="text-white" icon={<SafetyCertificateFilled />} />
          </div>
        </div>

        {/* Dark Stage */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t('stage')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <ColorSwatch label="Stage BG" variable="--stage-bg" hex="#0B1310" textColor="text-white" />
            <ColorSwatch label="Stage Ink" variable="--stage-ink" hex="#E8EEEA" />
            <ColorSwatch label="Stage Muted" variable="--stage-muted" hex="#8FA097" textColor="text-white" />
            <ColorSwatch label="Stage Route" variable="--stage-route" hex="#F2B705" textColor="text-ink" />
            <ColorSwatch label="Stage Impact" variable="--stage-impact" hex="#FF4D5E" textColor="text-white" />
            <ColorSwatch label="Stage Grid" variable="--stage-grid" hex="rgba(255,255,255,0.06)" textColor="text-white" />
          </div>
        </div>
      </section>

      {/* Section 3: Typography Scale */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">
          {t('typography')}
        </h2>

        <div className="space-y-4 p-6 rounded-lg bg-surface border border-border">
          <div className="border-b border-border pb-4">
            <span className="text-xs font-mono text-muted block mb-1">Landing Hero · clamp(3rem, 9vw, 8rem)</span>
            <div className="text-5xl md:text-6xl font-semibold tracking-tight text-ink leading-none">
              Every minute counts.
            </div>
          </div>

          <div className="border-b border-border pb-4">
            <span className="text-xs font-mono text-muted block mb-1">Section Title · clamp(2.25rem, 6vw, 5rem)</span>
            <div className="text-3xl md:text-4xl font-semibold tracking-tight text-ink">
              Built into the car.
            </div>
          </div>

          <div className="border-b border-border pb-4">
            <span className="text-xs font-mono text-muted block mb-1">App Page Title · 28px / 36px weight 600</span>
            <div className="text-2xl font-semibold text-ink">
              Hôpital Bouira (seed) · Service des Urgences
            </div>
          </div>

          <div className="border-b border-border pb-4">
            <span className="text-xs font-mono text-muted block mb-1">Card Title · 16px / 24px weight 600</span>
            <div className="text-base font-semibold text-ink">
              Incident Detail &amp; Occupants Triage
            </div>
          </div>

          <div className="border-b border-border pb-4">
            <span className="text-xs font-mono text-muted block mb-1">App Body Base · 14px / 22px</span>
            <div className="text-sm text-ink leading-relaxed">
              Blackbox impact detected on RN5, km 112. M2 level crash (p=0.98), M3 severity high. Telemetry streaming at 100 Hz.
            </div>
          </div>

          <div className="border-b border-border pb-4">
            <span className="text-xs font-mono text-muted block mb-1">Caption · 12px / 18px muted</span>
            <div className="text-xs text-muted">
              Estimate to prioritise.
            </div>
          </div>

          <div>
            <span className="text-xs font-mono text-muted block mb-1">Telemetry Numbers · --font-mono tabular-nums</span>
            <div className="font-mono text-xl tabular-nums font-semibold text-ink">
              ΔV 55.4 km/h · 270° LEFT · SPEED 90 km/h · LAT 36.3741° LNG 3.9012°
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: 4px Spacing Scale */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">
          {t('spacing')}
        </h2>

        <div className="p-6 rounded-lg bg-surface border border-border space-y-3">
          {spacingScale.map((px) => (
            <div key={px} className="flex items-center gap-4">
              <span className="w-14 text-xs font-mono font-semibold text-muted text-end">
                {px} px
              </span>
              <div
                className="h-5 bg-brand-subtle border border-brand rounded-sm flex items-center px-1"
                style={{ width: `${Math.min(px * 3, 600)}px` }}
              >
                <span className="text-[10px] font-mono text-brand font-bold">{px}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Border Radii & Shadows */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radii */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">
            {t('radii')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-surface border border-border rounded-sm text-center">
              <span className="font-mono text-xs font-bold block mb-1">--r-sm (6px)</span>
              <span className="text-xs text-muted">Tags, Badges</span>
            </div>
            <div className="p-5 bg-surface border border-border rounded-md text-center">
              <span className="font-mono text-xs font-bold block mb-1">--r-md (10px)</span>
              <span className="text-xs text-muted">Buttons, Inputs</span>
            </div>
            <div className="p-5 bg-surface border border-border rounded-lg text-center">
              <span className="font-mono text-xs font-bold block mb-1">--r-lg (14px)</span>
              <span className="text-xs text-muted">Cards, Panels</span>
            </div>
            <div className="p-5 bg-surface border border-border rounded-xl text-center">
              <span className="font-mono text-xs font-bold block mb-1">--r-xl (20px)</span>
              <span className="text-xs text-muted">Modals, Floating</span>
            </div>
          </div>
        </div>

        {/* Shadows */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">
            {t('shadows')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-surface border border-border rounded-lg shadow-1 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-xs font-bold block mb-1">--shadow-1</span>
              <span className="text-xs text-muted">0 1px 2px rgba(20,32,26,.06)</span>
            </div>
            <div className="p-6 bg-surface border border-border rounded-lg shadow-2 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-xs font-bold block mb-1">--shadow-2</span>
              <span className="text-xs text-muted">0 4px 16px rgba(20,32,26,.08)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Motion Dynamics */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {t('motion')}
          </h2>
          <Button
            icon={motionTrigger ? <ReloadOutlined /> : <PlayCircleOutlined />}
            onClick={() => setMotionTrigger(!motionTrigger)}
          >
            {t('triggerMotion')}
          </Button>
        </div>

        <div className="p-6 rounded-lg bg-surface border border-border space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted">
              <span>{t('fast')} · cubic-bezier(0.22, 1, 0.36, 1)</span>
              <span>150ms</span>
            </div>
            <div className="h-4 bg-surface-2 rounded-full overflow-hidden p-0.5 border border-border">
              <div
                className={`h-full bg-brand rounded-full transition-all duration-fast ease-out ${
                  motionTrigger ? 'w-full' : 'w-1/4'
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted">
              <span>{t('base')} · cubic-bezier(0.22, 1, 0.36, 1)</span>
              <span>240ms</span>
            </div>
            <div className="h-4 bg-surface-2 rounded-full overflow-hidden p-0.5 border border-border">
              <div
                className={`h-full bg-brand rounded-full transition-all duration-base ease-out ${
                  motionTrigger ? 'w-full' : 'w-1/4'
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted">
              <span>{t('slow')} · cubic-bezier(0.22, 1, 0.36, 1)</span>
              <span>420ms</span>
            </div>
            <div className="h-4 bg-surface-2 rounded-full overflow-hidden p-0.5 border border-border">
              <div
                className={`h-full bg-brand rounded-full transition-all duration-slow ease-out ${
                  motionTrigger ? 'w-full' : 'w-1/4'
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-muted">
              <span>{t('hero')} · cubic-bezier(0.65, 0, 0.35, 1)</span>
              <span>900ms</span>
            </div>
            <div className="h-4 bg-surface-2 rounded-full overflow-hidden p-0.5 border border-border">
              <div
                className={`h-full bg-brand rounded-full transition-all duration-hero ease-in-out ${
                  motionTrigger ? 'w-full' : 'w-1/4'
                }`}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
