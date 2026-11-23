/**
 * Generates every raster brand asset from assets/brand/logo.svg:
 *   icon.png, splash-icon.png, favicon.png, logo-mark.png and the android-icon-* set.
 * Optional assets/brand/logo-mono.svg is used for the Android themed icon
 * (falls back to the logo's silhouette).
 *
 *   node scripts/generate-brand-assets.js          regenerate if the source changed
 *   node scripts/generate-brand-assets.js --force  always regenerate
 *
 * Also runs automatically on `expo prebuild` via plugins/with-brand-assets.js.
 * Needs the dev dependency `sharp`.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BRAND = path.join(ROOT, 'assets', 'brand');
const OUT = path.join(ROOT, 'assets', 'images');
const STAMP = path.join(BRAND, '.generated-hash');
const LIGHT_BG = '#F8FAFC';

// name, canvas px, logo height as a fraction of the canvas, background (null = transparent), source
const TARGETS = [
  ['icon.png', 1024, 0.66, LIGHT_BG, 'logo'],
  ['splash-icon.png', 1024, 0.9, null, 'logo'],
  ['favicon.png', 48, 0.8, LIGHT_BG, 'logo'],
  ['logo-mark.png', 256, 0.94, null, 'logo'],
  ['android-icon-foreground.png', 512, 0.5, null, 'logo'],
  ['android-icon-background.png', 512, 0, LIGHT_BG, null],
  ['android-icon-monochrome.png', 432, 0.5, null, 'mono'],
];

function sourceHash(files) {
  const h = crypto.createHash('sha1');
  for (const f of files) if (fs.existsSync(f)) h.update(fs.readFileSync(f));
  h.update(fs.readFileSync(__filename));
  return h.digest('hex');
}

async function generateBrandAssets({ force = false } = {}) {
  const logo = path.join(BRAND, 'logo.svg');
  const monoPath = path.join(BRAND, 'logo-mono.svg');
  if (!fs.existsSync(logo)) throw new Error(`Missing ${logo}`);

  const hash = sourceHash([logo, monoPath]);
  const outputsExist = TARGETS.every(([n]) => fs.existsSync(path.join(OUT, n)));
  if (!force && outputsExist && fs.existsSync(STAMP) && fs.readFileSync(STAMP, 'utf8') === hash) return false;

  const sharp = require('sharp');
  const sources = { logo: fs.readFileSync(logo), mono: fs.readFileSync(fs.existsSync(monoPath) ? monoPath : logo) };

  for (const [name, size, frac, bg, src] of TARGETS) {
    const canvas = sharp({
      create: { width: size, height: size, channels: 4, background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } },
    });
    const layers = [];
    if (src) {
      const box = Math.round(size * frac);
      let img = sharp(sources[src], { density: 600 }).resize(box, box, { fit: 'inside' });
      // Without a dedicated mono SVG, flatten the logo to a solid silhouette.
      if (src === 'mono' && !fs.existsSync(monoPath)) img = img.ensureAlpha().tint('#000000');
      layers.push({ input: await img.png().toBuffer(), gravity: 'center' });
    }
    await canvas.composite(layers).png().toFile(path.join(OUT, name));
  }
  fs.writeFileSync(STAMP, hash);
  return true;
}

module.exports = { generateBrandAssets };

if (require.main === module) {
  generateBrandAssets({ force: process.argv.includes('--force') })
    .then((changed) => console.log(changed ? 'Brand assets regenerated.' : 'Brand assets up to date.'))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
