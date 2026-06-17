"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, ShieldCheck, Globe, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import CorporateEmissionsCalculator from "@/components/ui/CorporateEmissionsCalculator";

const USE_CASES = [
  "Annual ESG / sustainability report",
  "Product carbon-neutral claim",
  "Corporate net-zero commitment",
  "Event offset",
  "Investment / brokerage",
  "Other",
];

export default function RequestAccessPage() {
  return (
    <Suspense fallback={null}>
      <RequestAccessInner />
    </Suspense>
  );
}

function RequestAccessInner() {
  const params = useSearchParams();
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email:       "",
    phone:       "",
    country:     "",
    estimatedAnnualTons: "",
    useCase:     "",
    message:     "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [submitted, setSubmitted] = useState(false);

  const source = params.get("source") ?? params.get("utm_source") ?? "request-access";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tons = form.estimatedAnnualTons ? parseFloat(form.estimatedAnnualTons) : undefined;
      await api.post<{ success: boolean }>("/api/auth/inquiry", {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email:       form.email.trim(),
        phone:       form.phone.trim()   || undefined,
        country:     form.country.trim() || undefined,
        estimatedAnnualTons: Number.isFinite(tons) ? tons : undefined,
        useCase:     form.useCase || undefined,
        message:     form.message.trim() || undefined,
        source,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-forest-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Request received</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Thanks {form.contactName.split(" ")[0] || "for reaching out"}. Our team will review and respond
            within 1–2 business days. We'll send the next steps to <strong className="text-gray-700">{form.email}</strong>.
          </p>
          <Link href="/marketplace" className="btn-secondary w-full flex items-center justify-center gap-2">
            Browse the marketplace <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-lg text-gray-900">
            <Image src="/logo.png" alt="kabon.africa" width={32} height={32} className="rounded-lg" />
            Kabon.Africa
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
            Already a buyer? Sign in →
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-5 gap-10">

        {/* Left: pitch */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">
            Request buyer access
          </h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            Carbon buying is by application. We KYC every buyer to keep the marketplace clean and
            give your sustainability claims the audit trail they need.
          </p>

          <ul className="space-y-4 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-forest-700" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Verified African projects only</div>
                <div className="text-gray-500 text-xs">Independent verification + on-chain provenance.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0">
                <Globe className="w-3.5 h-3.5 text-forest-700" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Direct from landowner</div>
                <div className="text-gray-500 text-xs">No reseller markup, so proceeds reach communities.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-forest-700" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Retirement certificates</div>
                <div className="text-gray-500 text-xs">Printable, on-chain, audit-friendly.</div>
              </div>
            </li>
          </ul>
        </div>

        {/* Right: form */}
        <form
          onSubmit={submit}
          className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-card p-6 md:p-8 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Company name *</label>
              <input
                required
                className="input"
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="label">Your name *</label>
              <input
                required
                className="input"
                value={form.contactName}
                onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>
          </div>

          <div>
            <label className="label">Corporate email *</label>
            <input
              required
              type="email"
              className="input"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="jane@acme.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              Please use your work address, since invites go here. Generic addresses (gmail / yahoo) will slow your review.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                className="input"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+254 712 345 678"
              />
            </div>
            <div>
              <label className="label">Country <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                className="input"
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                placeholder="United Kingdom"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <CorporateEmissionsCalculator
              onTonnageChange={t => setForm(f => ({ ...f, estimatedAnnualTons: String(t) }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Estimated annual offsets <span className="text-gray-400 font-normal">(tonnes)</span></label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                value={form.estimatedAnnualTons}
                onChange={e => setForm(f => ({ ...f, estimatedAnnualTons: e.target.value }))}
                placeholder="e.g. 5000 — or use the calculator above"
              />
            </div>
            <div>
              <label className="label">Primary use case</label>
              <select
                className="input"
                value={form.useCase}
                onChange={e => setForm(f => ({ ...f, useCase: e.target.value }))}
              >
                <option value="">Choose one…</option>
                {USE_CASES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Anything else? <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={3}
              className="input resize-none"
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Project preferences, timeline, links to your sustainability report, etc."
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? "Submitting…" : "Submit request"}
          </button>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            By submitting you agree to be contacted about Kabon.Africa carbon credit purchasing.
          </p>
        </form>
      </div>
    </div>
  );
}
