/**
 * Builds the development app, installs it on the connected device or emulator and starts Metro
 * (`expo run:android`), using a JDK that Gradle supports (see java-home.js).
 *
 *   npm run android
 *   npm run android -- --device    extra arguments go to expo run:android
 */
const { spawnSync } = require('child_process');
const path = require('path');

const { findJavaHome } = require('./java-home');

const env = { ...process.env };
const javaHome = findJavaHome();
if (javaHome) {
  env.JAVA_HOME = javaHome;
  console.log(`Using JDK: ${javaHome}`);
} else {
  console.warn('Warning: no JAVA_HOME and no Android Studio JDK found; Gradle will use the java on your PATH.');
}

const result = spawnSync('npx', ['expo', 'run:android', ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
