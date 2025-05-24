import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/n8n/:path*",
        destination: "https://n8n.tqbaoo.host/:path*",
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
