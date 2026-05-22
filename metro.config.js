// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ── Asset extensions ────────────────────────────────────────────────────────
// Ensure common asset types are handled (Expo adds most, but adding lottie etc.)
config.resolver.assetExts = [
  ...config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  'lottie',
  'glb',
  'gltf',
  'bin',
];

// ── Source extensions ───────────────────────────────────────────────────────
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'svg',
  'cjs',
  'mjs',
];

// ── SVG transformer ─────────────────────────────────────────────────────────
// Allows importing .svg files as React components
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// ── NativeWind integration ──────────────────────────────────────────────────
// Wrap the config with NativeWind to process Tailwind classes
module.exports = withNativeWind(config, {
  // Points to the global CSS file that @tailwind directives live in
  input: './global.css',
});
