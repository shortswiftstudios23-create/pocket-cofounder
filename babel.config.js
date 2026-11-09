// babel-preset-expo adds the Reanimated plugin automatically when react-native-reanimated is installed (SDK 50+).
module.exports = function (api) { api.cache(true); return { presets: ['babel-preset-expo'] }; };
