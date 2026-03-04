import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Data files are already loaded asynchronously via roasteries-loader.ts
  // No need for custom webpack config - Turbopack handles this automatically
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
