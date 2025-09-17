const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const { getWebpackContainerConfig } = require('../tools/webpack/config.cjs');

module.exports = composePlugins(withNx(), withReact(), (config) => {
  // Merge container configuration
  const containerConfig = getWebpackContainerConfig();

  config.output = {
    ...config.output,
    ...containerConfig.output,
  };

  config.devServer = {
    ...config.devServer,
    ...containerConfig.devServer,
  };

  config.plugins = [...config.plugins, ...containerConfig.plugins];

  config.resolve = {
    ...config.resolve,
    ...containerConfig.resolve,
  };

  // Disable optimization for development
  config.optimization = {
    ...config.optimization,
    runtimeChunk: false,
  };

  return config;
});
