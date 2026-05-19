import Link from "next/link";
import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 font-black text-lg text-white mb-4">
              <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              CarbonAfrika
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-gray-400">
              Connecting African communities restoring indigenous forests, savannas, and grasslands
              with global carbon credit buyers. Every credit = 1 tonne of verified CO₂.
            </p>
            <div className="flex gap-3 mt-6">
              {["Polygon", "Verra", "IPFS"].map(t => (
                <span key={t} className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-gray-400">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link href="/projects/new" className="hover:text-white transition-colors">Register Land</Link></li>
              <li><Link href="/farming" className="hover:text-white transition-colors">Farming Guide</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">For Buyers</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/marketplace" className="hover:text-white transition-colors">Browse Credits</Link></li>
              <li><Link href="/register?role=BUYER" className="hover:text-white transition-colors">Corporate Account</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <span>© 2025 CarbonAfrika. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Built on <span className="text-forest-400 font-medium">Polygon</span> · Powered by verified science
          </span>
        </div>
      </div>
    </footer>
  );
}
