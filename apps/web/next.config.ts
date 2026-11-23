import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paylaşılan hesap mantığı (packages/core) TypeScript kaynağı olarak gelir, Next derler
  transpilePackages: ["@mesai/core"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
