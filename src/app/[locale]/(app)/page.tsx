import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Button, Tag, Card } from 'antd';
import { ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons';
import { LabShell } from '@/components/ui/LabShell';
import { Link } from '@/i18n/routing';

export default async function LabHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LabShell>
      <LabOverview />
    </LabShell>
  );
}

function LabOverview() {
  const t = useTranslations('lab');

  const checkpoints = [
    { id: 'CP0', title: 'Foundation & Tokens', status: 'active', desc: 'Design tokens, RTL, Ant theme, i18n, build setup' },
    { id: 'CP1', title: 'Data Layer & Sim', status: 'pending', desc: 'Zustand stores, IncidentSource adapter, SMS parser' },
    { id: 'CP2', title: 'Component Library', status: 'pending', desc: '21 UI primitives and telemetry displays with all states' },
    { id: 'CP3', title: 'Hospital View', status: 'pending', desc: '3D human body injury map, triage, preparation checklist' },
    { id: 'CP4', title: 'Responder View', status: 'pending', desc: '3D crash scene replay, map, ambulance dispatch, helpers' },
    { id: 'CP5', title: 'Landing Showcase', status: 'pending', desc: 'Apple-style blackbox sequence, turntable carousel' },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mb-1">
            {t('title')}
          </h1>
          <p className="text-sm text-muted">
            {t('subtitle')}
          </p>
        </div>
        <Link href="/lab/tokens">
          <Button type="primary" icon={<ArrowRightOutlined />}>
            {t('links.tokens')}
          </Button>
        </Link>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card size="small" title="Active Theme" extra={<Tag color="#006233">Saharan Paper</Tag>}>
          <div className="text-xs text-muted space-y-1">
            <p>Ivory base (--bg: #FAF8F3)</p>
            <p>Brand flag green (--brand: #006233)</p>
            <p>Ant Design v5 + Tailwind CSS v3</p>
          </div>
        </Card>

        <Card size="small" title="i18n & Direction" extra={<Tag color="processing">3 Locales</Tag>}>
          <div className="text-xs text-muted space-y-1">
            <p>Français (Default LTR)</p>
            <p>English (LTR)</p>
            <p>العربية (Arabic RTL)</p>
          </div>
        </Card>

        <Card size="small" title="Emergency Blackbox" extra={<Tag color="#2A7F6F">Simulated</Tag>}>
          <div className="text-xs text-muted space-y-1">
            <p>100 Hz Accel/Gyro + 1 Hz GPS</p>
            <p>SMS Fallback & LoRa Radio</p>
            <p>M1-M4 Backend AI integration</p>
          </div>
        </Card>
      </div>

      {/* Checkpoints Roadmap */}
      <div className="bg-surface rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Checkpoints Roadmap</h2>
          <span className="text-xs text-muted">docs/PLAN.md</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checkpoints.map((cp) => (
            <div
              key={cp.id}
              className={`p-3.5 rounded-md border flex items-start gap-3 transition-colors ${
                cp.status === 'active'
                  ? 'border-brand bg-brand-subtle'
                  : 'border-border bg-surface-2 opacity-80'
              }`}
            >
              <div className="mt-0.5">
                {cp.status === 'active' ? (
                  <CheckCircleFilled className="text-brand text-base" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-border-strong inline-block" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-ink">
                    {cp.id} — {cp.title}
                  </span>
                  <Tag
                    bordered={false}
                    color={cp.status === 'active' ? 'success' : 'default'}
                    className="text-[10px] m-0"
                  >
                    {cp.status === 'active' ? 'In Progress' : 'Planned'}
                  </Tag>
                </div>
                <p className="text-xs text-muted leading-relaxed">{cp.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
