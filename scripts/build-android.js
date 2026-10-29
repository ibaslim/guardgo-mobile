/**
 * Builds a release APK for Android.
 *
 *   npm run test-build      arm64-v8a only, signed with the debug key -> builds/test/release.apk
 *   npm run release-build   all ABIs, minified, signed with the upload key -> builds/production/release.apk
 *
 * The production build fails if the upload key is not configured (see plugins/with-release-signing.js).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODES = {
  test: {
    gradleArgs: ['-PreactNativeArchitectures=arm64-v8a'],
  },
  production: {
    gradleArgs: [
      '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64',
      '-Pandroid.enableMinifyInReleaseBuilds=true',
      '-Pandroid.enableShrinkResourcesInReleaseBuilds=true',
      '-PguardgoRequireReleaseSigning=true',
    ],
  },
};

const isWindows = process.platform === 'win32';
const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: isWindows, ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Gradle does not support the newest JDKs yet; prefer the one bundled with Android Studio.
function findJavaHome() {
  if (process.env.JAVA_HOME) {
    return process.env.JAVA_HOME;
  }
  const candidates = isWindows
    ? ['C:\\Program Files\\Android\\Android Studio\\jbr']
    : ['/Applications/Android Studio.app/Contents/jbr/Contents/Home'];
  return candidates.find((dir) => fs.existsSync(dir));
}

function findAndroidSdk() {
  if (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT) {
    return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  }
  const home = require('os').homedir();
  const candidates = isWindows
    ? [path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')]
    : [path.join(home, 'Library', 'Android', 'sdk'), path.join(home, 'Android', 'Sdk')];
  return candidates.find((dir) => fs.existsSync(dir));
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Prebuild can recreate android/, which drops local.properties. Recreate it so Gradle finds the SDK,
// and on Windows point it at the newest CMake: the ninja bundled with CMake 3.22 can't handle the
// long paths React Native's C++ build creates.
function ensureLocalProperties() {
  const file = path.join(androidDir, 'local.properties');
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const escape = (value) => value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  const lines = [];

  const sdkDir = findAndroidSdk();
  if (sdkDir && !/^sdk\.dir=/m.test(existing)) {
    lines.push(`sdk.dir=${escape(sdkDir)}`);
  }

  if (sdkDir && isWindows && !/^cmake\.dir=/m.test(existing)) {
    const cmakeRoot = path.join(sdkDir, 'cmake');
    const versions = fs.existsSync(cmakeRoot) ? fs.readdirSync(cmakeRoot).sort(compareVersions) : [];
    const newest = versions[versions.length - 1];
    if (newest && compareVersions(newest, '3.31') >= 0) {
      lines.push(`cmake.dir=${escape(path.join(cmakeRoot, newest))}`);
    } else {
      console.warn('Warning: install CMake 3.31+ from the Android SDK Manager, or the C++ build may fail.');
    }
  }

  if (lines.length > 0) {
    const prefix = existing && !existing.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(file, existing + prefix + lines.join('\n') + '\n');
  }
}

const modeName = process.argv[2];
const mode = MODES[modeName];
if (!mode) {
  console.error(`Usage: node scripts/build-android.js <${Object.keys(MODES).join('|')}>`);
  process.exit(1);
}

// Sync android/ with app.json and config plugins.
run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], { cwd: root });
ensureLocalProperties();

const env = { ...process.env };
const javaHome = findJavaHome();
if (javaHome) {
  env.JAVA_HOME = javaHome;
}

const gradlew = isWindows ? `"${path.join(androidDir, 'gradlew.bat')}"` : path.join(androidDir, 'gradlew');
run(gradlew, ['app:assembleRelease', ...mode.gradleArgs], {
  cwd: androidDir,
  env,
});

const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const outDir = path.join(root, 'builds', modeName);
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'release.apk');
fs.copyFileSync(apk, outFile);

const sizeMb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1);
console.log(`\n${modeName} build ready: ${path.relative(root, outFile)} (${sizeMb} MB)`);
