import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true
  },
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      { module: /node_modules\/any-promise/ }
    ];
    return config;
  }
};

export default nextConfig;
