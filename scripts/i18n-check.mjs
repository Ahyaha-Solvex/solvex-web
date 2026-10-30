import fs from 'node:fs';
import path from 'node:path';

const locales = ['fr', 'en', 'ar'];
const messagesDir = path.resolve('src/messages');

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    // Skip review comments array or special meta fields if any
    if (key.startsWith('_')) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

let hasError = false;
const keySets = {};

for (const loc of locales) {
  const filePath = path.join(messagesDir, `${loc}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing message file: ${filePath}`);
    process.exit(1);
  }
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  keySets[loc] = new Set(flattenKeys(content));
}

const baseLocale = 'fr';
const baseKeys = keySets[baseLocale];

for (const loc of locales) {
  if (loc === baseLocale) continue;
  const currentKeys = keySets[loc];

  const missing = [...baseKeys].filter((k) => !currentKeys.has(k));
  const extra = [...currentKeys].filter((k) => !baseKeys.has(k));

  if (missing.length > 0) {
    console.error(`[i18n-check] Missing keys in ${loc}.json compared to ${baseLocale}.json:`);
    for (const k of missing) console.error(`  - ${k}`);
    hasError = true;
  }
  if (extra.length > 0) {
    console.error(`[i18n-check] Extra keys in ${loc}.json not in ${baseLocale}.json:`);
    for (const k of extra) console.error(`  + ${k}`);
    hasError = true;
  }
}

if (hasError) {
  console.error('[i18n-check] FAILED: Key mismatch among locales.');
  process.exit(1);
} else {
  console.log(`[i18n-check] PASSED: All locales (${locales.join(', ')}) share exactly ${baseKeys.size} keys.`);
}
