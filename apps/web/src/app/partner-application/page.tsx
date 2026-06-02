"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Leaf, CheckCircle, Loader2, Users, TrendingUp, Award, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

export default function PartnerApplicationPage() {
  return (
    <Suspense fallback={null}>
      <PartnerApplicationInner />
    </Suspense>
  );
}

function PartnerApplicationInner() {
  const params = useSearchParams();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    region: "",
    organization: "",
    yearsExperience: "",
    communitiesServed: "",
    message: "",
  });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [submitted, setSubmitted] = useState(false);

  const source = params.get("source") ?? params.get("utm_source") ?? "partner-application";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const years = form.yearsExperience ? parseInt(form.yearsExperience, 10) : undefined;
      await api.post<{ success: boolean }>("/api/auth/partner-application", {
        fullName:        form.fullName.trim(),
        email:           form.email.trim(),
        phone:           form.phone.trim()        || undefined,
        country:         form.country.trim(),
        region:          form.region.trim()       || undefined,
        organization:    form.organization.trim() || undefined,
        yearsExperience: Number.isFinite(years)   ? years : undefined,
        communitiesServed: form.communitiesServed.trim() || undefined,
        message:         form.message.trim()      || undefined,
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
          <h1 className="text-2xl font-black text-gray-900 mb-2">Application received</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Thanks {form.fullName.split(" ")[0] || "for applying"}. Our team will review and respond within 1–2 business days.
            We'll send the next steps to <strong className="text-gray-700">{form.email}</strong>.
          </p>
          <Link href="/" className="btn-secondary w-full flex items-center justify-center gap-2">
            Back to homepage <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-lg text-gray-900">
            <div className="w-8 h-8 bg-forest-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            Kabon.Africa
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
            Already a partner? Sign in →
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-5 gap-10">

        <div className="lg:col-span-2">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">
            Become a Kabon Community Partner
          </h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            NGOs, cooperative leads, extension officers and trusted local organizers register
            African landowner projects on Kabon and earn a lifetime share of every credit sold.
          </p>

          <ul className="space-y-4 text-sm text-gray-700 mb-8">
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-forest-700" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Onboarding payout</div>
                <div className="text-gray-500 text-xs">USDC paid once a project you register is admin-approved.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0">
                <Award className="w-3.5 h-3.5 text-forest-700" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Verification milestone</div>
                <div className="text-gray-500 text-xs">A larger payout when the carbon assessment is approved.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-forest-700" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Lifetime royalty</div>
                <div className="text-gray-500 text-xs">A share of every credit sale from the projects you registered.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-3.5 h-3.5 text-forest-700" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Partner dashboard</div>
                <div className="text-gray-500 text-xs">Track projects, milestones and earnings in one place.</div>
              </div>
            </li>
          </ul>

          <div className="bg-forest-50 border border-forest-100 rounded-2xl p-4 text-xs text-forest-900 leading-relaxed">
            We KYC every applicant. Strong fits: community-based NGOs, cooperative officers, extension
            services, and local sustainability consultants with verifiable on-ground experience.
          </div>
        </div>

        <form
          onSubmit={submit}
          className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-card p-6 md:p-8 space-y-5"
        >
          <div>
            <label className="label">Full name *</label>
            <input
              required
              className="input"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="Jane Doe"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input
                required
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@ngo.org"
              />
            </div>
            <div>
              <label className="label">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                className="input"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+254 712 345 678"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Country *</label>
              <input
                required
                className="input"
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                placeholder="Kenya"
              />
            </div>
            <div>
              <label className="label">Region / County <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                className="input"
                value={form.region}
                onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                placeholder="Bungoma"
              />
            </div>
          </div>

          <div>
            <label className="label">Organization <span className="text-gray-400 font-normal">(if any)</span></label>
            <input
              className="input"
              value={form.organization}
              onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
              placeholder="GreenFields Coop · Trees for Mt Elgon · etc."
            />
          </div>

          <div>
            <label className="label">Years of community-organizing experience</label>
            <input
              type="number"
              min="0"
              max="60"
              className="input"
              value={form.yearsExperience}
              onChange={e => setForm(f => ({ ...f, yearsExperience: e.target.value }))}
              placeholder="e.g. 5"
            />
          </div>

          <div>
            <label className="label">Communities you work with</label>
            <textarea
              rows={3}
              className="input resize-none"
              value={form.communitiesServed}
              onChange={e => setForm(f => ({ ...f, communitiesServed: e.target.value }))}
              placeholder="Locations, ethnic groups, cooperative names, project history…"
            />
          </div>

          <div>
            <label className="label">Anything else? <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={3}
              className="input resize-none"
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="LinkedIn, references, current projects, languages spoken…"
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
            {loading ? "Submitting…" : "Apply to become a Partner"}
          </button>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            By applying you agree to a KYC review. We'll never share your details outside Kabon.Africa.
          </p>
        </form>
      </div>
    </div>
  );
}
