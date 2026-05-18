"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, Wallet } from "lucide-react";
import { loginWithEmail, loginWithWallet } from "@/lib/auth";
import { connectWallet, signMessage } from "@/lib/web3";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginWithEmail(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWallet = async () => {
    setLoading(true);
    setError("");
    try {
      const { address, signer } = await connectWallet();
      await loginWithWallet(address, (msg) => signMessage(signer, msg));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet login failed");
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
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleEmail} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative text-center text-sm text-gray-400"><span className="bg-white px-2">or</span></div>
          </div>

          <button onClick={handleWallet} className="btn-secondary w-full flex items-center justify-center gap-2" disabled={loading}>
            <Wallet className="w-4 h-4" />
            Connect Wallet (MetaMask)
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{" "}
          <Link href="/register" className="text-forest-700 font-medium hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}
