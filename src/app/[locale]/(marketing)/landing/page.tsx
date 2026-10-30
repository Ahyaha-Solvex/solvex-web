import { setRequestLocale } from 'next-intl/server';
import { LandingNav } from '@/components/landing/LandingNav';
import { BrandMorph } from '@/components/landing/BrandMorph';
import { Hero } from '@/components/landing/Hero';
import { BlackboxSection } from '@/components/landing/BlackboxSection';
import { Chain } from '@/components/landing/Chain';
import { Stats } from '@/components/landing/Stats';
import { Resilience } from '@/components/landing/Resilience';
import { Platform } from '@/components/landing/Platform';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col selection:bg-brand selection:text-white">
      <LandingNav />
      <BrandMorph />
      <main className="flex-1">
        <Hero />
        <BlackboxSection />
        <Chain />
        <Stats />
        <Resilience />
        <Platform />
      </main>
      <LandingFooter />
    </div>
  );
}
