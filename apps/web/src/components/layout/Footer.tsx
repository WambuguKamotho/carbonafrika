import Link from "next/link";
import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white mb-3">
            <Leaf className="w-5 h-5 text-forest-400" />
            CarbonAfrika
          </Link>
          <p className="text-sm leading-relaxed">
            Connecting African communities restoring indigenous forests, savannas, and grasslands with
            global carbon credit buyers. Every credit = 1 tonne of verified CO₂.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Platform</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link></li>
            <li><Link href="/projects" className="hover:text-white transition-colors">Projects</Link></li>
            <li><Link href="/farming" className="hover:text-white transition-colors">Farming Guide</Link></li>
            <li><Link href="/register" className="hover:text-white transition-colors">Register Land</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">For Buyers</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/marketplace" className="hover:text-white transition-colors">Browse Credits</Link></li>
            <li><Link href="/register?role=BUYER" className="hover:text-white transition-colors">Corporate Account</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-2 text-xs">
        <span>© 2025 CarbonAfrika. All rights reserved.</span>
        <span>Built on Polygon · Powered by verified science</span>
      </div>
    </footer>
  );
}
