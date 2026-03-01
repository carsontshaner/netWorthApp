// Prevent Expo from using the monorepo root as the Metro server root.
// Without this, getMetroServerRoot() detects the workspace package.json and
// returns the repo root, causing entry-point resolution to fall back to
// node_modules/expo/AppEntry.js instead of our expo-router entry.
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// Watch hoisted node_modules so Metro can resolve packages from the repo root
config.watchFolders = [monorepoRoot];

// Resolve from app first, then monorepo root (where all deps are hoisted)
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
