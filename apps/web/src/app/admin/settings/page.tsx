"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, isAdminLike, isReadOnly } from "@/lib/auth";
import { Settings, DollarSign, Shield, Cpu, RefreshCw, CheckCircle } from "lucide-react";
import ReadOnlyBanner from "@/components/admin/ReadOnlyBanner";

interface Stats {
  totalUsers: number; totalProjects: number; totalPurchases: number;
  totalRevenue: number; totalCreditsIssued: number;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdminLike(u.role)) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;
  const readOnly = isReadOnly(user.role);

  const configItems = [
    { label: "Platform Fee",        value: "2% per transaction",    note: "Deducted from buyer total; remitted to project owner net of fee" },
    { label: "Fee Direction",       value: "Buyer pays (on top)",   note: "buyerTotal = tons × pricePerTon × 1.02" },
    { label: "Settlement",         value: "Async via BullMQ",      note: "Jobs queued in Redis; worker retries up to 3× with exponential backoff" },
    { label: "Simulation mode",     value: "Active (no real USDC)", note: "BLOCKCHAIN_ENABLED=false — settlement writes 0xsim_ hashes; no funds move" },
    { label: "Redis poll interval", value: "30 s drain delay",      note: "drainDelay=30000 on all workers — ~72K Redis commands/day" },
    { label: "Idle timeout",        value: "10 minutes",            note: "Session cleared after 10 min of inactivity; browser-close clears cookie" },
    { label: "Buffer rate",         value: "15% permanence reserve", note: "Minting worker retains 15% of verified tonnes in buffer pool" },
    { label: "Retirement window",   value: "No expiry",             note: "Credits never expire; retiredAt cannot be before project creation or >1 year future" },
  ];

  const serviceLinks = [
    { label: "Auth Service",         url: "http://localhost:3001/health" },
    { label: "Project Service",      url: "http://localhost:3002/health" },
    { label: "Marketplace Service",  url: "http://localhost:3003/health" },
    { label: "Verification Service", url: "http://localhost:3004/health" },
    { label: "IoT Service",          url: "http://localhost:3005/health" },
    { label: "Notification Service", url: "http://localhost:3006/health" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {readOnly && <ReadOnlyBanner />}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-forest-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <div>
              <h1 className="text-xl font-black text-gray-900">Settings</h1>
              <p className="text-sm text-gray-500 mt-0.5">Platform configuration</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Platform stats summary */}
        {!loading && stats && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" /> Platform Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              {[
                { label: "Users",     value: stats.totalUsers.toLocaleString() },
                { label: "Projects",  value: stats.totalProjects.toLocaleString() },
                { label: "Credits",   value: `${stats.totalCreditsIssued.toLocaleString(undefined, { maximumFractionDigits: 1 })} t` },
                { label: "Purchases", value: stats.totalPurchases.toLocaleString() },
                { label: "Revenue",   value: `$${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-black text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform config */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-savanna-500" />
            <h2 className="font-bold text-gray-900">Platform Configuration</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {configItems.map(({ label, value, note }) => (
              <div key={label} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{label}</div>
                  {note && <div className="text-xs text-gray-400 mt-0.5">{note}</div>}
                </div>
                <span className="text-sm font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-700">
              Configuration changes require environment variable updates and a service restart. Editable settings UI is planned for a future sprint.
            </p>
          </div>
        </div>

        {/* Service health */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <h2 className="font-bold text-gray-900">Service Health</h2>
            </div>
            <span className="text-xs text-gray-400">Development endpoints</span>
          </div>
          <div className="divide-y divide-gray-50">
            {serviceLinks.map(({ label, url }) => (
              <div key={label} className="px-5 py-3 flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-mono text-forest-600 hover:underline flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> {url}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100">
            <h2 className="font-bold text-red-700">Maintenance</h2>
            <p className="text-xs text-red-500 mt-0.5">Destructive or irreversible actions</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">Clear simulation transactions</div>
                <div className="text-xs text-gray-400">Remove 0xsim_ tx hashes from the database — does not affect real settlements</div>
              </div>
              <button
                onClick={() => setToast("Not implemented yet — connect to admin API first")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                Run
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">Re-process failed settlements</div>
                <div className="text-xs text-gray-400">Re-queue purchases where settlement has not completed</div>
              </div>
              <button
                onClick={() => setToast("Not implemented yet — connect to admin API first")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                Run
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
