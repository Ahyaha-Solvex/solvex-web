import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const desktopDir = path.join(root, 'public/sequence/blackbox/desktop');
const mobileDir = path.join(root, 'public/sequence/blackbox/mobile');

const countFrames = (dir) => {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.startsWith('f_') && f.endsWith('.webp')).length;
};

const desktopCount = countFrames(desktopDir);
const mobileCount = countFrames(mobileDir);

const seqJsonPath = path.join(root, 'src/lib/sequence.json');
let existing = {};
if (fs.existsSync(seqJsonPath)) {
  try {
    existing = JSON.parse(fs.readFileSync(seqJsonPath, 'utf8'));
  } catch (e) {}
}

const updated = {
  ...existing,
  desktop: {
    ...(existing.desktop || {}),
    count: desktopCount,
  },
  mobile: {
    ...(existing.mobile || {}),
    count: mobileCount,
  },
};

fs.writeFileSync(seqJsonPath, JSON.stringify(updated, null, 2));
console.log(`[count-frames] Updated sequence.json: desktop=${desktopCount}, mobile=${mobileCount}`);
