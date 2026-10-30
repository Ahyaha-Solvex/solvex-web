import { setRequestLocale } from 'next-intl/server';
import { ResponderDashboard } from '@/components/responder/ResponderDashboard';

export default async function ResponderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResponderDashboard />;
}
