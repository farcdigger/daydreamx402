/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Client-side bundling: Exclude Node.js-only packages completely
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        events: false,
        ws: false,
        stream: false,
        crypto: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
        child_process: false,
        dns: false,
        os: false,
        path: false,
        querystring: false,
      };

      // Exclude only Node.js-specific parts from client bundle
      // generateX402PaymentBrowser is browser-compatible, allow it
      config.externals = config.externals || [];
      config.externals.push({
        '@daydreamsai/core': 'commonjs @daydreamsai/core',
        // Keep ai-sdk-provider for browser functions like generateX402PaymentBrowser
        'ws': 'commonjs ws',
        'events': 'commonjs events',
      });

      // Ignore React Native and optional dependencies
      if (!config.resolve.alias) {
        config.resolve.alias = {};
      }
      
      config.resolve.alias['@react-native-async-storage/async-storage'] = false;
      config.resolve.alias['pino-pretty'] = false;
      config.resolve.alias['ws'] = false;
      config.resolve.alias['events'] = false;
    }

    return config;
  },
};

module.exports = nextConfig;

