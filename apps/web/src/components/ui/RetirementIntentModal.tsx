"use client";
import { useState } from "react";
import { X, Leaf, Zap, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

const RETIREMENT_REASONS = [
  { value: "ANNUAL_REPORT",   label: "Annual sustainability report" },
  { value: "EVENT_OFFSET",    label: "Event offset (flight, conference, launch…)" },
  { value: "PRODUCT_NEUTRAL", label: "Product carbon-neutral claim" },
  { value: "PERSONAL",        label: "Personal / individual offset" },
  { value: "CORPORATE_ESG",   label: "Corporate ESG commitment" },
  { value: "OTHER",           label: "Other" },
];

export interface RetirementIntentModalProps {
  purchaseId: string;
  projectTitle: string;
  tonnes: number;
  purchasedAt: string;
  isEnergy?: boolean;
  onClose: () => void;
  onRetired: (reason: string, note: string, retiredAt: string) => void;
}

export default function RetirementIntentModal({
  purchaseId, projectTitle, tonnes, purchasedAt, isEnergy = false, onClose, onRetired,
}: RetirementIntentModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [reason,    setReason]    = useState("ANNUAL_REPORT");
  const [note,      setNote]      = useState("");
  const [retiredAt, setRetiredAt] = useState(today);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const accentBg  = isEnergy ? "bg-amber-600" : "bg-forest-700";
  const accentBtn = isEnergy ? "bg-amber-500 hover:bg-amber-600 text-white" : "btn-primary";

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post(`/api/marketplace/purchases/${purchaseId}/retire`, { reason, note, retiredAt });
      onRetired(reason, note, retiredAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to retire credits");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full pointer-events-auto overflow-hidden">

          {/* Header */}
          <div className={`${accentBg} px-6 pt-6 pb-5 text-white`}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {isEnergy ? <Zap className="w-5 h-5 text-white" /> : <Leaf className="w-5 h-5 text-white" />}
              </div>
              <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-lg font-black mb-0.5">Retire Carbon Credits</h2>
            <p className="text-white/70 text-sm">Document what you're offsetting to make your certificate meaningful.</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* What's being retired */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <div className="font-semibold text-gray-900">{projectTitle}</div>
              <div className="text-gray-500 mt-0.5">
                {tonnes.toLocaleString()} tonne{tonnes !== 1 ? "s" : ""} CO₂e ·
                purchased {new Date(purchasedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="label">What are you offsetting?</label>
              <select
                className="input"
                value={reason}
                onChange={e => setReason(e.target.value)}
              >
                {RETIREMENT_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Retirement date */}
            <div>
              <label className="label">
                Retirement date
                <span className="text-gray-400 font-normal ml-1">(can be backdated for reporting periods)</span>
              </label>
              <input
                type="date"
                className="input"
                value={retiredAt}
                max={today}
                onChange={e => setRetiredAt(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                e.g. Dec 31 of last year for an annual report
              </p>
            </div>

            {/* Note */}
            <div>
              <label className="label">
                Note / beneficiary
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                className="input"
                placeholder="e.g. Acme Corp 2025 Annual Report, Nairobi Tech Conference…"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={300}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-50 ${accentBtn}`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {loading ? "Retiring…" : "Confirm Retirement"}
            </button>
            <button onClick={onClose} className="btn-secondary py-3 px-5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
