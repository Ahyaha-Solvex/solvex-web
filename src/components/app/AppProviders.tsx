'use client';

import '@ant-design/v5-patch-for-react-19';
import React, { useEffect } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { StyleProvider } from '@ant-design/cssinjs';
import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import enUS from 'antd/locale/en_US';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/ar';
import { antdTheme } from '@/lib/antdTheme';

const antdLocales = {
  fr: frFR,
  en: enUS,
  ar: arEG,
} as const;

export function AppProviders({
  locale,
  children,
}: {
  locale: 'fr' | 'en' | 'ar';
  children: React.ReactNode;
}) {
  useEffect(() => {
    dayjs.locale(locale === 'ar' ? 'ar' : locale === 'fr' ? 'fr' : 'en');
  }, [locale]);

  return (
    <AntdRegistry>
      <StyleProvider layer>
        <ConfigProvider
          theme={antdTheme}
          locale={antdLocales[locale] || frFR}
          direction={locale === 'ar' ? 'rtl' : 'ltr'}
        >
          {children}
        </ConfigProvider>
      </StyleProvider>
    </AntdRegistry>
  );
}
