'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PRODUCT_NAME } from '@/config/brand';
import { LangSwitcher } from '@/components/ui/LangSwitcher';

export function LandingNav() {
  const t = useTranslations('landing.nav');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 h-14 z-40 transition-all duration-200 flex items-center justify-between px-6 md:px-12 ${
        scrolled
          ? 'bg-bg/85 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-transparent'
      }`}
    >
      {/* Brand Wordmark */}
      <Link
        href="/landing"
        className="font-bold text-base md:text-lg tracking-tight text-ink hover:text-brand transition-colors focus-visible:outline-none"
      >
        {PRODUCT_NAME}
      </Link>

      {/* Center Nav Links */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-2">
        <a href="#how" className="hover:text-brand transition-colors">
          {t('howItWorks')}
        </a>
        <a href="#platform" className="hover:text-brand transition-colors">
          {t('platform')}
        </a>
        <Link href="/responder" className="hover:text-brand transition-colors">
          {t('demoLink')}
        </Link>
      </nav>

      {/* Right Actions: LangSwitcher & Open Demo */}
      <div className="flex items-center gap-4">
        <LangSwitcher />
        <Link
          href="/responder"
          className="h-8 px-3.5 rounded-full bg-brand text-white text-xs font-semibold flex items-center justify-center hover:bg-brand-hover active:scale-95 transition-all shadow-sm focus-visible:outline-none"
        >
          {t('demo')}
        </Link>
      </div>
    </header>
  );
}
