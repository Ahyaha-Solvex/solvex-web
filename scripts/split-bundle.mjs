// usage: node scripts/split-bundle.mjs SOLVEX_WEB_BUNDLE.md
import fs from 'node:fs';
import path from 'node:path';
const src = fs.readFileSync(process.argv[2], 'utf8');
const parts = src.split(/<!-- FILE: (.+?) -->\r?\n/);
for (let i = 1; i < parts.length; i += 2) {
  const file = parts[i].trim();
  let body = parts[i + 1];
  // strip an enclosing ```lang fence if the whole body is one fenced block
  const m = body.trim().match(/^```[a-z]*\r?\n([\s\S]*?)\r?\n```$/);
  if (m) body = m[1] + '\n';
  fs.mkdirSync(path.dirname(file) || '.', { recursive: true });
  fs.writeFileSync(file, body);
  console.log('wrote', file);
}
