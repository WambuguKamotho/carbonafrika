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
          background: "#052e16",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Background gradient blobs */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, #15803d44 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            right: -80,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, #16a34a33 0%, transparent 70%)",
          }}
        />

        {/* Content */}
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
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              🌿
            </div>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
              Kabon.Africa
            </span>
          </div>

          {/* Main headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.05,
                letterSpacing: "-2px",
              }}
            >
              Restore Africa.
              <br />
              <span style={{ color: "#4ade80" }}>Earn Carbon Credits.</span>
            </div>
            <div style={{ fontSize: 26, color: "#86efac", fontWeight: 400, maxWidth: 700, lineHeight: 1.4 }}>
              Connect African land stewards with global carbon credit buyers. Verified. On-chain. Direct.
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 40 }}>
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
