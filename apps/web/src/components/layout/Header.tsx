"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Leaf, LayoutDashboard, LogOut } from "lucide-react";
import { clearToken, getUser } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const user = typeof window !== "undefined" ? getUser() : null;
  const isHome = pathname === "/";

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

  const navLinks = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/farming", label: "Farming Guide" },
  ];

  const headerBg = isHome
    ? scrolled ? "bg-forest-950/95 backdrop-blur-md shadow-lg shadow-black/20" : "bg-transparent"
    : "bg-white border-b border-gray-100 shadow-sm";

  const logoColor = isHome ? "text-white" : "text-forest-900";
  const navColor  = isHome ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-forest-700";

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className={`flex items-center gap-2 font-black text-xl ${logoColor} transition-colors`}>
          <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          CarbonAfrika
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
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
              <Link href="/dashboard" className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${navColor}`}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
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
        <button className={`md:hidden p-2 rounded-lg ${isHome ? "text-white" : "text-gray-700"}`} onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg px-4 py-4 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className="flex items-center px-3 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
            {user ? (
              <>
                <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-50" onClick={() => setOpen(false)}>
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-red-600 font-medium hover:bg-red-50">
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
