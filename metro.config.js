const { getDefaultConfig } = require("expo/metro-config");

// The 0G relay (Huru) lives in /relay as its own Next.js app. Keep it out of the
// mobile app's Metro graph so it isn't bundled or watched as part of the app.
const config = getDefaultConfig(__dirname);

const relayExclude = /.*\/relay\/.*/;
const existing = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existing)
  ? [...existing, relayExclude]
  : existing
    ? [existing, relayExclude]
    : [relayExclude];

module.exports = config;
