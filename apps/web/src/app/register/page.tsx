"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, ArrowRight, TreePine, ShoppingBag } from "lucide-react";
import { register } from "@/lib/auth";

const roles = [
  {
    value: "LANDOWNER",
    icon: TreePine,
    label: "Land Owner / Community",
    desc: "I restore land and want to earn carbon credits",
    color: "border-forest-500 bg-forest-50",
    iconColor: "text-forest-600",
    check: "bg-forest-600",
  },
  {
    value: "BUYER",
    icon: ShoppingBag,
    label: "Corporation / Buyer",
    desc: "I want to purchase verified carbon offsets",
    color: "border-savanna-500 bg-savanna-50",
    iconColor: "text-savanna-600",
    check: "bg-savanna-600",
  },
];

const africanCountries = [
  "Nigeria","Kenya","South Africa","Ghana","Ethiopia","Tanzania","Uganda","Senegal",
  "Ivory Coast","Cameroon","Angola","Mozambique","Zimbabwe","Zambia","Rwanda",
  "DRC","Mali","Burkina Faso","Niger","Chad","Sudan","Somalia","Madagascar",
  "Botswana","Namibia","Malawi","Benin","Togo","Sierra Leone","Liberia",
];

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    role: params.get("role") || "LANDOWNER",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await register(form);
      router.push(form.role === "BUYER" ? "/marketplace" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100vh] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-forest-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 70% 30%, rgb(22 101 52 / 0.4) 0%, transparent 60%)" }} />
        <Link href="/" className="relative flex items-center gap-2 font-black text-xl text-white">
          <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          CarbonAfrika
        </Link>
        <div className="relative">
          <p className="text-4xl font-black text-white leading-tight mb-6">
            Turn your land<br />into income.
          </p>
          <ul className="space-y-4">
            {[
              "Free to register — no upfront costs",
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
              CarbonAfrika
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

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {roles.map((r) => {
              const Icon = r.icon;
              const active = form.role === r.value;
              return (
                <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-150 ${active ? r.color : "border-gray-200 bg-white hover:border-gray-300"}`}>
                  {active && (
                    <span className={`absolute top-3 right-3 w-5 h-5 ${r.check} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-xs">✓</span>
                    </span>
                  )}
                  <Icon className={`w-5 h-5 mb-2 ${active ? r.iconColor : "text-gray-400"}`} />
                  <div className={`font-semibold text-sm ${active ? "text-gray-900" : "text-gray-600"}`}>{r.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-snug">{r.desc}</div>
                </button>
              );
            })}
          </div>

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
              <input type="password" className="input" value={form.password} onChange={set("password")}
                placeholder="At least 8 characters" minLength={8} required autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Country</label>
              <select className="input" value={form.country} onChange={set("country")} required>
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
