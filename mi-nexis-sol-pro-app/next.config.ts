import type { NextConfig } from "next";

/**
 * This app requires a Node.js server runtime (API routes call Google Solar API and
 * HubSpot with server-only secrets, and read/write Postgres via Prisma), so it is
 * deployed to a Node-capable host such as Vercel — NOT exported/hosted on the
 * josueleto77.github.io GitHub Pages site, which only serves static files. See
 * README.md "Deployment" for details.
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "*.googleapis.com" },
    ],
  },
};

export default nextConfig;
