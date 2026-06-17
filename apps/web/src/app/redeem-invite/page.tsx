"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";

interface InviteMeta {
  name: string;
  email: string;
  expired: boolean;
}

export default function RedeemInvitePage() {
  return (
    <Suspense fallback={null}>
      <RedeemInviteInner />
    </Suspense>
  );
}

function RedeemInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get("token") ?? "";

  const [meta, setMeta]       = useState<InviteMeta | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadErr("Missing invite token");
      setLoading(false);
      return;
    }
    api.get<{ data: InviteMeta }>(`/api/auth/redeem-invite/${encodeURIComponent(token)}`)
      .then((res) => setMeta(res.data))
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Invalid invite link"))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);
    if (password.length < 8) { setSubmitErr("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setSubmitErr("Passwords do not match"); return; }

    setSubmitting(true);
    try {
      const res = await api.post<{ data: { accessToken: string; user: { role?: string } } }>(
        "/api/auth/redeem-invite",
        { token, password },
      );
      setToken(res.data.accessToken);
      setUser(res.data.user);
      // Send the new user to their proper home — buyers to marketplace, partners to /partner, etc.
      const role = res.data.user?.role;
      const next =
        role === "ADMIN"             ? "/admin"      :
        role === "VIEWER"            ? "/admin"      :
        role === "VERIFIER"          ? "/verifier"   :
        role === "COMMUNITY_PARTNER" ? "/partner"    :
        role === "BUYER"             ? "/marketplace":
                                       "/dashboard";
      router.push(next);
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Could not set password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-lg text-gray-900">
            <Image src="/logo.png" alt="kabon.africa" width={32} height={32} className="rounded-lg" />
            Kabon.Africa
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {loading ? (
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 text-center">
              <Loader2 className="w-6 h-6 text-forest-600 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Checking invite…</p>
            </div>
          ) : loadErr || !meta ? (
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2">Invite link invalid</h1>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">{loadErr ?? "We couldn't find this invite. Ask the team to resend."}</p>
              <Link href="/request-access" className="btn-secondary w-full">Request a new invite</Link>
            </div>
          ) : meta.expired ? (
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2">Invite has expired</h1>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                For security, invites are valid for 7 days. Reply to your invite email and we'll send a fresh link.
              </p>
              <Link href={`mailto:kabon@kabon.africa?subject=Resend my invite&body=Email%3A%20${encodeURIComponent(meta.email)}`}
                className="btn-secondary w-full">Email the team</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
              <div className="w-12 h-12 bg-forest-100 rounded-2xl flex items-center justify-center mb-5">
                <CheckCircle className="w-6 h-6 text-forest-600" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome, {meta.name.split(" ")[0]}</h1>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Set a password to finish activating your buyer account at <strong className="text-gray-700">{meta.email}</strong>.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="label">New password</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="label">Confirm password</label>
                  <input
                    type="password"
                    className="input"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    minLength={8}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {submitErr && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                  {submitErr}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? "Setting up…" : "Activate account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
