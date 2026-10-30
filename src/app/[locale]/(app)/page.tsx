import { setRequestLocale } from 'next-intl/server';
import { LabShell } from '@/components/ui/LabShell';
import { ComponentLab } from '@/components/app/ComponentLab';

export default async function LabHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LabShell>
      <ComponentLab />
    </LabShell>
  );
}
