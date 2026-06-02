import type { MetadataRoute } from "next";

// Generated at /robots.txt. Allow public pages; keep app/admin/auth surfaces
// out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/settings", "/verifier", "/dashboard", "/redeem-invite", "/reset-password"],
    },
    sitemap: "https://kabon.africa/sitemap.xml",
    host: "https://kabon.africa",
  };
}
