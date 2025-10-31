/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
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
    };

    // Ignore React Native and optional dependencies
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    config.resolve.alias['pino-pretty'] = false;
    
    // Ignore Node.js-only packages that don't work in browser
    if (!isServer) {
      config.resolve.alias['ws'] = false;
      config.resolve.alias['events'] = false;
    }

    return config;
  },
};

module.exports = nextConfig;

