const { getDefaultConfig } = require('expo/metro-config');
const { exclusionList } = require('metro-config');

const config = getDefaultConfig(__dirname);

// Exclude leftover temp directories from uninstalled packages
config.resolver.blockList = exclusionList([
  /node_modules[/\\]\.react-native-worklets.*/,
]);

module.exports = config;
