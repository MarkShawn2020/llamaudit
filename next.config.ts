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
    
    // Ignore broken symlinks, ref: https://claude.ai/chat/2d76366f-bd90-4c85-9bfc-7d8d21e61721
    config.resolve.symlinks = false;
    return config;
  }
};

export default nextConfig;
