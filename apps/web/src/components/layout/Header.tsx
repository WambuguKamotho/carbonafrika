"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu, X, Leaf, LogOut, ShieldCheck, Settings, ClipboardCheck,
  BarChart2, LayoutDashboard, Users, TreePine, BadgeCheck, Store, Mail, FileText, Repeat, Shield, ScrollText,
  ChevronDown,
} from "lucide-react";
import { clearToken, getUser } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";

const publicNavLinks = [
  { href: "/map",         label: "Map" },
  { href: "/projects",    label: "Projects" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/guides",      label: "Guides" },
  { href: "/about",       label: "About" },
];

const adminNavLinks = [
  { href: "/admin",                      label: "Overview",      icon: LayoutDashboard },
  { href: "/admin/projects",             label: "Projects",      icon: TreePine },
  { href: "/admin/verifications",        label: "Verifications", icon: BadgeCheck },
  { href: "/admin/inquiries",            label: "Buyer Inquiries", icon: Mail },
  { href: "/admin/partner-applications", label: "Partners",      icon: Users },
  { href: "/admin/users",                label: "Users",         icon: Users },
  { href: "/admin/marketplace",          label: "Marketplace",   icon: Store },
  { href: "/admin/resale",               label: "Resales",       icon: Repeat },
  { href: "/admin/buffer",               label: "Buffer Pool",   icon: Shield },
  { href: "/admin/audit",                label: "Audit Log",     icon: ScrollText },
  { href: "/admin/blog",                 label: "Blog",          icon: FileText },
  { href: "/admin/settings",             label: "Settings",      icon: Settings },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  // VIEWER uses the same admin UI in read-only mode, so it shares the admin nav.
  const isAdmin = user?.role === "ADMIN" || user?.role === "VIEWER";
  // The admin section the user is currently in — shown on the dropdown trigger.
  const activeAdmin = adminNavLinks.find(
    (l) => pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href)),
  );

  useEffect(() => { setUser(getUser()); setAdminMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const logout = () => {
    clearToken();
    setOpen(false);
    router.push("/");
  };

  const headerBg = isAdmin
    ? "bg-gray-950 border-b border-white/10"
    : isHome
      ? scrolled ? "bg-forest-950/95 backdrop-blur-md shadow-lg shadow-black/20" : "bg-transparent"
      : "bg-white border-b border-gray-100 shadow-sm";

  const logoColor = isAdmin || isHome ? "text-white" : "text-forest-900";
  const navColor  = isHome ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-forest-700";

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href={isAdmin ? "/admin" : "/"} className={`flex items-center gap-2 font-black text-xl ${logoColor} transition-colors`}>
          <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          {isAdmin ? <span>Kabon<span className="text-purple-400">.Admin</span></span> : "Kabon.Africa"}
        </Link>

        {/* Desktop nav — admin navigation lives in the right-hand dropdown to keep
            the bar uncluttered; only public links render inline here. */}
        <nav className="hidden md:flex items-center gap-0.5">
          {!isAdmin &&
            // Landowners + community partners don't need the marketplace
            // browse link — they're sellers / mobilisers, not buyers.
            publicNavLinks
              .filter(l => !(l.href === "/marketplace" && (user?.role === "LANDOWNER" || user?.role === "COMMUNITY_PARTNER")))
              .map((l) => (
                <Link key={l.href} href={l.href}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${navColor}`}>
                  {l.label}
                </Link>
              ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => setAdminMenuOpen(o => !o)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      adminMenuOpen ? "bg-white/15 text-white" : "bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white"
                    }`}>
                    {activeAdmin ? <activeAdmin.icon className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    <span>{activeAdmin?.label ?? "Menu"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${adminMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {adminMenuOpen && (
                    <>
                      {/* click-away backdrop */}
                      <div className="fixed inset-0 z-40" onClick={() => setAdminMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-60 bg-gray-900 border border-white/10 rounded-xl shadow-2xl shadow-black/40 py-1.5 z-50 max-h-[80vh] overflow-y-auto">
                        {adminNavLinks.map((l) => {
                          const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
                          return (
                            <Link key={l.href} href={l.href} onClick={() => setAdminMenuOpen(false)}
                              className={`flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                                active ? "bg-white/10 text-white font-semibold" : "text-gray-300 hover:bg-white/5 hover:text-white"
                              }`}>
                              <l.icon className="w-4 h-4 flex-shrink-0" />
                              {l.label}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              {isAdmin && (
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  user.role === "VIEWER"
                    ? "bg-gray-500/15 text-gray-300 border-gray-500/20"
                    : "bg-purple-500/15 text-purple-300 border-purple-500/20"
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" /> {user.role === "VIEWER" ? "Viewer" : "Admin"}
                </span>
              )}
              {user.role === "VERIFIER" && (
                <Link href="/verifier" className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isHome ? "text-blue-300 hover:text-white" : "text-blue-700 hover:bg-blue-50"}`}>
                  <ClipboardCheck className="w-4 h-4" /> Verifier Portal
                </Link>
              )}
              {user.role === "BUYER" && (
                <Link href="/portfolio" className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${navColor}`}>
                  <BarChart2 className="w-4 h-4" /> Portfolio
                </Link>
              )}
              {user.role === "LANDOWNER" && (
                <Link href="/dashboard" className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${navColor}`}>
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
              )}
              {user.role === "COMMUNITY_PARTNER" && (
                <Link href="/partner" className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${navColor}`}>
                  <Users className="w-4 h-4" /> Partner
                </Link>
              )}
              <button onClick={logout} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${isAdmin ? "text-red-400 hover:bg-red-500/10" : "text-red-400 hover:bg-red-50"}`}>
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login"
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isHome ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100"}`}>
                Sign in
              </Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-4">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className={`md:hidden p-2 rounded-lg ${isAdmin || isHome ? "text-white" : "text-gray-700"}`}
          onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className={`md:hidden border-t px-4 py-4 space-y-1 ${isAdmin ? "bg-gray-900 border-white/10" : "bg-white border-gray-100 shadow-lg"}`}>
          {isAdmin ? (
            adminNavLinks.map((l) => (
              <Link key={l.href} href={l.href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-300 font-medium hover:bg-white/5 hover:text-white"
                onClick={() => setOpen(false)}>
                <l.icon className="w-4 h-4" /> {l.label}
              </Link>
            ))
          ) : (
            publicNavLinks
              .filter(l => !(l.href === "/marketplace" && (user?.role === "LANDOWNER" || user?.role === "COMMUNITY_PARTNER")))
              .map((l) => (
              <Link key={l.href} href={l.href}
                className="flex items-center px-3 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))
          )}
          <div className="pt-3 mt-2 border-t border-white/10 space-y-2">
            {user ? (
              <>
                {user.role === "VERIFIER" && (
                  <Link href="/verifier" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-blue-400 font-medium hover:bg-blue-500/10" onClick={() => setOpen(false)}>
                    <ClipboardCheck className="w-4 h-4" /> Verifier Portal
                  </Link>
                )}
                {user.role === "BUYER" && (
                  <Link href="/portfolio" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-50" onClick={() => setOpen(false)}>
                    <BarChart2 className="w-4 h-4" /> Portfolio
                  </Link>
                )}
                {user.role === "LANDOWNER" && (
                  <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-50" onClick={() => setOpen(false)}>
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                )}
                <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-red-500 font-medium hover:bg-red-500/10">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-center btn-secondary w-full text-sm" onClick={() => setOpen(false)}>Sign in</Link>
                <Link href="/register" className="block text-center btn-primary w-full text-sm" onClick={() => setOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
