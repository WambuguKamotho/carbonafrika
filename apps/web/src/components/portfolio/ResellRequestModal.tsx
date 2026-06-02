"use client";
import { useState, useEffect } from "react";
import { X, Tag, Loader2, Info } from "lucide-react";
import { getToken } from "@/lib/auth";

// Buyer-initiated resale request. Buyers can't self-list; this files a request
// that an admin reviews and (on approval) relists with the buyer as seller.
export default function ResellRequestModal({
  purchaseId,
  projectTitle,
  tonnes,
  originalPricePerTon,
  currency = "USDC",
  onClose,
  onRequested,
}: {
  purchaseId: string;
  projectTitle: string;
  tonnes: number;
  originalPricePerTon?: number | null;
  currency?: string;
  onClose: () => void;
  onRequested: () => void;
}) {
  const [price, setPrice] = useState(originalPricePerTon ? String(originalPricePerTon) : "");
  const [note, setNote]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const priceNum = parseFloat(price);
  const valid = priceNum > 0;
  const gross = valid ? priceNum * tonnes : 0;

  async function submit() {
    if (!valid) { setError("Enter a price per tonne greater than 0."); return; }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/marketplace/purchases/${purchaseId}/resell-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerTon: priceNum, note: note.trim() || undefined }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || (typeof d.error === "string" ? d.error : "Request failed"));
      onRequested();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-savanna-100 text-savanna-700 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <h2 className="font-black text-gray-900">Request to resell</h2>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{projectTitle}</span> · {tonnes} t
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-2.5 text-xs text-blue-800 leading-relaxed">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Kabon reviews every resale to keep prices fair and the registry consistent.
                Once approved, your credits are relisted on the marketplace with you as the
                seller — you're paid in {currency} when they sell. You can't retire credits
                while a resale request is open.
              </span>
            </div>

            <div>
              <label className="label">Asking price per tonne ({currency})</label>
              <input
                type="number" min="0" step="0.01" className="input"
                placeholder="e.g. 14.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
              {valid && (
                <p className="text-xs text-gray-500 mt-1">
                  Gross if fully sold: <span className="font-semibold text-gray-700">${gross.toFixed(2)} {currency}</span>
                  <span className="text-gray-400"> (before platform fee)</span>
                </p>
              )}
            </div>

            <div>
              <label className="label">Note to admin <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                rows={2} className="input text-sm resize-none"
                placeholder="Anything the reviewer should know…"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 btn-secondary py-2.5 text-sm">Cancel</button>
              <button onClick={submit} disabled={saving || !valid}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                Submit request
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
