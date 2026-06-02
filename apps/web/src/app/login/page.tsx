"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, Wallet, ArrowRight, Eye, EyeOff } from "lucide-react";
import { loginWithEmail, loginWithWallet } from "@/lib/auth";
import { connectWallet, signMessage } from "@/lib/web3";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState("");

  // Post-login landing per role. Keep in sync with /dashboard's role redirect
  // and /redeem-invite's role redirect so all three entry points behave the same.
  const redirectAfterLogin = (user: { role?: string }) => {
    const next =
      user?.role === "ADMIN"             ? "/admin"     :
      user?.role === "VIEWER"            ? "/admin"     :  // viewer uses the admin UI in read-only mode
      user?.role === "VERIFIER"          ? "/verifier"  :
      user?.role === "BUYER"             ? "/portfolio" :
      user?.role === "COMMUNITY_PARTNER" ? "/partner"   :
                                            "/dashboard";  // LANDOWNER default
    router.push(next);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { user } = await loginWithEmail(email, password);
      redirectAfterLogin(user as { role?: string });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  };

  const handleWallet = async () => {
    setWalletLoading(true); setError("");
    try {
      const { address, signer } = await connectWallet();
      const { user } = await loginWithWallet(address, (msg) => signMessage(signer, msg));
      redirectAfterLogin(user as { role?: string });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet login failed");
    } finally { setWalletLoading(false); }
  };

  return (
    <div className="min-h-[100vh] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-forest-950 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&auto=format&fit=crop"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-950/85 via-forest-900/70 to-forest-950/90" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 30% 40%, rgb(22 101 52 / 0.5) 0%, transparent 60%)" }} />
        <div className="relative text-center">
          <div className="w-16 h-16 bg-forest-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-forest-900">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Kabon.Africa</h2>
          <p className="text-forest-300 text-lg max-w-xs leading-relaxed">
            Every login is a step toward a greener, wealthier Africa.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { v: "$12–25", l: "Per tonne earned" },
              { v: "54", l: "Countries served" },
              { v: "100%", l: "On-chain proof" },
              { v: "0%", l: "Upfront cost" },
            ].map(s => (
              <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl font-black text-forest-300">{s.v}</div>
                <div className="text-xs text-gray-400 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-gray-50">
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
            <h1 className="text-3xl font-black text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-1">Sign in to your account to continue</p>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEmail} className="space-y-5 mb-6">
              <div>
                <label className="label">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input" placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Password</label>
                  <Link href="/forgot-password" className="text-xs text-forest-600 hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10" placeholder="••••••••" required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">Sign in <ArrowRight className="w-4 h-4" /></span>
                )}
              </button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or continue with</span></div>
            </div>

            <button onClick={handleWallet}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-all duration-150 shadow-sm"
              disabled={walletLoading}>
              {walletLoading ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <Wallet className="w-5 h-5 text-orange-500" />
              )}
              {walletLoading ? "Connecting wallet..." : "MetaMask / Web3 Wallet"}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account yet?{" "}
            <Link href="/register" className="text-forest-700 font-semibold hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
