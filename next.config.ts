import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Try-on payloads are data URLs, which are larger than the default body limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
