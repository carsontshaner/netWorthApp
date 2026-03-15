const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const expectedRoot = path.resolve(__dirname);
const actualRoot = path.resolve(process.cwd());

if (!actualRoot.endsWith('apps\\mobile') &&
    !actualRoot.endsWith('apps/mobile')) {
  console.warn(
    '\n⚠️  WARNING: Metro is running from: ' + actualRoot +
    '\n   It should run from: ' + expectedRoot +
    '\n   Run: cd apps/mobile && npx expo start --tunnel --clear\n'
  );
}

const monorepoRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.projectRoot = path.resolve(__dirname);

const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes('AppEntry')) {
    return {
      filePath: path.resolve(__dirname, 'index.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
