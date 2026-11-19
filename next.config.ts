import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product analytics: PostHog is reached through our own domain (/ingest).
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  // PostHog API paths end with a slash; don't redirect them.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
