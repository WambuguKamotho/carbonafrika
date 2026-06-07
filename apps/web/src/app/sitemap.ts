import type { MetadataRoute } from "next";

// Generated at /sitemap.xml. Static list of the public marketing/content
// routes. Dynamic project/blog/marketplace detail pages can be added later by
// fetching their slugs/ids once the API is stable in production.
const SITE_URL = "https://kabon.africa";

const ROUTES = [
  "",
  "/about",
  "/marketplace",
  "/projects",
  "/map",
  "/blog",
  "/clean-energy",
  "/farming",
  "/guides",
  "/standard",
  "/careers",
  // Public conversion funnels — worth indexing
  "/request-access",
  "/partner-application",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
