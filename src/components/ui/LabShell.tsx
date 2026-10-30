'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { LangSwitcher } from './LangSwitcher';
import { PRODUCT_NAME } from '@/config/brand';

interface LabShellProps {
  children: React.ReactNode;
}

export function LabShell({ children }: LabShellProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('lab');
  const tCommon = useTranslations('common');
  const dir = locale === 'ar' ? 'RTL' : 'LTR';

  const navCategories = [
    {
      category: t('categories.foundations'),
      items: [
        { label: t('links.tokens'), href: '/lab/tokens' },
      ],
    },
    {
      category: t('categories.primitives'),
      items: [
        { label: t('title'), href: '/' },
      ],
    },
    {
      category: t('categories.dataDisplay'),
      items: [
        { label: t('links.data'), href: '/lab/data' },
      ],
    },
    {
      category: t('categories.stage'),
      items: [
        { label: t('links.body'), href: '/lab/body' },
      ],
    },
    {
      category: t('categories.map'),
      items: [
        { label: t('links.responder'), href: '/responder' },
        { label: t('links.hospital'), href: '/hospital' },
      ],
    },
    {
      category: t('categories.landing'),
      items: [
        { label: t('links.landing'), href: '/landing' },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-semibold text-base tracking-tight text-ink hover:text-brand transition-colors focus-visible:outline-none"
          >
            {PRODUCT_NAME}
          </Link>
          <span className="text-border-strong">/</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-2 text-ink-2 border border-border">
            {t('title')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Simulated stream honesty badge per Rule 9 */}
          <span className="text-xs px-2.5 py-1 rounded-sm bg-sev-extreme-subtle text-sev-extreme font-medium border border-border">
            {tCommon('simBadge')}
          </span>

          {/* Direction Indicator */}
          <span
            className="text-xs font-mono font-semibold px-2 py-1 rounded bg-surface-2 text-muted border border-border"
            title={`Active layout direction: ${dir}`}
          >
            {dir}
          </span>

          {/* Language Switcher */}
          <LangSwitcher />
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Inline-Start Sidebar */}
        <aside className="w-72 border-inline-end border-border bg-surface flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t('subtitle')}
            </h2>
          </div>

          <nav className="p-3 space-y-6" aria-label="Component categories">
            {navCategories.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-2 text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  {group.category}
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none ${
                            isActive
                              ? 'bg-brand-subtle text-brand font-semibold border-inline-start-2 border-brand'
                              : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                          }`}
                        >
                          <span>{item.label}</span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-bg">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
