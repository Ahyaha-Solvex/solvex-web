import { setRequestLocale } from 'next-intl/server';
import { ResponderApp } from '@/components/responder/ResponderApp';

export default async function ResponderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResponderApp />;
}
