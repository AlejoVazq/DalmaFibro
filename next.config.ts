import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Los mockups pueden pesar hasta 20 MB cada uno.
    serverActions: { bodySizeLimit: "100mb" },
  },
};

export default nextConfig;
