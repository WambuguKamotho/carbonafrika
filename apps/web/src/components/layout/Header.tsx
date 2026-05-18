"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Leaf } from "lucide-react";
import { clearToken, getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Header() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const user = typeof window !== "undefined" ? getUser() : null;

  const logout = () => {
    clearToken();
    router.push("/");
  };

  const navLinks = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/projects", label: "Projects" },
    { href: "/farming", label: "Farming Guide" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-forest-800">
          <Leaf className="w-6 h-6 text-forest-600" />
          CarbonAfrika
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-gray-600 hover:text-forest-700 font-medium transition-colors text-sm">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="btn-secondary text-sm py-2 px-4">Dashboard</Link>
              <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 transition-colors">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm py-2 px-4">Sign in</Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="block text-gray-700 font-medium py-1" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/dashboard" className="btn-secondary text-sm text-center" onClick={() => setOpen(false)}>Dashboard</Link>
                <button onClick={logout} className="text-sm text-red-600 text-left">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm text-center" onClick={() => setOpen(false)}>Sign in</Link>
                <Link href="/register" className="btn-primary text-sm text-center" onClick={() => setOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
