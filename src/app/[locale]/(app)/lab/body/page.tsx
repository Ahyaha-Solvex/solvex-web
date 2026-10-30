import { setRequestLocale } from 'next-intl/server';
import { LabShell } from '@/components/ui/LabShell';
import { BodyCalibrationView } from '@/components/stage/BodyCalibrationView';

export default async function LabBodyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LabShell>
      <BodyCalibrationView />
    </LabShell>
  );
}
