import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Data files are already loaded asynchronously via roasteries-loader.ts
  // No need for custom webpack config - Turbopack handles this automatically
};

export default nextConfig;
