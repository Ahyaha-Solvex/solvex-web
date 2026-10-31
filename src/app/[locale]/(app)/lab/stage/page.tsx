import { setRequestLocale } from 'next-intl/server';
import { CrashStageLab } from '@/components/stage/CrashStageLab';

export default async function LabStagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CrashStageLab />;
}
