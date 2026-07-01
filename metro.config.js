const { getDefaultConfig } = require("expo/metro-config");

// The 0G relay (Huru) lives in /relay as its own Next.js app. Keep it out of the
// mobile app's Metro graph so it isn't bundled or watched as part of the app.
const config = getDefaultConfig(__dirname);

// /relay (Huru gateway) and /inft (ERC-7857 Hardhat workspace) are separate
// projects — keep both out of the mobile app's Metro graph.
const excludes = [/.*\/relay\/.*/, /.*\/inft\/.*/];
const existing = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existing)
  ? [...existing, ...excludes]
  : existing
    ? [existing, ...excludes]
    : excludes;

module.exports = config;
