"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Leaf, ArrowRight, CheckCircle, Loader2, Globe } from "lucide-react";
import { api } from "@/lib/api";

function NewsletterForm() {
  const [email, setEmail]       = useState("");
  const [state, setState]       = useState<"idle" | "saving" | "done" | "err">("idle");
  const [err, setErr]           = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("saving");
    setErr(null);
    try {
      await api.post<{ success: boolean }>("/api/auth/newsletter", {
        email: email.trim(),
        source: "footer",
      });
      setState("done");
      setEmail("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Subscription failed");
      setState("err");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-forest-300">
        <CheckCircle className="w-4 h-4" /> You're subscribed.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-stretch gap-0 max-w-sm">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 rounded-l-xl px-3.5 py-2.5 focus:outline-none focus:border-forest-500 focus:bg-white/10"
      />
      <button
        type="submit"
        disabled={state === "saving"}
        className="bg-forest-600 hover:bg-forest-500 disabled:opacity-50 text-white px-4 rounded-r-xl flex items-center"
        aria-label="Subscribe"
      >
        {state === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
      </button>
      {err && (
        <span className="ml-3 text-xs text-red-400 self-center">{err}</span>
      )}
    </form>
  );
}

function LanguageSwitcher() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Poll until the Google Translate widget has rendered
    const id = setInterval(() => {
      if (document.querySelector(".goog-te-combo")) {
        setReady(true);
        clearInterval(id);
      }
    }, 300);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
      {/* Google Translate mounts its <select> inside this div */}
      <div id="google_translate_element" className={ready ? "" : "opacity-0 pointer-events-none"} />
      {!ready && <span className="text-xs text-gray-600">Loading languages…</span>}
    </div>
  );
}

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
              Kabon.Africa
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-gray-400 mb-6">
              Connecting African communities restoring indigenous forests, savannas, and grasslands
              with global carbon credit buyers. Every credit = 1 tonne of verified CO₂.
            </p>

            {/* Newsletter signup */}
            <h4 className="text-white font-bold mb-2 text-sm">Stay in the loop</h4>
            <p className="text-xs text-gray-500 mb-3 max-w-sm">
              Monthly digest of new projects, retirement stats and African carbon market news.
            </p>
            <NewsletterForm />

            <div className="flex gap-3 mt-6">
              {["Polygon", "IPFS", "Pinata"].map(t => (
                <span key={t} className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-gray-400">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link href="/projects/new" className="hover:text-white transition-colors">Register a Project</Link></li>
              <li><Link href="/standard" className="hover:text-white transition-colors">Carbon Standard</Link></li>
              <li><Link href="/guides" className="hover:text-white transition-colors">Project Guides</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">For Buyers</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/marketplace" className="hover:text-white transition-colors">Browse Credits</Link></li>
              <li><Link href="/request-access" className="hover:text-white transition-colors">Request Access</Link></li>
            </ul>
            <h4 className="text-white font-bold mb-4 text-sm mt-6">Community</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/partner-application" className="hover:text-white transition-colors">Become a Partner</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <span>© 2025 Kabon.Africa. All rights reserved.</span>
          <LanguageSwitcher />
          <span className="flex items-center gap-1">
            Built on <span className="text-forest-400 font-medium">Polygon</span> · Powered by verified science
          </span>
        </div>
      </div>
    </footer>
  );
}
