module.exports = ({ config }) => {
  const IS_DEV = process.env.APP_ENV === 'development';
  const IS_PREVIEW = process.env.APP_ENV === 'preview';

  const getUniqueIdentifier = () => {
    if (IS_DEV) return 'com.budgetbuddy.app.dev';
    if (IS_PREVIEW) return 'com.budgetbuddy.app.preview';
    return 'com.budgetbuddy.app';
  };

  const getAppName = () => {
    if (IS_DEV) return 'BudgetBuddy (Dev)';
    if (IS_PREVIEW) return 'BudgetBuddy (Test)';
    return 'BudgetBuddy';
  };

  const getScheme = () => {
    if (IS_DEV) return 'budgetbuddy-dev';
    if (IS_PREVIEW) return 'budgetbuddy-test';
    return 'budgetbuddy';
  };

  return {
    ...config,
    name: getAppName(),
    scheme: getScheme(),
    android: {
      ...(config.android || {}),
      package: getUniqueIdentifier(),
    },
    ios: {
      ...(config.ios || {}),
      bundleIdentifier: getUniqueIdentifier(),
    },
  };
};
