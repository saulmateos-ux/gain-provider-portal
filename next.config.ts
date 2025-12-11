import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable PPR - incompatible with Clerk
    ppr: false,
  },
};

export default nextConfig;
