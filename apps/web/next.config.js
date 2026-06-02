// Load root monorepo .env so server-side API routes (e.g. /api/ipfs/upload) can
// access vars that are defined there but not in apps/web/.env
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Trace workspace deps (e.g. @carbonafrika/types) into the standalone bundle
  // so the Docker runtime image is self-contained in the monorepo.
  experimental: {
    outputFileTracingRoot: require("path").resolve(__dirname, "../../"),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "unpkg.com" },
      { protocol: "https", hostname: "*.ipfs.io" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          // Camera/microphone still blocked. Geolocation allowed for our own origin
          // so the project-creation map's "Use my location" button works.
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control",    value: "on" },
          // Content-Security-Policy. Deliberately permissive where the app needs it
          // (inline styles for Tailwind/Recharts, https/wss for RPC + WalletConnect,
          // https/data/blob images for Unsplash/IPFS/OSM tiles) while still blocking
          // arbitrary script/object hosts and framing. 'unsafe-eval' is required by
          // some web3 libs; tighten later with nonces if you drop them.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Google Fonts (Inter) stylesheet + Leaflet CSS from unpkg.
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
              "img-src 'self' data: blob: https:",
              // Google Fonts serves the actual font files from fonts.gstatic.com.
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https: wss:",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_POLYGON_CHAIN_ID: process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS,
    NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS: process.env.NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS,
  },
  // Proxy /api/* to individual microservices when no API gateway is running
  async rewrites() {
    const authUrl   = process.env.AUTH_SERVICE_URL   || "http://localhost:3001";
    const projectUrl= process.env.PROJECT_SERVICE_URL|| "http://localhost:3002";
    const mktUrl    = process.env.MARKETPLACE_URL    || "http://localhost:3003";
    const verifyUrl = process.env.VERIFY_SERVICE_URL || "http://localhost:3004";
    const iotUrl    = process.env.IOT_SERVICE_URL    || "http://localhost:3005";

    return [
      { source: "/api/auth/:path*",                        destination: `${authUrl}/auth/:path*` },
      { source: "/api/admin/:path*",                       destination: `${authUrl}/admin/:path*` },
      // specific project sub-routes must come before the generic projects rule
      { source: "/api/projects/:id/satellites",            destination: `${projectUrl}/projects/:id/satellites` },
      { source: "/api/projects/:id/status",                destination: `${projectUrl}/projects/:id/status` },
      { source: "/api/projects/:path*",                    destination: `${projectUrl}/projects/:path*` },
      { source: "/api/blog/:path*",                        destination: `${projectUrl}/blog/:path*` },
      { source: "/api/blog",                               destination: `${projectUrl}/blog` },
      { source: "/api/marketplace/:path*",                 destination: `${mktUrl}/marketplace/:path*` },
      { source: "/api/verifications/:path*",               destination: `${verifyUrl}/verifications/:path*` },
      // IoT ingestion + device management (dedicated iot-service)
      { source: "/api/iot/:path*",                          destination: `${iotUrl}/iot/:path*` },
    ];
  },
};

module.exports = nextConfig;
