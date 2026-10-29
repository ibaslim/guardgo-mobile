const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs Android release builds with the GuardGo upload key.
 *
 * The key is read from Gradle properties, which belong in ~/.gradle/gradle.properties
 * (never in the repo):
 *   GUARDGO_UPLOAD_STORE_FILE      absolute path to the .jks/.keystore file
 *   GUARDGO_UPLOAD_STORE_PASSWORD
 *   GUARDGO_UPLOAD_KEY_ALIAS
 *   GUARDGO_UPLOAD_KEY_PASSWORD
 *
 * Without them, release builds fall back to the debug key (fine for test builds).
 * Passing -PguardgoRequireReleaseSigning=true makes a missing key fail the build instead.
 */
const MARKER = '// guardgo-release-signing';

const RELEASE_SIGNING_CONFIG = `
        release { ${MARKER}
            if (findProperty('GUARDGO_UPLOAD_STORE_FILE')) {
                storeFile file(findProperty('GUARDGO_UPLOAD_STORE_FILE'))
                storePassword findProperty('GUARDGO_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('GUARDGO_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('GUARDGO_UPLOAD_KEY_PASSWORD')
            } else if ((findProperty('guardgoRequireReleaseSigning') ?: 'false').toBoolean()) {
                throw new GradleException('Release signing is not configured: set GUARDGO_UPLOAD_* in ~/.gradle/gradle.properties')
            }
        }`;

const RELEASE_SIGNING_REF =
  "signingConfig findProperty('GUARDGO_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug";

function addReleaseSigning(buildGradle) {
  if (buildGradle.includes(MARKER)) {
    return buildGradle;
  }

  const signingConfigs = /signingConfigs \{\n\s+debug \{[^}]*\}/;
  const releaseBuildType = /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!signingConfigs.test(buildGradle) || !releaseBuildType.test(buildGradle)) {
    throw new Error('with-release-signing: app/build.gradle does not have the expected signing setup');
  }

  // Patch the release build type first, so its pattern can't match the release signing config.
  return buildGradle
    .replace(releaseBuildType, (_, before) => before + RELEASE_SIGNING_REF)
    .replace(signingConfigs, (match) => match + RELEASE_SIGNING_CONFIG);
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = addReleaseSigning(config.modResults.contents);
    return config;
  });
};
