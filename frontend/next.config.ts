import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // In local development, proxy API calls to the local FastAPI dev server.
        // On Vercel, Vercel's native router in vercel.json will handle requests to /api/*.
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
