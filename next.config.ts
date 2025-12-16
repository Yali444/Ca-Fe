import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Make data files load asynchronously to prevent mobile Safari crashes
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            data: {
              test: /[\\/]src[\\/]data[\\/]/,
              name: 'data',
              chunks: 'async',
              priority: 10,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
