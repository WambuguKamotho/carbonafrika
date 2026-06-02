"use client";
import { useRef, useState } from "react";
import { Upload, CheckCircle, Loader2, X, FileText } from "lucide-react";

interface Props {
  value: string;
  onChange: (hash: string) => void;
  accept?: string;
  label?: string;
  accentColor?: "forest" | "amber";
}

const ACCEPTED = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip";

export default function IpfsUpload({ value, onChange, accept = ACCEPTED, label = "Supporting Document", accentColor = "forest" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const accent = accentColor === "amber"
    ? { btn: "bg-amber-600 hover:bg-amber-700 text-white", ring: "border-amber-300 bg-amber-50", text: "text-amber-700" }
    : { btn: "bg-forest-600 hover:bg-forest-700 text-white", ring: "border-forest-300 bg-forest-50", text: "text-forest-700" };

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ipfs/upload", { method: "POST", body: form });
      const json = await res.json() as { hash?: string; error?: string };
      if (!res.ok || !json.hash) throw new Error(json.error ?? "Upload failed");
      onChange(json.hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const cid = value.startsWith("ipfs://") ? value.slice(7) : value;
  const gatewayUrl = cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : null;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      {value ? (
        <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${accent.ring}`}>
          <CheckCircle className={`w-5 h-5 flex-shrink-0 ${accent.text}`} />
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-semibold ${accent.text}`}>Uploaded to IPFS</div>
            {gatewayUrl ? (
              <a href={gatewayUrl} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-gray-500 hover:underline truncate block">
                {value.length > 40 ? `${value.slice(0, 20)}…${value.slice(-12)}` : value}
              </a>
            ) : (
              <span className="font-mono text-xs text-gray-500 truncate block">{value}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium">Replace</button>
            <button type="button" onClick={() => onChange("")}
              className="text-gray-300 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-4 px-4 text-sm font-medium transition-all disabled:opacity-60 ${
            uploading
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading to IPFS…</>
            : <><FileText className="w-4 h-4" />{label} — click to upload (PDF, image, zip · max 50 MB)</>
          }
        </button>
      )}

      {/* Manual hash input fallback */}
      <div>
        <input
          className="input text-sm font-mono"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="or paste existing ipfs://Qm… hash"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <Upload className="w-4 h-4" /> {error}
        </div>
      )}
    </div>
  );
}
