import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

// Wrap with Sentry only if DSN is configured
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Sentry build options
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI, // Suppress logs in local dev
      widenClientFileUpload: true,
      disableLogger: true,
      // Only upload source maps if auth token is set
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  : nextConfig;
