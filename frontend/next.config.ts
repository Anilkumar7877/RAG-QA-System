import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // In production (Vercel), route /api/* to the serverless Python handler (api/index.py)
        // In local development, proxy to the uvicorn server running on port 8000
        destination: process.env.NODE_ENV === "production"
          ? "/api"
          : "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
