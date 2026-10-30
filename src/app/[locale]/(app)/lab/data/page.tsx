import { setRequestLocale } from 'next-intl/server';
import { LabShell } from '@/components/ui/LabShell';
import { DataStreamView } from '@/components/app/DataStreamView';

export default async function LabDataPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LabShell>
      <DataStreamView />
    </LabShell>
  );
}
