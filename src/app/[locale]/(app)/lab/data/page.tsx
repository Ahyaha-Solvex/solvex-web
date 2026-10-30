import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Card, Tag } from 'antd';
import { LabShell } from '@/components/ui/LabShell';

export default async function LabDataPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LabShell>
      <LabDataPlaceholder />
    </LabShell>
  );
}

function LabDataPlaceholder() {
  const t = useTranslations('lab');

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{t('links.data')}</h1>
        <Tag color="orange">CP1 Deliverable</Tag>
      </div>
      <Card className="bg-surface border-border">
        <p className="text-sm text-muted">
          Live simulated telemetry stream, raw SMS feed, and incident event inspection will arrive in CP1.
        </p>
      </Card>
    </div>
  );
}
