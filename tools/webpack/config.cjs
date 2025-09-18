const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { dependencies } = require('../../package.json');

// Shared dependencies configuration
const SHARED_DEPS = {
  react: {
    singleton: true,
    requiredVersion: dependencies.react,
    eager: false, // Don't load eagerly in MFEs
  },
  'react-dom': {
    singleton: true,
    requiredVersion: dependencies['react-dom'],
    eager: false,
  },
  'react-router-dom': {
    singleton: true,
    requiredVersion: dependencies['react-router-dom'],
    eager: false,
  },
  lodash: {
    singleton: true,
    requiredVersion: dependencies.lodash,
    eager: false,
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
  module: {
    rules: [
      {
        test: /\.m?js$/,
        type: 'javascript/auto',
      },
    ],
  },
};

// Get webpack configuration for MFEs
function getWebpackMFEConfig(mfeName, exposes = {}, port) {
  return {
    ...BASE_CLIENT_CONFIG,
    mode: 'development',
    target: 'web',
    output: {
      uniqueName: mfeName,
      publicPath: `http://localhost:${port}/`,
      scriptType: 'text/javascript',
      chunkFormat: 'array-push',
    },
    devServer: {
      port,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-Requested-With, content-type, Authorization',
      },
      hot: true,
      liveReload: true,
      historyApiFallback: true,
    },
    plugins: [
      new ModuleFederationPlugin({
        name: mfeName,
        filename: 'remoteEntry.js',
        exposes,
        shared: {
          ...SHARED_DEPS,
          // Add library: { type: 'var', name: mfeName } for better compatibility
        },
        library: { type: 'var', name: mfeName },
      }),
    ],
    optimization: {
      runtimeChunk: false,
      splitChunks: false,
    },
  };
}

// Get webpack configuration for container
function getWebpackContainerConfig() {
  return {
    ...BASE_CLIENT_CONFIG,
    mode: 'development',
    target: 'web',
    output: {
      uniqueName: 'container',
      publicPath: 'http://localhost:4200/',
    },
    devServer: {
      port: 4200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-Requested-With, content-type, Authorization',
      },
      hot: true,
      liveReload: true,
      historyApiFallback: true,
    },
    plugins: [
      new ModuleFederationPlugin({
        name: 'container',
        // We load remotes dynamically, so no static remotes
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
    optimization: {
      runtimeChunk: false,
    },
  };
}

module.exports = {
  getWebpackMFEConfig,
  getWebpackContainerConfig,
  BASE_CLIENT_CONFIG,
  SHARED_DEPS,
};
