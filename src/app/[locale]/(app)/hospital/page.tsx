import { setRequestLocale } from 'next-intl/server';
import { HospitalApp } from '@/components/hospital/HospitalApp';
import { MedicalTheme } from '@/components/hospital/MedicalTheme';

export default async function HospitalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MedicalTheme>
      <HospitalApp />
    </MedicalTheme>
  );
}
