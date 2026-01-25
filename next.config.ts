import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    optimizePackageImports: ["@prisma/client"],
  },
  // Required for Prisma on Vercel serverless
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/.prisma/**/*"],
  },
};

export default nextConfig;
