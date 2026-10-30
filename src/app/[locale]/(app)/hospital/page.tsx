import { setRequestLocale } from 'next-intl/server';
import { HospitalDashboard } from '@/components/hospital/HospitalDashboard';

export default async function HospitalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HospitalDashboard />;
}
