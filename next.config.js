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

      // Exclude Daydreams SDK packages from client bundle (they use Node.js modules)
      config.externals = config.externals || [];
      config.externals.push({
        '@daydreamsai/core': 'commonjs @daydreamsai/core',
        '@daydreamsai/ai-sdk-provider': 'commonjs @daydreamsai/ai-sdk-provider',
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

