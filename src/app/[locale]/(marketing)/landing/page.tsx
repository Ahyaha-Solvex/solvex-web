import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandingContent />;
}

function LandingContent() {
  const t = useTranslations('landing');
  const tCommon = useTranslations('common');

  return (
    <main className="min-h-screen flex flex-col justify-between p-8 md:p-16">
      <header className="flex items-center justify-between">
        <div className="font-semibold text-lg tracking-tight text-ink">
          {tCommon('appName')}
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-brand hover:underline inline-flex items-center gap-1 focus-visible:outline-none"
        >
          ← {t('title')}
        </Link>
      </header>

      <section className="max-w-2xl my-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
          SolveX 3.0 · Crash response
        </p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-ink mb-6">
          {t('hero.title')}
        </h1>
        <p className="text-lg md:text-xl text-muted leading-relaxed mb-8">
          {t('hero.lead')}
        </p>
        <div className="p-4 rounded-lg bg-surface border border-border text-sm text-muted">
          {t('placeholder')}
        </div>
      </section>

      <footer className="text-xs text-muted flex items-center justify-between border-t border-border pt-4">
        <span>Built for SolveX 3.0 · HIS University</span>
        <span>{tCommon('simBadge')}</span>
      </footer>
    </main>
  );
}
