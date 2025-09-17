const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { dependencies } = require('../../package.json');

// Shared dependencies configuration
const SHARED_DEPS = {
  react: {
    singleton: true,
    requiredVersion: dependencies.react,
  },
  'react-dom': {
    singleton: true,
    requiredVersion: dependencies['react-dom'],
  },
  'react-router-dom': {
    singleton: true,
    requiredVersion: dependencies['react-router-dom'],
  },
  lodash: {
    singleton: true,
    requiredVersion: dependencies.lodash,
  },
};

// Base webpack configuration
const BASE_CLIENT_CONFIG = {
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    fallback: {
      buffer: require.resolve('buffer/'),
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process/browser'),
    },
  },
};

// Get webpack configuration for MFEs
function getWebpackMFEConfig(mfeName, exposes = {}, port) {
  return {
    ...BASE_CLIENT_CONFIG,
    output: {
      uniqueName: mfeName,
      publicPath: `http://localhost:${port}/`,
    },
    devServer: {
      port,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      hot: true,
    },
    plugins: [
      new ModuleFederationPlugin({
        name: mfeName,
        filename: 'remoteEntry.js',
        exposes,
        shared: SHARED_DEPS,
      }),
    ],
  };
}

// Get webpack configuration for container
function getWebpackContainerConfig() {
  return {
    ...BASE_CLIENT_CONFIG,
    output: {
      uniqueName: 'container',
      publicPath: 'http://localhost:4200/',
    },
    devServer: {
      port: 4200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      hot: true,
    },
    plugins: [
      new ModuleFederationPlugin({
        name: 'container',
        // No remotes - we'll load them dynamically
        shared: {
          ...SHARED_DEPS,
          // Container needs eager loading for shared deps
          react: {
            ...SHARED_DEPS.react,
            eager: true,
          },
          'react-dom': {
            ...SHARED_DEPS['react-dom'],
            eager: true,
          },
          'react-router-dom': {
            ...SHARED_DEPS['react-router-dom'],
            eager: true,
          },
          lodash: {
            ...SHARED_DEPS.lodash,
            eager: true,
          },
        },
      }),
    ],
  };
}

module.exports = {
  getWebpackMFEConfig,
  getWebpackContainerConfig,
  BASE_CLIENT_CONFIG,
  SHARED_DEPS,
};
