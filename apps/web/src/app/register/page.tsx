"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, TreePine, ShoppingBag, Eye, EyeOff } from "lucide-react";
import { register } from "@/lib/auth";

// Note: BUYER is intentionally NOT a self-register option — corporate buyers
// come through /request-access (sales-led KYC). Only LANDOWNER (and VERIFIER
// via ?role=VERIFIER) can self-register. The single visible role is rendered
// as a static banner below, not a selector.

const africanCountries = [
  "Nigeria","Kenya","South Africa","Ghana","Ethiopia","Tanzania","Uganda","Senegal",
  "Ivory Coast","Cameroon","Angola","Mozambique","Zimbabwe","Zambia","Rwanda",
  "DRC","Mali","Burkina Faso","Niger","Chad","Sudan","Somalia","Madagascar",
  "Botswana","Namibia","Malawi","Benin","Togo","Sierra Leone","Liberia",
];

export default function RegisterPage() {
  const router = useRouter();
  // Self-registration is LANDOWNER-only by design. BUYER and COMMUNITY_PARTNER
  // come through their application flows; VERIFIER, ADMIN, VIEWER are admin-promoted.
  // Server enforces this too — see auth.ts register schema.
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    role: "LANDOWNER",
    country: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100vh] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-forest-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&auto=format&fit=crop"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient + brand tint so the white copy stays readable on top of the photo */}
        <div className="absolute inset-0 bg-gradient-to-br from-forest-950/85 via-forest-900/70 to-forest-950/90" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 70% 30%, rgb(22 101 52 / 0.45) 0%, transparent 60%)" }} />
        <Link href="/" className="relative flex items-center gap-2 font-black text-xl text-white">
          <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          Kabon.Africa
        </Link>
        <div className="relative">
          <p className="text-4xl font-black text-white leading-tight mb-6">
            Turn your land<br />into income.
          </p>
          <ul className="space-y-4">
            {[
              "Free to register, no upfront costs",
              "Verification takes 2–4 weeks",
              "Credits minted directly to your wallet",
              "Buyers pay in USDC or MATIC",
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-forest-200 text-sm">
                <span className="w-5 h-5 rounded-full bg-forest-600 flex items-center justify-center flex-shrink-0 text-xs">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-forest-400 text-xs">
          By registering you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-black text-xl text-forest-800">
              <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              Kabon.Africa
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900">Create your account</h1>
            <p className="text-gray-500 mt-1">Join thousands of African land stewards</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6 flex items-start gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Role banner — only landowners self-register. Buyers go through /request-access. */}
          <div className="bg-forest-50 border-2 border-forest-500 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <TreePine className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-gray-900">Project Owner account</div>
                <div className="text-xs text-gray-600 mt-0.5 leading-snug">Restore land and earn carbon credits.</div>
              </div>
            </div>
          </div>

          {/* Buyer redirect — buyers don't self-serve, they apply via sales */}
          <Link
            href="/request-access"
            className="flex items-center justify-between bg-white border border-gray-200 hover:border-savanna-300 hover:bg-savanna-50 rounded-2xl p-4 mb-6 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <ShoppingBag className="w-5 h-5 text-savanna-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm text-gray-900">Looking to buy carbon credits?</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                  Corporate buyers are onboarded by our team. Request access →
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-savanna-600 transition-colors flex-shrink-0" />
          </Link>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <div>
              <label className="label">Full Name / Community Name</label>
              <input className="input" value={form.name} onChange={set("name")}
                placeholder="e.g. Mama Wanjiru or Kajiado Community" required minLength={2} />
            </div>
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" value={form.email} onChange={set("email")}
                placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} className="input pr-10" value={form.password} onChange={set("password")}
                  placeholder="At least 8 characters" minLength={8} required autoComplete="new-password" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Country <span className="text-gray-400 font-normal">(optional)</span></label>
              <select className="input" value={form.country} onChange={set("country")}>
                <option value="">Select your country</option>
                {africanCountries.sort().map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="Other">Other African country</option>
              </select>
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-forest-700 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
