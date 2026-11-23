const { execFileSync } = require('child_process');
const path = require('path');

/**
 * Regenerates the icon / splash / favicon PNGs from assets/brand/logo.svg (see
 * scripts/generate-brand-assets.js). Runs synchronously while the config resolves, so it must be
 * listed BEFORE expo-splash-screen in app.json to have the files ready when that plugin reads them.
 * A failure (e.g. sharp not installed) only warns; the committed PNGs are used as they are.
 */
module.exports = function withBrandAssets(config) {
  try {
    execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'generate-brand-assets.js')], { stdio: 'inherit' });
  } catch {
    console.warn('[brand-assets] generation skipped; using existing PNGs in assets/images');
  }
  return config;
};
