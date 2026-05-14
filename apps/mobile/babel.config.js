module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated v3 babel plugin. Must be last.
      'react-native-reanimated/plugin',
    ],
  };
};
