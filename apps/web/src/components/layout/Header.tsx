"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Menu, X, Leaf, LogOut, ShieldCheck, Settings, ClipboardCheck,
  BarChart2, LayoutDashboard, Users, TreePine, BadgeCheck, Store, Mail, FileText, Repeat, Shield, ScrollText,
  ChevronDown, Bell,
} from "lucide-react";
import { clearToken, getUser } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

const publicNavLinks = [
  { href: "/map",                  label: "Map" },
  { href: "/projects",             label: "Projects" },
  { href: "/marketplace",          label: "Marketplace" },
  { href: "/blog",                 label: "Blog" },
  { href: "/guides",               label: "Guides" },
  { href: "/partner-application",  label: "Partner" },
  { href: "/about",                label: "About" },
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

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onClose,
  isAdmin,
}: {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const router = useRouter();

  function handleClick(n: AppNotification) {
    if (!n.read) onMarkRead(n.id);
    onClose();
    if (n.link) router.push(n.link);
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl shadow-black/30 z-50 overflow-hidden border ${
        isAdmin ? "bg-gray-900 border-white/10" : "bg-white border-gray-100"
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isAdmin ? "border-white/10" : "border-gray-100"}`}>
          <span className={`font-semibold text-sm ${isAdmin ? "text-white" : "text-gray-900"}`}>
            Notifications {unreadCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">{unreadCount}</span>}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className={`text-xs font-medium transition-colors ${isAdmin ? "text-gray-400 hover:text-white" : "text-forest-600 hover:text-forest-800"}`}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className={`px-4 py-8 text-center text-sm ${isAdmin ? "text-gray-500" : "text-gray-400"}`}>
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b transition-colors ${
                  isAdmin
                    ? `border-white/5 ${n.read ? "hover:bg-white/5" : "bg-white/8 hover:bg-white/10"}`
                    : `border-gray-50 ${n.read ? "hover:bg-gray-50" : "bg-green-50/60 hover:bg-green-50"}`
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {!n.read && (
                    <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                  )}
                  <div className={!n.read ? "" : "pl-4"}>
                    <p className={`text-sm font-semibold leading-snug ${isAdmin ? "text-white" : "text-gray-900"}`}>
                      {n.title}
                    </p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${isAdmin ? "text-gray-400" : "text-gray-500"}`}>
                      {n.body}
                    </p>
                    <p className={`text-xs mt-1 ${isAdmin ? "text-gray-600" : "text-gray-400"}`}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAdmin = user?.role === "ADMIN" || user?.role === "VIEWER";
  const activeAdmin = adminNavLinks.find(
    (l) => pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href)),
  );

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(!!user);

  useEffect(() => { setUser(getUser()); setAdminMenuOpen(false); setBellOpen(false); }, [pathname]);

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

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {!isAdmin &&
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

              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={() => setBellOpen((o) => !o)}
                  className={`relative p-2 rounded-lg transition-colors ${
                    isAdmin || isHome
                      ? "text-gray-300 hover:bg-white/10 hover:text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <NotificationDropdown
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onMarkRead={markRead}
                    onMarkAllRead={markAllRead}
                    onClose={() => setBellOpen(false)}
                    isAdmin={isAdmin}
                  />
                )}
              </div>

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
        <div className="md:hidden flex items-center gap-1">
          {user && (
            <div className="relative">
              <button
                onClick={() => setBellOpen((o) => !o)}
                className={`relative p-2 rounded-lg transition-colors ${isAdmin || isHome ? "text-white" : "text-gray-700"}`}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <NotificationDropdown
                  notifications={notifications}
                  unreadCount={unreadCount}
                  onMarkRead={markRead}
                  onMarkAllRead={markAllRead}
                  onClose={() => setBellOpen(false)}
                  isAdmin={isAdmin}
                />
              )}
            </div>
          )}
          <button
            className={`p-2 rounded-lg ${isAdmin || isHome ? "text-white" : "text-gray-700"}`}
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className={`md:hidden border-t px-4 py-4 space-y-1 ${isAdmin ? "bg-gray-900 border-white/10" : "bg-white border-gray-100 shadow-lg"}`}>
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
