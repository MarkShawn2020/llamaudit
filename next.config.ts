import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    ppr: true,
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      { module: /node_modules\/any-promise/ }
    ];
    
    return config;
  }
};

export default nextConfig;
