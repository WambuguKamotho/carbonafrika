// Monorepo-aware Metro config. The app lives in apps/mobile but dependencies are
// hoisted to the repo root node_modules, so Metro must watch the root and resolve
// modules from both locations.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// Prefer the app's own copy first, then fall back to the hoisted root.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
