module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // superIsCallableConstructor: true tells Babel to call super() as a regular
    // function instead of using Reflect.construct / wrapNativeSuper.
    // This avoids the Hermes crash when extending native classes like Error.
    assumptions: {
      superIsCallableConstructor: true,
    },
    plugins: [
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
