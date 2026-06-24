"use client";
import { useState } from "react";
import { X, Tag, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface Props {
  credit: {
    id: string;
    amount: number;          // total tonnes available on the credit
    vintageYear?: number | null;
  };
  projectTitle: string;
  onClose: () => void;
  onListed: () => void;       // parent should refetch projects after success
}

// Sensible default suggestions for African voluntary-market pricing.
// Real market is $5–$25/t depending on co-benefits; we sit mid-range.
const PRICE_PRESETS = [8, 12, 18];

export default function ListCreditModal({ credit, projectTitle, onClose, onListed }: Props) {
  const [pricePerTon, setPricePerTon] = useState<string>("12");
  const [tonsToList, setTonsToList]   = useState<string>(String(Math.floor(credit.amount)));
  const currency = "USD";
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [done,        setDone]        = useState(false);

  const priceNum = parseFloat(pricePerTon);
  const tonsNum  = parseFloat(tonsToList);
  const total    = Number.isFinite(priceNum) && Number.isFinite(tonsNum) ? priceNum * tonsNum : 0;
  const platformFee = total * 0.02;
  const netToYou    = total - platformFee;

  const valid =
    Number.isFinite(priceNum) && priceNum > 0 &&
    Number.isFinite(tonsNum)  && tonsNum  > 0 && tonsNum <= credit.amount;

  async function submit() {
    if (!valid) { setError("Check the price and tonnes. Both must be positive and not exceed your available balance."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/marketplace", {
        creditId:    credit.id,
        pricePerTon: priceNum,
        totalTons:   tonsNum,
        currency,
      });
      setDone(true);
      // Brief celebratory pause so the user reads the success, then close.
      setTimeout(() => { onListed(); }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full pointer-events-auto overflow-hidden">

          {/* Header */}
          <div className="bg-forest-700 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="w-4 h-4 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="font-bold truncate">List on Marketplace</h2>
                <p className="text-xs text-forest-200 truncate">{projectTitle}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="text-forest-200 hover:text-white rounded-lg p-1.5 hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          {done ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-forest-600" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-1">Listing live</h3>
              <p className="text-sm text-gray-500">Buyers can find it on the marketplace now.</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Available credit summary */}
              <div className="bg-forest-50 border border-forest-100 rounded-xl px-4 py-3 text-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-forest-700">Available</div>
                <div className="text-2xl font-black text-forest-900 mt-0.5">
                  {credit.amount.toLocaleString()} <span className="text-sm font-normal text-forest-700">tonnes CO₂e</span>
                </div>
                {credit.vintageYear && (
                  <div className="text-xs text-forest-700 mt-0.5">Vintage {credit.vintageYear}</div>
                )}
              </div>

              {/* Tonnes to list */}
              <div>
                <label className="label">Tonnes to list</label>
                <input
                  type="number"
                  min={1}
                  max={credit.amount}
                  step="any"
                  className="input"
                  value={tonsToList}
                  onChange={e => setTonsToList(e.target.value)}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Min 1 t</span>
                  <button type="button"
                    onClick={() => setTonsToList(String(Math.floor(credit.amount)))}
                    className="text-forest-700 hover:underline">
                    List all {Math.floor(credit.amount)} t
                  </button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="label">Price per tonne (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input pl-7"
                    value={pricePerTon}
                    onChange={e => setPricePerTon(e.target.value)}
                  />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {PRICE_PRESETS.map(p => (
                    <button key={p} type="button" onClick={() => setPricePerTon(String(p))}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        parseFloat(pricePerTon) === p
                          ? "bg-forest-700 text-white border-forest-700"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}>
                      ${p}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  African voluntary-market prices typically range $5–$25/t depending on project type and co-benefits.
                </p>
              </div>

              {/* Pricing breakdown */}
              {valid && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm space-y-1.5">
                  <div className="flex justify-between text-gray-500">
                    <span>{tonsNum} × ${priceNum.toFixed(2)}</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Platform fee (2%)</span>
                    <span>− ${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>You receive if fully sold</span>
                    <span>${netToYou.toFixed(2)} {currency}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button onClick={submit} disabled={!valid || submitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                  {submitting ? "Listing…" : "Publish listing"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
