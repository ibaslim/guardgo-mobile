const fs = require('fs');

/**
 * JDK for Gradle. Gradle doesn't support the newest JDKs yet (Java 27 fails with "Unsupported class
 * file major version 71"), so without JAVA_HOME prefer the JDK bundled with Android Studio over
 * whatever `java` is on the PATH.
 */
function findJavaHome() {
  if (process.env.JAVA_HOME) {
    return process.env.JAVA_HOME;
  }
  const candidates =
    process.platform === 'win32'
      ? ['C:\\Program Files\\Android\\Android Studio\\jbr']
      : ['/Applications/Android Studio.app/Contents/jbr/Contents/Home'];
  return candidates.find((dir) => fs.existsSync(dir));
}

module.exports = { findJavaHome };
