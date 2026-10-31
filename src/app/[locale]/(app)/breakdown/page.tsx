import { setRequestLocale } from 'next-intl/server';
import { BreakdownApp } from '@/components/breakdown/BreakdownApp';

export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BreakdownApp />;
}
