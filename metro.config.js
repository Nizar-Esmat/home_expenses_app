const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude leftover temp directories from uninstalled packages
const { blockList } = config.resolver;
const exclusions = [/node_modules[/\\]\.react-native-worklets.*/];
config.resolver.blockList = blockList
  ? [blockList, ...exclusions]
  : exclusions;

module.exports = config;
