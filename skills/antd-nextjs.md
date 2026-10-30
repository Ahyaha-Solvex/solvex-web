# Skill — Ant Design in Next.js App Router with Tailwind

`(app)/layout.tsx` (server) renders `<AppProviders locale={locale}>{children}</AppProviders>`.
```tsx
'use client';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { StyleProvider } from '@ant-design/cssinjs';
import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import enUS from 'antd/locale/en_US';
import arEG from 'antd/locale/ar_EG';
import { antdTheme } from '@/lib/antdTheme';

const locales = { fr: frFR, en: enUS, ar: arEG } as const;

export function AppProviders({ locale, children }: { locale: 'fr' | 'en' | 'ar'; children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <StyleProvider layer>
        <ConfigProvider theme={antdTheme} locale={locales[locale]} direction={locale === 'ar' ? 'rtl' : 'ltr'}>
          {children}
        </ConfigProvider>
      </StyleProvider>
    </AntdRegistry>
  );
}
```
Global CSS order so Tailwind utilities do not override Ant: `@layer theme, base, antd, components, utilities;` at the top of `globals.css`. If Ant components look broken after adding Tailwind, verify the layer order first; if still broken, remove `StyleProvider layer` and scope Tailwind's preflight instead. Check Button, Table, Tag at CP0. If `antd` complains about React version, install the matching compatibility package named in its console warning and log it in `docs/QUESTIONS.md`.
Dayjs locales: import `dayjs/locale/fr` and `dayjs/locale/ar` and set the active one in the provider.
