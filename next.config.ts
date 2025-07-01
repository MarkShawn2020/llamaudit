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
    
    // Add a rule to exclude the directory from being processed by webpack's loaders
    config.module.rules.push({
      test: /dify-docs/, // A regex to match the path
      use: 'null-loader', // Use a loader that returns an empty module
    });
    
    return config;
  }
};

export default nextConfig;
