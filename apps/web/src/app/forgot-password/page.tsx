"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100vh] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-xl text-forest-800 mb-6">
            <div className="w-8 h-8 bg-[#00C853] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 40 42" fill="none">
                <rect x="18" y="25" width="4" height="15" rx="2" fill="#7B4F2E"/>
                <path d="M20 27 L10 20" stroke="#7B4F2E" strokeWidth="3" strokeLinecap="round"/>
                <path d="M20 27 L30 20" stroke="#7B4F2E" strokeWidth="3" strokeLinecap="round"/>
                <ellipse cx="8" cy="13" rx="9" ry="7" fill="#166534"/>
                <ellipse cx="32" cy="13" rx="8" ry="6" fill="#166534"/>
                <ellipse cx="20" cy="9" rx="12" ry="9" fill="#15803d"/>
              </svg>
            </div>
            Kabon.Africa
          </Link>
          <h1 className="text-3xl font-black text-gray-900">Reset your password</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your email and we&apos;ll send a reset link</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-forest-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-forest-600" />
              </div>
              <h2 className="font-bold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-6">
                If <span className="font-medium text-gray-700">{email}</span> is registered, you&apos;ll receive a reset link within a few minutes.
              </p>
              <Link href="/login" className="btn-primary w-full text-center block">Back to sign in</Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input" placeholder="you@example.com" required autoComplete="email"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="inline-flex items-center gap-1 text-forest-700 font-semibold hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
