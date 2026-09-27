const { withAppBuildGradle } = require("expo/config-plugins");

const releaseSigning = `
        release {
            if (findProperty("BARK_OFF_UPLOAD_STORE_FILE")) {
                storeFile file(BARK_OFF_UPLOAD_STORE_FILE)
                storePassword BARK_OFF_UPLOAD_STORE_PASSWORD
                keyAlias BARK_OFF_UPLOAD_KEY_ALIAS
                keyPassword BARK_OFF_UPLOAD_KEY_PASSWORD
            }
        }`;

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let src = config.modResults.contents;
    if (src.includes("BARK_OFF_UPLOAD_STORE_FILE")) return config;

    src = src.replace(
      /keyPassword 'android'\n        \}\n    \}/,
      `keyPassword 'android'\n        }\n${releaseSigning}\n    }`,
    );
    src = src.replace(
      /release \{\n            \/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/,
      (block) =>
        block.replace(
          "signingConfig signingConfigs.debug",
          'signingConfig findProperty("BARK_OFF_UPLOAD_STORE_FILE") ? signingConfigs.release : signingConfigs.debug',
        ),
    );
    config.modResults.contents = src;
    return config;
  });
}

module.exports = withReleaseSigning;
