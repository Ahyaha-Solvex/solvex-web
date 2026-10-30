import { setRequestLocale } from 'next-intl/server';
import { AppProviders } from '@/components/app/AppProviders';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppProviders locale={locale as 'fr' | 'en' | 'ar'}>
      {children}
    </AppProviders>
  );
}
