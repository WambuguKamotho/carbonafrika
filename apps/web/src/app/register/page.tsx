"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf } from "lucide-react";
import { register } from "@/lib/auth";

const roles = [
  { value: "LANDOWNER", label: "Land Owner / Community", desc: "I want to restore land and earn credits" },
  { value: "BUYER", label: "Corporation / Buyer", desc: "I want to purchase carbon credits" },
];

const africanCountries = [
  "Nigeria", "Kenya", "South Africa", "Ghana", "Ethiopia", "Tanzania", "Uganda", "Senegal",
  "Ivory Coast", "Cameroon", "Angola", "Mozambique", "Zimbabwe", "Zambia", "Rwanda",
  "DRC", "Mali", "Burkina Faso", "Niger", "Chad", "Sudan", "Somalia", "Madagascar",
];

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: params.get("role") || "LANDOWNER",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      router.push(form.role === "BUYER" ? "/marketplace" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-forest-700 font-bold text-xl mb-4">
            <Leaf className="w-6 h-6" />
            CarbonAfrika
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.role === r.value
                    ? "border-forest-500 bg-forest-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold text-sm text-gray-900">{r.label}</div>
                <div className="text-xs text-gray-500 mt-1">{r.desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name / Community Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mama Wanjiru / Kajiado Community" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="At least 8 characters" minLength={8} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select className="input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                <option value="">Select your country</option>
                {africanCountries.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-forest-700 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
