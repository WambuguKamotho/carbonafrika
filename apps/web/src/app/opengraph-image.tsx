import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kabon.Africa — Restore Africa, Earn Carbon Credits";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #052e16 0%, #14532d 60%, #052e16 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 80px",
            height: "100%",
          }}
        >
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#00C853", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {/* Trunk */}
              <div style={{ position: "absolute", bottom: 5, left: 24, width: 5, height: 18, background: "#7B4F2E", borderRadius: 2, display: "flex" }} />
              {/* Left branch */}
              <div style={{ position: "absolute", bottom: 18, left: 8, width: 16, height: 4, background: "#7B4F2E", borderRadius: 2, transform: "rotate(-28deg)", display: "flex" }} />
              {/* Right branch */}
              <div style={{ position: "absolute", bottom: 18, right: 6, width: 15, height: 4, background: "#7B4F2E", borderRadius: 2, transform: "rotate(28deg)", display: "flex" }} />
              {/* Left canopy */}
              <div style={{ position: "absolute", top: 8, left: 2, width: 20, height: 16, background: "#166534", borderRadius: "50%", display: "flex" }} />
              {/* Right canopy */}
              <div style={{ position: "absolute", top: 8, right: 2, width: 18, height: 14, background: "#166534", borderRadius: "50%", display: "flex" }} />
              {/* Centre canopy */}
              <div style={{ position: "absolute", top: 4, left: 11, width: 24, height: 18, background: "#15803d", borderRadius: "50%", display: "flex" }} />
            </div>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              kabon.africa
            </span>
          </div>

          {/* Main headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1.05,
                  letterSpacing: "-2px",
                }}
              >
                Restore Africa.
              </span>
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: "#4ade80",
                  lineHeight: 1.05,
                  letterSpacing: "-2px",
                }}
              >
                Earn Carbon Credits.
              </span>
            </div>
            <div style={{ fontSize: 26, color: "#86efac", fontWeight: 400, maxWidth: 700, lineHeight: 1.4 }}>
              Connect African land stewards with global carbon credit buyers. Verified. On-chain. Direct.
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { v: "$12–25", l: "Per tonne earned" },
              { v: "54+", l: "African countries" },
              { v: "100%", l: "On-chain proof" },
              { v: "$0", l: "Upfront cost" },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  padding: "16px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 900, color: "#4ade80" }}>{s.v}</div>
                <div style={{ fontSize: 14, color: "#86efac" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
