const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

// Watch monorepo root for hoisted packages
config.watchFolders = [monorepoRoot];

// Resolve modules from app first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force Metro to use apps/mobile as the project root
config.projectRoot = __dirname;

module.exports = config;
