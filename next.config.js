/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Ignore React Native and optional dependencies
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    config.resolve.alias['pino-pretty'] = false;

    return config;
  },
};

module.exports = nextConfig;

