const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [
  ...config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  'lottie',
];

config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'svg',
  'cjs',
  'mjs',
];

// Web mocks for native-only modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const webMocks = {
      'react-native-reanimated': path.resolve(__dirname, 'src/mocks/react-native-reanimated.js'),
      'react-native-gesture-handler': path.resolve(__dirname, 'src/mocks/gesture-handler.js'),
      'lottie-react-native': path.resolve(__dirname, 'src/mocks/lottie.js'),
      'react-native-purchases': path.resolve(__dirname, 'src/mocks/purchases.js'),
    };
    if (webMocks[moduleName]) {
      return { filePath: webMocks[moduleName], type: 'sourceFile' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
