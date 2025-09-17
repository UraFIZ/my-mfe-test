const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const { getWebpackMFEConfig } = require('../tools/webpack/config');

module.exports = composePlugins(withNx(), withReact(), (config) => {
  // Configure for Dashboard MFE
  const mfeConfig = getWebpackMFEConfig(
    'dashboardMfe', // CRITICAL: This must match the name used in dynamic imports
    {
      './Module': './src/app/app.tsx', // Simple expose for now
    },
    4202
  );

  config.output = {
    ...config.output,
    ...mfeConfig.output,
  };

  config.devServer = {
    ...config.devServer,
    ...mfeConfig.devServer,
  };

  config.plugins = [...config.plugins, ...mfeConfig.plugins];

  config.resolve = {
    ...config.resolve,
    ...mfeConfig.resolve,
  };

  // Disable optimization for development
  config.optimization = {
    ...config.optimization,
    runtimeChunk: false,
  };

  return config;
});
