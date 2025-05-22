import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/n8n/:path*",
        destination: "http://kltn-n8n-c9dee5-140-245-45-78.traefik.me/:path*",
        has: [
          {
            type: 'header',
            key: 'connection',
            value: 'keep-alive',
          },
        ],
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
};

export default nextConfig;
