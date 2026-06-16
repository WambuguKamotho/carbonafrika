import type { MetadataRoute } from "next";

// Generated at /robots.txt. Allow public pages; keep app/admin/auth surfaces
// out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Allow must be listed before Disallow for the more-specific /partner-application
      // rule to win over the shorter /partner prefix match (Google picks the longest match).
      allow: ["/", "/partner-application"],
      disallow: [
        "/admin",
        "/api",
        "/settings",
        "/verifier",
        "/dashboard",
        "/portfolio",
        "/partner",        // community-partner dashboard — NOT /partner-application
        "/projects/new",   // middleware 307-redirects this to /login; disallow so Googlebot doesn't follow public links to it
        "/redeem-invite",
        "/reset-password",
        "/forgot-password",
      ],
    },
    sitemap: "https://kabon.africa/sitemap.xml",
    host: "https://kabon.africa",
  };
}
