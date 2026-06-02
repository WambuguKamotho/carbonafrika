"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setUser, getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import { connectWallet, signMessage } from "@/lib/web3";
import {
  User, Shield, CheckCircle, Wallet, Globe, Phone, FileText, Save, Loader2,
  Landmark, Camera, KeyRound, ShieldCheck, ArrowRight, AlertCircle, Lock,
} from "lucide-react";

interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
  country: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  kycVerified: boolean;
  kycRequestedAt: string | null;
  kycSubmissionNote: string | null;
  createdAt: string;

  bankAccountName:   string | null;
  bankName:          string | null;
  bankAccountNumber: string | null;
  bankIban:          string | null;
  bankSwiftBic:      string | null;
  bankCountry:       string | null;
}

const EMPTY_BANK = {
  bankAccountName: "", bankName: "", bankAccountNumber: "",
  bankIban: "", bankSwiftBic: "", bankCountry: "",
};

const ROLE_LABEL: Record<string, string> = {
  LANDOWNER:         "Project Owner",
  BUYER:             "Buyer",
  VERIFIER:          "Verifier",
  ADMIN:             "Administrator",
  COMMUNITY_PARTNER: "Community Partner",
  VIEWER:            "Viewer",
};
const ROLE_COLOR: Record<string, string> = {
  LANDOWNER:         "bg-forest-100 text-forest-700",
  BUYER:             "bg-blue-100 text-blue-700",
  VERIFIER:          "bg-amber-100 text-amber-700",
  ADMIN:             "bg-purple-100 text-purple-700",
  COMMUNITY_PARTNER: "bg-emerald-100 text-emerald-700",
  VIEWER:            "bg-gray-200 text-gray-700",
};

function ipfsToHttp(uri: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  return uri;
}

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe]         = useState<Me | null>(null);
  const [form, setForm]     = useState({ name: "", bio: "", phone: "", country: "" });
  const [bank, setBank]     = useState(EMPTY_BANK);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Section-specific saving flags
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBank,    setSavingBank]    = useState(false);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Wallet binding
  const [walletPending, setWalletPending] = useState(false);

  // KYC submission
  const [kycNote, setKycNote] = useState("");
  const [kycPending, setKycPending] = useState(false);

  // Password change
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdPending, setPwdPending] = useState(false);

  function notify(kind: "ok" | "err", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    if (!getToken()) { router.replace("/login?next=/settings"); return; }
    api.get<{ data: Me }>("/api/auth/me")
      .then((res) => {
        const d = res.data;
        setMe(d);
        setForm({ name: d.name ?? "", bio: d.bio ?? "", phone: d.phone ?? "", country: d.country ?? "" });
        setBank({
          bankAccountName:   d.bankAccountName   ?? "",
          bankName:          d.bankName          ?? "",
          bankAccountNumber: d.bankAccountNumber ?? "",
          bankIban:          d.bankIban          ?? "",
          bankSwiftBic:      d.bankSwiftBic      ?? "",
          bankCountry:       d.bankCountry       ?? "",
        });
      })
      .catch(() => router.replace("/login?next=/settings"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const res = await api.patch<{ data: Me }>("/api/auth/me", {
        name:    form.name.trim()    || undefined,
        bio:     form.bio.trim()     || undefined,
        phone:   form.phone.trim()   || undefined,
        country: form.country.trim() || undefined,
      });
      setMe(res.data);
      setUser(res.data);
      notify("ok", "Profile saved");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveBank() {
    setSavingBank(true);
    try {
      const res = await api.patch<{ data: Me }>("/api/auth/me", {
        bankAccountName:   bank.bankAccountName.trim()   || undefined,
        bankName:          bank.bankName.trim()          || undefined,
        bankAccountNumber: bank.bankAccountNumber.trim() || undefined,
        bankIban:          bank.bankIban.trim()          || undefined,
        bankSwiftBic:      bank.bankSwiftBic.trim()      || undefined,
        bankCountry:       bank.bankCountry.trim()       || undefined,
      });
      setMe(res.data);
      notify("ok", "Bank details saved");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingBank(false);
    }
  }

  async function handleAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) {
      notify("err", "Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("err", "Image must be smaller than 5 MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch("/api/ipfs/upload", { method: "POST", body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok) throw new Error(upJson.error || "Upload failed");
      const httpUrl = ipfsToHttp(upJson.hash);
      if (!httpUrl) throw new Error("Upload returned no URL");

      const saved = await api.patch<{ data: Me }>("/api/auth/me", { avatarUrl: httpUrl });
      setMe(saved.data);
      setUser(saved.data);
      notify("ok", "Avatar updated");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleConnectWallet() {
    setWalletPending(true);
    try {
      const { address, signer } = await connectWallet();
      // Step 1: get a nonce bound to OUR session (not log-in-with-wallet)
      const nonceRes = await api.post<{ data: { message: string } }>(
        "/api/auth/me/wallet/nonce",
        { address },
      );
      // Step 2: sign and bind
      const signature = await signMessage(signer, nonceRes.data.message);
      const bindRes = await api.post<{ data: Me }>(
        "/api/auth/me/wallet/verify",
        { address, signature },
      );
      setMe(bindRes.data);
      setUser(bindRes.data);
      notify("ok", "Wallet linked to your account");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet connect failed";
      notify("err", msg.includes("user rejected") ? "Wallet signing cancelled" : msg);
    } finally {
      setWalletPending(false);
    }
  }

  async function handleKycRequest() {
    setKycPending(true);
    try {
      const res = await api.post<{ data: Me }>("/api/auth/me/kyc/request", {
        note: kycNote.trim() || undefined,
      });
      setMe(res.data);
      setKycNote("");
      notify("ok", "KYC submitted for review");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Submission failed");
    } finally {
      setKycPending(false);
    }
  }

  async function handleChangePassword() {
    if (pwd.next.length < 8) { notify("err", "New password must be at least 8 characters"); return; }
    if (pwd.next !== pwd.confirm) { notify("err", "Passwords do not match"); return; }
    setPwdPending(true);
    try {
      await api.post<{ message: string }>("/api/auth/me/change-password", {
        currentPassword: pwd.current,
        newPassword:     pwd.next,
      });
      setPwd({ current: "", next: "", confirm: "" });
      notify("ok", "Password updated");
    } catch (e) {
      notify("err", e instanceof Error ? e.message : "Change failed");
    } finally {
      setPwdPending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-forest-600 animate-spin" />
      </div>
    );
  }

  const isLandowner = me?.role === "LANDOWNER";
  const isBuyer     = me?.role === "BUYER";
  const avatarSrc   = ipfsToHttp(me?.avatarUrl ?? null);
  const kycState =
    me?.kycVerified         ? "verified"  :
    me?.kycRequestedAt      ? "requested" :
                              "none";

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      {toast && (
        <div className={`fixed top-20 right-4 z-50 text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-sm flex items-center gap-2 ${
          toast.kind === "ok" ? "bg-forest-700 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.kind === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your profile and account information.</p>
        </div>

        {/* Landowner quick-link to projects */}
        {isLandowner && (
          <Link
            href="/dashboard"
            className="flex items-center justify-between bg-forest-700 hover:bg-forest-800 text-white rounded-2xl px-5 py-4 mb-6 shadow-card transition-colors"
          >
            <div>
              <div className="font-bold text-sm">Your projects</div>
              <div className="text-xs text-forest-100">View status, comments and verifications</div>
            </div>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}

        {/* Profile section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-50">
            <User className="w-4 h-4 text-forest-600" />
            <h2 className="font-bold text-gray-900">Profile</h2>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-forest-100 text-forest-700 font-black text-2xl flex items-center justify-center overflow-hidden border-2 border-white shadow-card">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (me?.name?.[0] ?? "?").toUpperCase()
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Upload avatar"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-forest-700 hover:bg-forest-800 text-white rounded-full flex items-center justify-center shadow disabled:opacity-50"
              >
                {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div>
              <div className="font-bold text-gray-900">{me?.name}</div>
              <div className="text-xs text-gray-400">Click the camera to update your photo. Max 5 MB.</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Bio
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell buyers and verifiers about yourself, your land, or your organisation…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+254 712 345 678"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Country
                </label>
                <input
                  className="input"
                  value={form.country}
                  onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
                  placeholder="Kenya"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-50">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingProfile ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Identity verification (KYC) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-2 pb-2">
            <ShieldCheck className="w-4 h-4 text-forest-600" />
            <h2 className="font-bold text-gray-900">Identity Verification</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5 pb-4 border-b border-gray-50 leading-relaxed">
            {isBuyer
              ? "Required before you can purchase carbon credits. Submit once and our team will reach out for documents."
              : "Required before your projects can list credits for sale. Submit once and our team will reach out for documents."}
          </p>

          {kycState === "verified" && (
            <div className="bg-forest-50 border border-forest-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-forest-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-forest-900">Verified</div>
                <div className="text-xs text-forest-700">Your identity has been confirmed.</div>
              </div>
            </div>
          )}

          {kycState === "requested" && me?.kycRequestedAt && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <Loader2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-amber-900">Submitted for review</div>
                <div className="text-xs text-amber-700">
                  Sent {new Date(me.kycRequestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
                  We'll reach out by email if we need anything.
                </div>
              </div>
            </div>
          )}

          {kycState === "none" && (
            <div className="space-y-3">
              <textarea
                rows={3}
                className="input resize-none text-sm"
                placeholder="Optional: anything you'd like to tell our review team (company name, role, links to verifiable info)…"
                value={kycNote}
                onChange={e => setKycNote(e.target.value)}
              />
              <button
                onClick={handleKycRequest}
                disabled={kycPending}
                className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
              >
                {kycPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {kycPending ? "Submitting…" : "Submit for verification"}
              </button>
            </div>
          )}
        </div>

        {/* Wallet section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-2 pb-2">
            <Wallet className="w-4 h-4 text-forest-600" />
            <h2 className="font-bold text-gray-900">Crypto Wallet</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5 pb-4 border-b border-gray-50 leading-relaxed">
            {isLandowner
              ? "USDC payouts from buyers settle to this wallet on Polygon."
              : isBuyer
                ? "Required to purchase carbon credits — you'll sign a USDC approval from this wallet."
                : "Optional. Used if you need to sign on-chain actions."}
          </p>

          {me?.walletAddress ? (
            <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="w-4 h-4 text-forest-600 flex-shrink-0" />
                <span className="font-mono text-xs text-gray-800 truncate">{me.walletAddress}</span>
              </div>
              <button
                onClick={handleConnectWallet}
                disabled={walletPending}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50"
                title="Replace with a different wallet"
              >
                {walletPending ? "Signing…" : "Change"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={walletPending}
              className="w-full flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {walletPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {walletPending ? "Waiting for signature…" : "Connect wallet"}
            </button>
          )}
        </div>

        {/* Bank payout details — LANDOWNER only */}
        {isLandowner && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-2 pb-2">
              <Landmark className="w-4 h-4 text-forest-600" />
              <h2 className="font-bold text-gray-900">Bank Payout Details</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5 pb-4 border-b border-gray-50 leading-relaxed">
              For the upcoming fiat phase: Kabon.Africa will collect buyer payments and disburse to your bank account.
              Fill this in now so payouts are ready when fiat goes live. (Crypto USDC payouts continue to use your wallet.)
            </p>

            <div className="space-y-4">
              <div>
                <label className="label">Account holder name</label>
                <input
                  className="input"
                  value={bank.bankAccountName}
                  onChange={(e) => setBank(b => ({ ...b, bankAccountName: e.target.value }))}
                  placeholder="As shown on your bank statement"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Bank name</label>
                  <input
                    className="input"
                    value={bank.bankName}
                    onChange={(e) => setBank(b => ({ ...b, bankName: e.target.value }))}
                    placeholder="e.g. KCB, Equity, NCBA"
                  />
                </div>
                <div>
                  <label className="label">Bank country</label>
                  <input
                    className="input"
                    value={bank.bankCountry}
                    onChange={(e) => setBank(b => ({ ...b, bankCountry: e.target.value }))}
                    placeholder="Kenya"
                  />
                </div>
              </div>

              <div>
                <label className="label">Account number</label>
                <input
                  className="input font-mono"
                  value={bank.bankAccountNumber}
                  onChange={(e) => setBank(b => ({ ...b, bankAccountNumber: e.target.value }))}
                  placeholder="Local account number"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    IBAN <span className="text-gray-400 font-normal">(if applicable)</span>
                  </label>
                  <input
                    className="input font-mono"
                    value={bank.bankIban}
                    onChange={(e) => setBank(b => ({ ...b, bankIban: e.target.value }))}
                    placeholder="KE00 0000 0000 0000 0000 00"
                  />
                </div>
                <div>
                  <label className="label">
                    SWIFT / BIC <span className="text-gray-400 font-normal">(for international)</span>
                  </label>
                  <input
                    className="input font-mono"
                    value={bank.bankSwiftBic}
                    onChange={(e) => setBank(b => ({ ...b, bankSwiftBic: e.target.value }))}
                    placeholder="KCBLKENX"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-50">
              <button
                onClick={handleSaveBank}
                disabled={savingBank}
                className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
              >
                {savingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingBank ? "Saving…" : "Save Bank Details"}
              </button>
            </div>
          </div>
        )}

        {/* Security: password change */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-2 pb-2">
            <Lock className="w-4 h-4 text-forest-600" />
            <h2 className="font-bold text-gray-900">Change Password</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5 pb-4 border-b border-gray-50 leading-relaxed">
            Enter your current password to set a new one. Minimum 8 characters.
          </p>

          <div className="space-y-4">
            <div>
              <label className="label">Current password</label>
              <input
                type="password"
                className="input"
                value={pwd.current}
                onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
                autoComplete="current-password"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">New password</label>
                <input
                  type="password"
                  className="input"
                  value={pwd.next}
                  onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input
                  type="password"
                  className="input"
                  value={pwd.confirm}
                  onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-50">
            <button
              onClick={handleChangePassword}
              disabled={pwdPending || !pwd.current || !pwd.next}
              className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5"
            >
              {pwdPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {pwdPending ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>

        {/* Account info (read-only) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-50">
            <Shield className="w-4 h-4 text-forest-600" />
            <h2 className="font-bold text-gray-900">Account</h2>
          </div>

          <dl className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{me?.email ?? "—"}</dd>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <dt className="text-gray-500">Role</dt>
              <dd>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLOR[me?.role ?? "LANDOWNER"]}`}>
                  {ROLE_LABEL[me?.role ?? "LANDOWNER"]}
                </span>
              </dd>
            </div>

            <div className="flex justify-between items-center py-2">
              <dt className="text-gray-500">Member since</dt>
              <dd className="font-medium text-gray-900">
                {me?.createdAt ? new Date(me.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
