import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/n8n/:path*",
        destination: "https://n8n.tqbaoo.host/:path*",
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    proxyTimeout: 1000 * 120,
  }
};

export default nextConfig;
