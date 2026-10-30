import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Card, Tag } from 'antd';
import { LabShell } from '@/components/ui/LabShell';

export default async function ResponderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LabShell>
      <ResponderPlaceholder />
    </LabShell>
  );
}

function ResponderPlaceholder() {
  const t = useTranslations('responder');

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
        <Tag color="orange">CP4 Deliverable</Tag>
      </div>
      <Card className="bg-surface border-border">
        <p className="text-sm text-muted">{t('placeholder')}</p>
      </Card>
    </div>
  );
}
