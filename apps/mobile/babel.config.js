module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated v4 uses react-native-worklets/plugin (NOT react-native-reanimated/plugin).
      // This must be the LAST plugin.
      'react-native-worklets/plugin',
    ],
  };
};
