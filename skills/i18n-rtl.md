# Skill — next-intl, three locales, RTL

- `src/i18n/routing.ts`: `defineRouting({ locales: ['fr','en','ar'], defaultLocale: 'fr', localePrefix: 'as-needed' })`.
- `[locale]/layout.tsx`: `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`.
- Messages in `src/messages/{fr,en,ar}.json`, namespaced (`common`, `lab`, `landing`, `hospital`, `responder`, `severity`, `regions`, `status`).
- `scripts/i18n-check.mjs`: loads the three JSON files, flattens keys, fails on any missing or extra key; wire to `pnpm i18n:check` and to the checkpoint gate.
- Numbers: use `Intl.NumberFormat(locale)` but force Latin digits for telemetry and phone numbers (`numberingSystem: 'latn'`).
- Region and level labels live under `regions.*` and `severity.*` so the 3D labels reuse them.
- Test each page with `ar` at every checkpoint: rails swap sides, chevrons flip, SMS raw line stays LTR.
