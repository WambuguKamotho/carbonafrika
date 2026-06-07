"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Leaf, CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [state, setState] = useState<"loading" | "success" | "expired" | "invalid">("loading");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }

    api.get<{ data: { accessToken: string; refreshToken: string; user: { role: string; name: string; email: string } } }>(
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`
    )
      .then(res => {
        setToken(res.data.accessToken);
        setUser(res.data.user);
        setState("success");
        setTimeout(() => router.push("/dashboard"), 3000);
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : "";
        setState(msg.toLowerCase().includes("expir") ? "expired" : "invalid");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setResendLoading(true);
    try {
      await api.post("/api/auth/resend-verify", { email: resendEmail });
      setResendSent(true);
    } finally { setResendLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Leaf className="w-7 h-7 text-forest-600" />
        </div>

        {state === "loading" && (
          <>
            <Loader2 className="w-8 h-8 text-forest-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Verifying your email…</h1>
            <p className="text-sm text-gray-500">Just a moment.</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-forest-600 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Email verified!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your account is active. Taking you to your dashboard…
            </p>
            <Link href="/dashboard" className="btn-primary w-full flex items-center justify-center py-3">
              Go to dashboard
            </Link>
          </>
        )}

        {(state === "expired" || state === "invalid") && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">
              {state === "expired" ? "Link expired" : "Invalid link"}
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              {state === "expired"
                ? "Verification links expire after 24 hours. Enter your email below to get a fresh one."
                : "This link is invalid or has already been used. Enter your email to get a new one."}
            </p>

            {resendSent ? (
              <div className="bg-forest-50 border border-forest-200 text-forest-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2 justify-center">
                <Mail className="w-4 h-4" />
                New verification link sent — check your inbox.
              </div>
            ) : (
              <form onSubmit={resend} className="space-y-3 text-left">
                <div>
                  <label className="label">Your email address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {resendLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Mail className="w-4 h-4" />}
                  {resendLoading ? "Sending…" : "Resend verification email"}
                </button>
              </form>
            )}

            <p className="text-xs text-gray-400 mt-6">
              Already verified?{" "}
              <Link href="/login" className="text-forest-600 hover:underline">Sign in here</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-forest-600 animate-spin" />
      </div>
    }>
      <VerifyEmailInner />
    </Suspense>
  );
}
