module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Babel 7 assumptions: avoids Reflect.construct / wrapNativeSuper
    // which crashes on Hermes when extending native classes (e.g. Error)
    assumptions: {
      setPublicClassFields: true,
      privateFieldsAsProperties: true,
      superIsCallableConstructor: false,
    },
    plugins: [
      ['@babel/plugin-transform-classes',          { loose: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods',  { loose: true }],
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
