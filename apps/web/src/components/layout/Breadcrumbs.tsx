"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useBreadcrumbContext } from "./BreadcrumbContext";

const HIDDEN_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/redeem-invite",
  "/request-access",
]);

const LABELS: Record<string, string> = {
  about: "About",
  admin: "Admin",
  audit: "Audit Log",
  blog: "Blog",
  buffer: "Buffer Pool",
  careers: "Careers",
  "clean-energy": "Clean Energy",
  contact: "Contact",
  dashboard: "Dashboard",
  farming: "Farming",
  guides: "Guides",
  inquiries: "Buyer Inquiries",
  map: "Map",
  marketplace: "Marketplace",
  new: "New Project",
  partner: "Partner",
  "partner-application": "Partner Application",
  "partner-applications": "Partners",
  portfolio: "Portfolio",
  projects: "Projects",
  resale: "Resales",
  settings: "Settings",
  standard: "Kabon Carbon Standard",
  users: "Users",
  verifications: "Verifications",
  verifier: "Verifier Portal",
};

// Prisma cuids (e.g. "cm3x9k2z10000abc123") aren't meaningful to show raw —
// fall back to an ellipsis until the page supplies a real title via
// useBreadcrumbLabel.
function isLikelyId(segment: string) {
  return /^[a-z0-9]{20,}$/i.test(segment);
}

function humanize(segment: string) {
  if (LABELS[segment]) return LABELS[segment];
  if (isLikelyId(segment)) return "…";
  return segment
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const ctx = useBreadcrumbContext();

  if (HIDDEN_PATHS.has(pathname)) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const isAdmin = segments[0] === "admin";

  const crumbs: { label: string; href: string }[] = [
    isAdmin ? { label: "Admin", href: "/admin" } : { label: "Home", href: "/" },
  ];

  let href = "";
  segments.forEach((segment, i) => {
    href += `/${segment}`;
    if (isAdmin && i === 0) return; // root admin crumb already added above
    const isLast = i === segments.length - 1;
    const label = isLast && ctx?.label ? ctx.label : humanize(segment);
    crumbs.push({ label, href });
  });

  if (crumbs.length < 2) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `https://kabon.africa${c.href}`,
    })),
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={`border-b ${isAdmin ? "bg-gray-950 border-white/10" : "bg-gray-50 border-gray-100"}`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ol className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-1.5 text-sm overflow-x-auto whitespace-nowrap">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isAdmin ? "text-gray-600" : "text-gray-300"}`} />
              )}
              {isLast ? (
                <span className={`font-medium ${isAdmin ? "text-white" : "text-gray-900"}`} aria-current="page">
                  {i === 0 && <Home className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className={`transition-colors ${
                    isAdmin ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-forest-700"
                  }`}
                >
                  {i === 0 && <Home className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />}
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
