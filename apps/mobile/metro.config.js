const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo root (two levels up from apps/mobile)
const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// Watch both the app directory and the monorepo root
config.watchFolders = [monorepoRoot];

// Tell Metro where to look for modules — app first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure Metro can resolve from the monorepo root
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
