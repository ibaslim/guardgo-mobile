const fs = require('fs');
const os = require('os');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

/**
 * Keeps local Android builds working after `android/` is deleted and regenerated.
 *
 * 1. android/local.properties (gitignored, wiped with the folder) is rewritten with:
 *    - sdk.dir:   from ANDROID_HOME / ANDROID_SDK_ROOT, or the default Android Studio location.
 *    - cmake.dir: the newest CMake installed in the SDK. The default 3.22.1 ships ninja 1.10, which
 *                 fails on long paths on Windows (react-native-worklets, reanimated, ...).
 *    Lines already present in the file are kept.
 *
 * 2. Set GUARDGO_DEV_BUNDLE=1 when running prebuild to make release builds bundle the JS with
 *    __DEV__ = true (shows the dev-only test-account picker). Without it, releases are normal.
 */
const MARKER = '// guardgo-dev-bundle';

function findSdkDir() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    path.join(os.homedir(), 'Library', 'Android', 'sdk'),
    path.join(os.homedir(), 'Android', 'Sdk'),
  ];
  return candidates.find((dir) => dir && fs.existsSync(dir)) ?? null;
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function findNewestCmake(sdkDir) {
  const cmakeRoot = path.join(sdkDir, 'cmake');
  if (!fs.existsSync(cmakeRoot)) return null;
  const versions = fs
    .readdirSync(cmakeRoot)
    .filter((name) => /^\d+(\.\d+)+$/.test(name) && fs.existsSync(path.join(cmakeRoot, name, 'bin')))
    .sort(compareVersions);
  return versions.length ? path.join(cmakeRoot, versions[versions.length - 1]) : null;
}

// local.properties is a Java properties file: backslashes would be read as escapes.
const toPropertiesPath = (value) => value.replace(/\\/g, '/');

function writeLocalProperties(androidDir) {
  const sdkDir = findSdkDir();
  if (!sdkDir) {
    console.warn('with-android-build-env: Android SDK not found, set ANDROID_HOME. Skipping local.properties.');
    return;
  }

  const file = path.join(androidDir, 'local.properties');
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean) : [];
  const keep = existing.filter((line) => !/^(sdk|cmake)\.dir\s*=/.test(line.trim()));

  const lines = [...keep, `sdk.dir=${toPropertiesPath(sdkDir)}`];
  const cmakeDir = findNewestCmake(sdkDir);
  if (cmakeDir) lines.push(`cmake.dir=${toPropertiesPath(cmakeDir)}`);

  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}

function addDevBundle(buildGradle) {
  if (buildGradle.includes(MARKER)) return buildGradle;
  if (!/^react \{/m.test(buildGradle)) {
    throw new Error('with-android-build-env: app/build.gradle has no react { } block');
  }
  return buildGradle.replace(/^react \{/m, `react {\n    extraPackagerArgs = ["--dev", "true"] ${MARKER}`);
}

module.exports = function withAndroidBuildEnv(config) {
  config = withDangerousMod(config, [
    'android',
    (config) => {
      writeLocalProperties(config.modRequest.platformProjectRoot);
      return config;
    },
  ]);

  if (process.env.GUARDGO_DEV_BUNDLE === '1') {
    config = withAppBuildGradle(config, (config) => {
      config.modResults.contents = addDevBundle(config.modResults.contents);
      return config;
    });
  }

  return config;
};
