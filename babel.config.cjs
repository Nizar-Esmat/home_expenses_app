module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Loose mode avoids Reflect.construct / wrapNativeSuper which crashes
      // on Hermes when extending native classes (e.g. Error in expo-modules-core)
      ['@babel/plugin-transform-classes', { loose: true }],
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@/components': './src/components',
            '@/screens':    './src/screens',
            '@/services':   './src/services',
            '@/theme':      './src/theme',
            '@/types':      './src/types',
          },
        },
      ],
    ],
  };
};
