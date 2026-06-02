"use client";
import { useEffect } from "react";
import { X, ExternalLink, Printer, BadgeCheck, TreePine, Shield } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const CHAIN_ID = process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID;
const POLY_EXPLORER = CHAIN_ID === "137"
  ? "https://polygonscan.com/tx/"
  : "https://amoy.polygonscan.com/tx/";
const BG_PHOTO = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=60&auto=format&fit=crop";

function handlePrint() {
  const el = document.getElementById("issuance-certificate");
  if (!el) { window.print(); return; }
  const clone = el.cloneNode(true) as HTMLElement;
  clone.id = "cert-print-copy";
  document.body.appendChild(clone);
  document.body.classList.add("cert-printing");
  window.addEventListener("afterprint", () => {
    clone.remove();
    document.body.classList.remove("cert-printing");
  }, { once: true });
  window.print();
}

interface Props {
  projectId?: string;
  ownerName: string;
  projectTitle: string;
  country: string;
  hectares: number;
  creditAmount: number;
  verifiedTons?: number | null;
  mintTxHash?: string | null;
  tokenId?: string | null;
  issuedAt: string;
  vintageYear?: number | null;
  onClose: () => void;
}

function serialNo(id: string) {
  const year = new Date().getFullYear();
  return `CA-ISS-${year}-${id.replace(/-/g, "").slice(-8).toUpperCase()}`;
}

function Corner({ rotate = 0 }: { rotate?: number }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
      style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <path d="M3 3 H13 M3 3 V13" stroke="#a16207" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 6 H10 M6 6 V10" stroke="#a16207" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export default function IssuanceCertificate({
  projectId, ownerName, projectTitle, country, hectares, creditAmount,
  verifiedTons, mintTxHash, tokenId, issuedAt, vintageYear, onClose,
}: Props) {
  const date = new Date(issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const serial = serialNo(projectId ?? tokenId ?? Date.now().toString());
  const isOnChain = !!mintTxHash && !mintTxHash.startsWith("0xsim_");
  const verifyUrl = isOnChain
    ? `${POLY_EXPLORER}${mintTxHash}`
    : projectId
      ? `https://kabon.africa/projects/${projectId}`
      : "https://kabon.africa";

  // Esc-to-close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 print:hidden" onClick={onClose} />

      {/* Scrollable centering layer */}
      <div className="fixed inset-0 z-50 overflow-y-auto py-6">
        <div className="flex min-h-full items-center justify-center px-4">

          {/* Certificate card */}
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xl relative overflow-hidden pointer-events-auto"
            id="issuance-certificate"
          >
            {/* === Background photo watermark === */}
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none"
              style={{
                backgroundImage: `url('${BG_PHOTO}')`,
                opacity: 0.045,
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              } as React.CSSProperties}
            />

            {/* === "CERTIFIED" diagonal SVG watermark === */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
              <text
                x="50%" y="52%"
                textAnchor="middle" dominantBaseline="middle"
                fontSize="70" fontWeight="900" fill="#a16207"
                opacity="0.03" letterSpacing="8"
                transform="rotate(-30 300 300)"
              >
                CERTIFIED
              </text>
            </svg>

            {/* === Decorative borders === */}
            <div className="absolute inset-2.5 border-2 border-amber-200/50 rounded-2xl pointer-events-none" />
            <div className="absolute inset-4 border border-amber-100/40 rounded-xl pointer-events-none" />

            {/* === Corner ornaments === */}
            <div className="absolute top-4 left-4 pointer-events-none"><Corner rotate={0} /></div>
            <div className="absolute top-4 right-4 pointer-events-none"><Corner rotate={90} /></div>
            <div className="absolute bottom-4 left-4 pointer-events-none"><Corner rotate={270} /></div>
            <div className="absolute bottom-4 right-4 pointer-events-none"><Corner rotate={180} /></div>

            {/* === Header bar === */}
            <div
              className="relative bg-amber-700 rounded-t-3xl px-8 pt-7 pb-5 text-white text-center"
              style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}
            >
              <div className="absolute inset-0 opacity-10 rounded-t-3xl"
                style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)" }} />

              <Shield className="absolute top-4 right-5 w-4 h-4 text-amber-300 opacity-70" aria-hidden />

              <div className="relative flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center">
                  <TreePine className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="relative text-xs font-black uppercase tracking-[0.2em] text-amber-100 mb-0.5">
                Carbon Credit Issuance Certificate
              </div>
              <div className="relative text-[10px] text-amber-300 tracking-wider">
                Kabon.Africa · Verified African Carbon Registry
              </div>
            </div>

            {/* === Body === */}
            <div className="relative px-8 py-6 text-center">

              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">This certifies that</p>
              <h2 className="text-2xl font-black text-gray-900 mb-0.5">{ownerName}</h2>
              <p className="text-sm text-gray-500 mb-5">has registered a verified carbon project generating</p>

              {/* Credits box */}
              <div
                className="bg-amber-50 border-2 border-amber-200 rounded-2xl py-5 px-6 mb-5"
                style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}
              >
                <div className="text-5xl font-black text-amber-700 mb-1 tabular-nums">
                  {creditAmount.toLocaleString()}
                </div>
                <div className="text-sm font-semibold text-amber-600">tonnes CO₂ credits issued</div>
                {verifiedTons && verifiedTons !== creditAmount && (
                  <div className="text-xs text-gray-400 mt-1">{verifiedTons.toLocaleString()} t independently verified</div>
                )}
                {vintageYear && (
                  <span className="inline-block mt-2 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                    {vintageYear} Vintage
                  </span>
                )}
              </div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">from the project</p>
              <p className="font-black text-gray-900 text-base mb-0.5">{projectTitle}</p>
              <p className="text-sm text-gray-500 mb-0.5">
                {country} · {hectares.toLocaleString()} ha
              </p>
              <p className="text-xs text-gray-400 mb-5">Issued: {date}</p>

              {/* === Footer: QR + details === */}
              <div className="border-t-2 border-dashed border-gray-100 pt-5 grid grid-cols-[96px_1fr] gap-5 items-center text-left">

                {/* QR code */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-2 border-2 border-amber-100 rounded-xl bg-white">
                    <QRCodeSVG
                      value={verifyUrl}
                      size={72}
                      fgColor="#b45309"
                      bgColor="#ffffff"
                      level="M"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 text-center leading-tight">
                    Scan to<br />verify
                  </p>
                </div>

                {/* Right column */}
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Certificate No.</div>
                    <div className="font-mono font-bold text-gray-800 text-xs">{serial}</div>
                  </div>

                  {(isOnChain || tokenId) && (
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">On-Chain Proof</div>
                      {isOnChain && mintTxHash && (
                        <a
                          href={`${POLY_EXPLORER}${mintTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-amber-700 hover:underline flex items-center gap-1"
                        >
                          {mintTxHash.slice(0, 8)}…{mintTxHash.slice(-6)}
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        </a>
                      )}
                      {tokenId && (
                        <div className="text-gray-600 font-mono">Token #{tokenId}</div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <BadgeCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="text-gray-500 text-[10px]">Polygon Network · Kabon.Africa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* === Actions (screen only) === */}
            <div className="relative px-8 pb-8 flex gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-1 btn-secondary py-2.5 px-4 text-sm"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
