/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_POLYGON_CHAIN_ID: process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  },
  // Proxy /api/* to individual microservices when no API gateway is running
  async rewrites() {
    const authUrl   = process.env.AUTH_SERVICE_URL   || "http://localhost:3001";
    const projectUrl= process.env.PROJECT_SERVICE_URL|| "http://localhost:3002";
    const mktUrl    = process.env.MARKETPLACE_URL    || "http://localhost:3003";
    const verifyUrl = process.env.VERIFY_SERVICE_URL || "http://localhost:3004";

    return [
      { source: "/api/auth/:path*",          destination: `${authUrl}/auth/:path*` },
      { source: "/api/projects/:path*",       destination: `${projectUrl}/projects/:path*` },
      { source: "/api/marketplace/:path*",    destination: `${mktUrl}/marketplace/:path*` },
      { source: "/api/verifications/:path*",  destination: `${verifyUrl}/verifications/:path*` },
    ];
  },
};

module.exports = nextConfig;
