import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // Set workspace root to avoid lockfile warning
  outputFileTracingRoot: path.join(__dirname, '../../'),
  experimental: {
    // Disable PPR - incompatible with Clerk
    ppr: false,
  },
};

export default nextConfig;
